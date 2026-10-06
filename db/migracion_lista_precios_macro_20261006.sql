-- ============================================================================
-- Idea 7358 — Planilla de costos → Supabase por macro + aviso Telegram de cada
-- cambio en la hoja "Lista de Precios " al grupo LK Gerencia.
-- Pedido: Thomas (02/10). Encarado por Luis (06/10).
--
-- Regla 0 (GP2): esta función vive en el schema GP2 y SOLO escribe en GP2.
-- Llama a public.tg_enqueue, que es INFRAESTRUCTURA compartida del proyecto
-- (igual que public.http_get): encola en public.telegram_outbox y lo vacía el
-- cron tg_outbox_flush (token en Vault). No se duplica en GP2.
--
-- Flujo: la macro del Excel manda SOLO la hoja "Lista de Precios " (1 POST,
-- ~1.250 filas, con sb_publishable) a GP2.lista_precios_subir en cada guardado.
-- La RPC:
--   1) exige sesión autorizada (no service_role);
--   2) crea un snapshot nuevo y HEREDA del vigente anterior todas las hojas
--      menos "Lista de Precios " (el snapshot queda completo sin que la macro
--      mande las 16 hojas cada vez);
--   3) carga la "Lista de Precios " nueva;
--   4) DIFF contra el snapshot anterior por la col A (ID del VLOOKUP, NO el nº
--      de fila): altas, bajas, cambios de G (precio prov.) y de F (moneda), y
--      detecta CORRIMIENTOS (misma A con E y K cambiados a la vez);
--   5) encola el aviso a Telegram agrupado por proveedor;
--   6) poda snapshots viejos (deja los últimos 20).
--
-- Reglas del diff (idea 7358, medidas sobre A_Costos_VIGENTES.xlsx):
--   • Clave = col A (entero). A nueva = alta; A que falta = baja; misma A con
--     otro G = aumento/baja con %.
--   • Comparar G (Último $ proveedor), NUNCA H (= G×dólar/IPC, cambia sola con
--     cada cotización) ni L.
--   • Misma A con E (ISIS) y K (producto) cambiados a la vez = la planilla se
--     corrió (insertaron filas sin la col A): NO es aumento. Se avisa aparte.
--   • Nombre del proveedor: por cod_prov (col B) contra public.Proveedores
--     (96/97 matchean); el bloque arrastrado no es confiable (fallback).
--   • Dólar: línea aparte (param p_dolar, se compara contra el guardado).
--
-- Rollback:
--   drop function if exists "GP2".lista_precios_subir(jsonb,text,numeric,int,boolean);
--   drop function if exists "GP2".lista_precios_diff(integer,integer);
--   alter table "GP2".planilla_snapshot drop column if exists dolar;
-- ============================================================================

alter table "GP2".planilla_snapshot add column if not exists dolar numeric;

-- ----------------------------------------------------------------------------
-- 1) Diff puro (STABLE, no escribe) — testeable solo.
-- ----------------------------------------------------------------------------
create or replace function "GP2".lista_precios_diff(p_prev integer, p_new integer)
 returns table(
   clase text, id_a text, cod_prov text, proveedor text, cod_isis text, producto text,
   moneda_ant text, moneda_new text, g_ant numeric, g_new numeric, pct numeric )
 language sql
 stable security definer
 set search_path to 'GP2','public','pg_temp'
as $function$
  with lp as (
    select snapshot_id,
           nullif(btrim(datos->>'A'),'')        as id_a,
           nullif(btrim(datos->>'B'),'')        as cod_prov,
           nullif(btrim(datos->>'E'),'')        as cod_isis,
           upper(nullif(btrim(datos->>'F'),'')) as moneda,
           "GP2".planilla_num(datos->>'G')      as g,
           nullif(btrim(datos->>'K'),'')        as producto
      from "GP2".planilla_fila
     where hoja = 'Lista de Precios '
       and (datos->>'A') ~ '^[0-9]+$'
       and snapshot_id in (p_prev, p_new)
  ),
  lpd as (   -- A 1506 viene repetida: nos quedamos con la de G no nulo
    select distinct on (snapshot_id, id_a)
           snapshot_id, id_a, cod_prov, cod_isis, moneda, g, producto
      from lp
     order by snapshot_id, id_a, (g is null), producto
  ),
  a as (select * from lpd where snapshot_id = p_prev),
  b as (select * from lpd where snapshot_id = p_new),
  j as (
    select coalesce(b.id_a, a.id_a) as id_a,
           a.cod_prov a_cp, a.cod_isis a_e, a.moneda a_m, a.g a_g, a.producto a_k,
           b.cod_prov b_cp, b.cod_isis b_e, b.moneda b_m, b.g b_g, b.producto b_k
      from a full join b on a.id_a = b.id_a
  ),
  cl as (
    select j.*,
      case
        when a_cp is null then 'alta'
        when b_cp is null then 'baja'
        when coalesce(a_e,'') is distinct from coalesce(b_e,'')
         and coalesce(a_k,'') is distinct from coalesce(b_k,'') then 'corrimiento'
        when coalesce(a_m,'') is distinct from coalesce(b_m,'') then 'moneda'
        when coalesce(a_g,-1) is distinct from coalesce(b_g,-1)
         and coalesce(b_g,0) >= coalesce(a_g,0) then 'aumento'
        when coalesce(a_g,-1) is distinct from coalesce(b_g,-1) then 'baja_precio'
        else null
      end as clase
      from j
  )
  select cl.clase, cl.id_a,
         coalesce(cl.b_cp, cl.a_cp) as cod_prov,
         coalesce(pr.razon_social, 'Prov ' || coalesce(cl.b_cp, cl.a_cp)) as proveedor,
         coalesce(cl.b_e, cl.a_e) as cod_isis,
         coalesce(cl.b_k, cl.a_k) as producto,
         cl.a_m as moneda_ant, cl.b_m as moneda_new,
         cl.a_g as g_ant, cl.b_g as g_new,
         case when cl.a_g is not null and cl.a_g <> 0 and cl.b_g is not null
              then round((cl.b_g - cl.a_g) / cl.a_g * 100, 1) end as pct
    from cl
    left join public."Proveedores" pr
      on regexp_replace(pr.codigo,'^0+','') = regexp_replace(coalesce(cl.b_cp, cl.a_cp),'^0+','')
   where cl.clase is not null;
$function$;

comment on function "GP2".lista_precios_diff(integer,integer) is
  'Diff de la hoja "Lista de Precios " entre dos snapshots por col A (ID VLOOKUP). Compara G (no H/L). Clases: alta|baja|aumento|baja_precio|moneda|corrimiento. Idea 7358.';

-- ----------------------------------------------------------------------------
-- 2) Subida por macro: snapshot + herencia + carga + diff + aviso + poda.
-- ----------------------------------------------------------------------------
create or replace function "GP2".lista_precios_subir(
    p_filas         jsonb,                    -- { "Lista de Precios ": [[fila,{celdas},bloque?,{formulas}?], ...] }
    p_subido_por    text    default null,
    p_dolar         numeric default null,     -- valor de $H$3 al guardar; aviso aparte
    p_umbral_detalle int    default 60,       -- arriba de esto no detalla uno por uno
    p_avisar        boolean default true)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'GP2','public','pg_temp'
as $function$
declare
  v_prev int; v_new int; v_prev_dolar numeric;
  v_alta int; v_baja int; v_aum int; v_bajp int; v_mon int; v_corr int; v_tot int;
  v_msg text; v_blk text; v_part text;
begin
  perform "GP2"._exigir_autorizado();

  if p_filas is null or not (p_filas ? 'Lista de Precios ') then
    raise exception 'p_filas debe traer la hoja "Lista de Precios "';
  end if;

  select id, dolar into v_prev, v_prev_dolar
    from "GP2".planilla_snapshot where vigente order by id desc limit 1;

  v_new := "GP2".planilla_snapshot_nuevo('A_Costos_VIGENTES.xlsx',
             'macro ' || to_char(now() at time zone 'America/Argentina/Buenos_Aires','YYYY-MM-DD HH24:MI'),
             p_subido_por);
  update "GP2".planilla_snapshot set dolar = p_dolar where id = v_new;

  -- heredar todas las hojas MENOS la Lista de Precios
  if v_prev is not null then
    insert into "GP2".planilla_fila (snapshot_id, hoja, fila, bloque, datos, formulas)
    select v_new, hoja, fila, bloque, datos, formulas
      from "GP2".planilla_fila
     where snapshot_id = v_prev and hoja <> 'Lista de Precios '
    on conflict on constraint planilla_fila_uk do nothing;
  end if;

  perform "GP2".planilla_cargar(v_new, p_filas);

  drop table if exists _lpd;
  create temp table _lpd on commit drop as
    select * from "GP2".lista_precios_diff(v_prev, v_new);

  select count(*) filter (where clase='alta'),
         count(*) filter (where clase='baja'),
         count(*) filter (where clase='aumento'),
         count(*) filter (where clase='baja_precio'),
         count(*) filter (where clase='moneda'),
         count(*) filter (where clase='corrimiento')
    into v_alta, v_baja, v_aum, v_bajp, v_mon, v_corr
    from _lpd;
  v_tot := coalesce(v_alta,0)+coalesce(v_baja,0)+coalesce(v_aum,0)+coalesce(v_bajp,0)+coalesce(v_mon,0);

  if p_avisar and v_prev is not null
     and (v_tot > 0 or coalesce(v_corr,0) > 0
          or (p_dolar is not null and p_dolar is distinct from v_prev_dolar)) then

    v_msg := '📋 Lista de Precios actualizada (A Costos VIGENTES)' || E'\n' ||
             to_char(now() at time zone 'America/Argentina/Buenos_Aires','DD/MM HH24:MI') ||
             coalesce(' · ' || p_subido_por, '');

    if p_dolar is not null and p_dolar is distinct from v_prev_dolar then
      v_msg := v_msg || E'\n\n💵 Dólar: ' || coalesce(v_prev_dolar::text,'—') || ' → ' || p_dolar::text;
    end if;

    if coalesce(v_corr,0) > 0 then
      select string_agg(distinct proveedor, ', ') into v_blk from _lpd where clase='corrimiento';
      v_msg := v_msg || E'\n\n⚠️ Posible CORRIMIENTO de filas en: ' || coalesce(v_blk,'?') ||
               E'\n(insertaron filas sin la col A; no confiar en los aumentos de esos bloques, revisar a mano).';
    end if;

    if v_tot > p_umbral_detalle then
      v_msg := v_msg || E'\n\n' || v_tot || ' cambios en total (planilla muy modificada o primera sincronización):' ||
               E'\n🔺 ' || coalesce(v_aum,0) || ' aumentos · 🔻 ' || coalesce(v_bajp,0) || ' bajas · 🆕 ' ||
               coalesce(v_alta,0) || ' nuevos · ❌ ' || coalesce(v_baja,0) || ' sacados · 💱 ' || coalesce(v_mon,0) || ' moneda.' ||
               E'\nNo se detallan uno por uno.';
    else
      if coalesce(v_aum,0) > 0 then
        select string_agg(E'\n  • ' || proveedor || ' · ' || coalesce(producto,'?') ||
                 coalesce(' (' || cod_isis || ')','') || ': $' || trim(to_char(g_ant,'FM999999990.00')) ||
                 ' → $' || trim(to_char(g_new,'FM999999990.00')) ||
                 coalesce('  (' || case when pct>=0 then '+' else '' end || trim(to_char(pct,'FM990.0')) || '%)',''),
                 '' order by pct desc nulls last)
          into v_part from _lpd where clase='aumento';
        v_msg := v_msg || E'\n\n🔺 AUMENTOS (' || v_aum || '):' || v_part;
      end if;

      if coalesce(v_bajp,0) > 0 then
        select string_agg(E'\n  • ' || proveedor || ' · ' || coalesce(producto,'?') ||
                 ': $' || trim(to_char(g_ant,'FM999999990.00')) || ' → $' || trim(to_char(g_new,'FM999999990.00')) ||
                 coalesce('  (' || trim(to_char(pct,'FM990.0')) || '%)',''),
                 '' order by pct asc nulls last)
          into v_part from _lpd where clase='baja_precio';
        v_msg := v_msg || E'\n\n🔻 BAJAS (' || v_bajp || '):' || v_part;
      end if;

      if coalesce(v_mon,0) > 0 then
        select string_agg(E'\n  • ' || proveedor || ' · ' || coalesce(producto,'?') ||
                 ': ' || coalesce(moneda_ant,'—') || ' → ' || coalesce(moneda_new,'—'), '' order by proveedor)
          into v_part from _lpd where clase='moneda';
        v_msg := v_msg || E'\n\n💱 MONEDA (' || v_mon || '):' || v_part;
      end if;

      if coalesce(v_alta,0) > 0 then
        select string_agg(E'\n  • ' || proveedor || ' · ' || coalesce(producto,'?') ||
                 coalesce(': $' || trim(to_char(g_new,'FM999999990.00')),''), '' order by proveedor)
          into v_part from _lpd where clase='alta';
        v_msg := v_msg || E'\n\n🆕 NUEVOS (' || v_alta || '):' || v_part;
      end if;

      if coalesce(v_baja,0) > 0 then
        select string_agg(E'\n  • ' || proveedor || ' · ' || coalesce(producto,'?'), '' order by proveedor)
          into v_part from _lpd where clase='baja';
        v_msg := v_msg || E'\n\n❌ SACADOS (' || v_baja || '):' || v_part;
      end if;
    end if;

    perform public.tg_enqueue(v_msg, 'listaprec_' || v_new);   -- chat = default del proyecto (grupo de avisos)
  end if;

  delete from "GP2".planilla_snapshot
   where id in (select id from "GP2".planilla_snapshot order by id desc offset 20);

  return jsonb_build_object(
    'ok', true, 'snapshot_prev', v_prev, 'snapshot_new', v_new,
    'altas', coalesce(v_alta,0), 'bajas', coalesce(v_baja,0),
    'aumentos', coalesce(v_aum,0), 'baja_precio', coalesce(v_bajp,0),
    'moneda', coalesce(v_mon,0), 'corrimientos', coalesce(v_corr,0),
    'aviso', (p_avisar and v_prev is not null and (v_tot > 0 or coalesce(v_corr,0) > 0
             or (p_dolar is not null and p_dolar is distinct from v_prev_dolar))));
end $function$;

comment on function "GP2".lista_precios_subir(jsonb,text,numeric,int,boolean) is
  'Sube la hoja "Lista de Precios " desde la macro del Excel, hereda el resto de hojas del snapshot anterior, calcula el diff y avisa a Telegram (LK Gerencia). Idea 7358.';

-- La macro hace login password con una cuenta de COMPRAS de la whitelist GP2
-- (_exigir_autorizado la valida), así que va como authenticated. anon se rechaza.
grant execute on function "GP2".lista_precios_subir(jsonb,text,numeric,int,boolean) to authenticated;
grant execute on function "GP2".lista_precios_diff(integer,integer) to authenticated;
