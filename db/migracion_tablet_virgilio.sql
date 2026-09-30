-- =====================================================================
-- 2026-09-30 — "VIRGILIO" EN LA TABLET: Enviar y Recibir (GP2 v1.219.0)
--
-- [usuario 30/09] "Quiero que en enviar y recibir (versión tablet) me aparezca «Virgilio».
-- En enviar Virgilio: 1) todos los art terminados que arma tallerista Fábrica se mandan a Virgilio.
-- Se envía en cajas... Tendría que crearse el sector Artículo Terminado... Cuando se manda a
-- producir a fábrica, se descuenta el despiece del artículo y aumentan los artículos terminados
-- (stock en cajas). Cuando fábrica manda a Virgilio en cajas baja el stock de fábrica y termina ahí
-- el proceso. 2) Insumos: Plásticos, Flejes y Cajas 3) SC y SP. En recibir Virgilio: todos los
-- componentes que aparecen hoy en importados (dentro de recepción de insumos)... que estén sueltos".
-- Contestado en la charla: mandar a producir = Enviar -> Talleristas -> Fábrica (cajas); los
-- alambres son Fleje (el sector Alambre no tiene ninguna pieza).
--
-- Qué hace cada pieza:
--   · ubicación "Art. Terminado (Fábrica)" (tipo nuevo art_terminado, ref = tallerista 3). NO es un
--     'sector' 12 a propósito: ubic_de_componente() de los 198 terminados cae hoy en Virgilio (33) y
--     un sector 12 los mudaría a todos (los del prov. AT incluidos).
--   · depósitos de Virgilio para Fleje (5), Plástico (6) y Caja (11): como los de Crudo y Procesado.
--   · fabrica_producir: armado_fabrica del terminado + consumo_prod de cada pieza de la receta
--     (hijos por mov_padre_id), desde la ubicación de su sector.
--   · enviar_a_virgilio: terminado de Fábrica = recepcion_virgilio (baja, "termina ahí"); insumos,
--     SC y SP = traslado al depósito de ese sector en Virgilio.
--   · tablet_bundle / tablet_registrar: Fábrica en Enviar -> Talleristas (sus 41 artículos, en
--     cajas), Virgilio en Enviar (terminados + insumos + SC/SP) y los 8 importados sueltos en
--     Recibir -> Virgilio (recepción de Importado como la manual: remito en uni + control en kg).
--   · virgilio_articulo_stock: espejo de solo lectura del stock de artículos de Gestión Virgilio
--     (lo escribe public.gv_gp2_espejo_sync, repo gestion-virgilio). Para la caja "Virgilio" de
--     Stock General. GP2 no lee public (Regla 0).
--   · stock_general_extra_bundle: + art_terminado y virgilio_art.
-- =====================================================================

-- ---------- 1) ubicaciones ----------
alter table "GP2".ubicacion drop constraint if exists ubicacion_tipo_chk;
alter table "GP2".ubicacion add constraint ubicacion_tipo_chk check (tipo = any (array[
  'sector','tallerista','proveedor_servicio','proveedor_at','virgilio','analisis','inyector',
  'virgilio_sector','art_terminado']));
insert into "GP2".ubicacion (tipo, ref_id, nombre)
select 'art_terminado', 3, 'Art. Terminado (Fábrica)'
 where not exists (select 1 from "GP2".ubicacion where tipo = 'art_terminado' and ref_id = 3);
insert into "GP2".ubicacion (tipo, ref_id, nombre)
select 'virgilio_sector', s.sid, s.nom
  from (values (5, 'Sector Fleje en Virgilio'), (6, 'Sector Plástico en Virgilio'),
               (11, 'Sector Caja en Virgilio')) s(sid, nom)
 where not exists (select 1 from "GP2".ubicacion u where u.tipo = 'virgilio_sector' and u.ref_id = s.sid);

-- ---------- 2) espejo del stock de artículos de Virgilio ----------
create table if not exists "GP2".virgilio_articulo_stock (
  cod text primary key, cod_base text, linea text, descripcion text,
  stock_total numeric, terminado numeric, excedente numeric, racks numeric, a_guardar numeric,
  separar_pedidos numeric, a_facturar numeric,
  actualizado_en timestamptz not null default now()
);
comment on table "GP2".virgilio_articulo_stock is
  '2026-09-30: espejo de SOLO LECTURA del stock de artículos de Gestión Virgilio (public.stocks_carga_rapida, '
  'en CAJAS). Lo reescribe public.gv_gp2_espejo_sync (cron gv-gp2-espejo-sync) sólo si cambió. Lo lee Stock '
  'General (caja Virgilio > Art. Terminado).';
alter table "GP2".virgilio_articulo_stock enable row level security;
drop policy if exists p_gp2_select on "GP2".virgilio_articulo_stock;
create policy p_gp2_select on "GP2".virgilio_articulo_stock for select to anon, authenticated using (true);
revoke all on "GP2".virgilio_articulo_stock from anon, authenticated;
grant select on "GP2".virgilio_articulo_stock to anon, authenticated;

-- ---------- 3) producir en Fábrica ----------
create or replace function "GP2".fabrica_producir(p_comp_id bigint, p_cantidad numeric,
                                                  p_fecha timestamptz default now(), p_nota text default null)
 returns jsonb language plpgsql security definer set search_path to 'GP2'
as $function$
declare v_art record; v_ubic bigint; v_mov bigint; pz record; v_q numeric; v_o bigint;
        v_cons jsonb := '[]'::jsonb; v_f timestamptz := coalesce(p_fecha, now());
begin
  perform "GP2"._exigir_autorizado();
  if p_cantidad is null or p_cantidad <= 0 then raise exception 'La cantidad debe ser mayor a 0'; end if;
  select a.id, a.codigo, a.articulos_por_caja uxc into v_art
    from componente c join articulo a on upper(a.codigo) = upper(c.codigo)
   where c.id = p_comp_id and c.sector_id = 12
   limit 1;
  if v_art.id is null then raise exception 'El componente % no es un artículo terminado', p_comp_id; end if;
  -- (alias ru, no r: con un record r declarado plpgsql lo toma por la variable)
  if not exists (select 1 from ruta ru join ruta_paso rp on rp.ruta_id = ru.id
                  where ru.articulo_id = v_art.id and rp.tallerista_id = 3) then
    raise exception 'El artículo % no lo arma Fábrica', v_art.codigo;
  end if;
  v_ubic := ubic_de('art_terminado', 3);
  if v_ubic is null then raise exception 'Falta la ubicación "Art. Terminado (Fábrica)"'; end if;
  insert into movimiento(fecha, tipo_mov, comp_id, ubic_origen_id, ubic_destino_id, cantidad,
                         unidad_origen, unidad_destino, nota)
  values (v_f, 'armado_fabrica', p_comp_id, null, v_ubic, p_cantidad, 'uni', 'uni',
          coalesce(p_nota, 'Producido en Fábrica (tablet)'))
  returning id into v_mov;
  -- el DESPIECE: cada pieza de la receta sale de la ubicación de su sector (hijos del armado)
  for pz in select ac.componente_id cid, ac.cantidad q, c.codigo, c.unidad_medida um
             from articulo_componente ac join componente c on c.id = ac.componente_id
            where ac.articulo_id = v_art.id order by c.sector_id, c.codigo loop
    v_q := round(pz.q * p_cantidad, 6);
    if v_q <= 0 then continue; end if;
    v_o := ubic_de_componente(pz.cid);
    if v_o is null then raise exception 'La pieza % no tiene ubicación de la que descontar', pz.codigo; end if;
    insert into movimiento(fecha, tipo_mov, comp_id, ubic_origen_id, ubic_destino_id, cantidad,
                           unidad_origen, unidad_destino, nota, mov_padre_id)
    values (v_f, 'consumo_prod', pz.cid, v_o, null, v_q,
            case when lower(coalesce(pz.um, '')) = 'kg' then 'kg' else 'uni' end, null,
            'Despiece de ' || v_art.codigo || ' (Fábrica)', v_mov);
    v_cons := v_cons || jsonb_build_object('cod', pz.codigo, 'cantidad', v_q);
  end loop;
  return jsonb_build_object('ok', true, 'movimiento_id', v_mov, 'articulo', v_art.codigo,
    'unidades', p_cantidad, 'cajas', case when v_art.uxc > 0 then round(p_cantidad / v_art.uxc, 2) end,
    'consumos', v_cons,
    'stock_art_terminado', (select cantidad from inventario where componente_id = p_comp_id and ubicacion_id = v_ubic));
end $function$;
revoke execute on function "GP2".fabrica_producir(bigint, numeric, timestamptz, text) from public, anon;
grant execute on function "GP2".fabrica_producir(bigint, numeric, timestamptz, text) to authenticated, service_role;

-- ---------- 4) enviar a Virgilio ----------
create or replace function "GP2".enviar_a_virgilio(p_comp_id bigint, p_cantidad numeric, p_unidad text default null,
                                                   p_fecha timestamptz default now(), p_nota text default null)
 returns jsonb language plpgsql security definer set search_path to 'GP2'
as $function$
declare v_sec bigint; v_um text; v_cod text; v_u text; v_o bigint; v_d bigint; v_mov bigint;
        v_f timestamptz := coalesce(p_fecha, now());
begin
  perform "GP2"._exigir_autorizado();
  if p_cantidad is null or p_cantidad <= 0 then raise exception 'La cantidad debe ser mayor a 0'; end if;
  select sector_id, unidad_medida, codigo into v_sec, v_um, v_cod from componente where id = p_comp_id;
  if v_sec is null then raise exception 'El componente % no existe', p_comp_id; end if;
  v_u := case when lower(coalesce(p_unidad, v_um, 'uni')) = 'kg' then 'kg' else 'uni' end;
  if v_sec = 12 then
    -- ART. TERMINADO de Fábrica: sale de "Art. Terminado (Fábrica)" y ahí termina el proceso
    if not exists (select 1 from articulo a join ruta r on r.articulo_id = a.id
                     join ruta_paso rp on rp.ruta_id = r.id and rp.tallerista_id = 3
                    where upper(a.codigo) = upper(v_cod)) then
      raise exception 'El artículo % no lo arma Fábrica: no sale de acá.', v_cod;
    end if;
    v_o := ubic_de('art_terminado', 3);
    insert into movimiento(fecha, tipo_mov, comp_id, ubic_origen_id, ubic_destino_id, cantidad,
                           unidad_origen, unidad_destino, nota)
    values (v_f, 'recepcion_virgilio', p_comp_id, v_o, null, p_cantidad, 'uni', 'uni',
            coalesce(p_nota, 'Enviado a Virgilio (tablet)'))
    returning id into v_mov;
    return jsonb_build_object('ok', true, 'movimiento_id', v_mov, 'destino', 'virgilio',
      'stock_art_terminado', (select cantidad from inventario where componente_id = p_comp_id and ubicacion_id = v_o));
  end if;
  if v_sec not in (1, 2, 5, 6, 11) then
    raise exception '% : del sector % no se manda a Virgilio desde la tablet (solo SC, SP, fleje, plástico y caja).', v_cod, v_sec;
  end if;
  v_o := ubic_de('sector', v_sec);
  v_d := ubic_de('virgilio_sector', v_sec);
  if v_o is null or v_d is null then raise exception '% : falta la ubicación del sector o su depósito en Virgilio.', v_cod; end if;
  insert into movimiento(fecha, tipo_mov, comp_id, ubic_origen_id, ubic_destino_id, cantidad,
                         unidad_origen, unidad_destino, nota)
  values (v_f, 'traslado', p_comp_id, v_o, v_d, p_cantidad, v_u, v_u, coalesce(p_nota, 'Enviado a Virgilio (tablet)'))
  returning id into v_mov;
  return jsonb_build_object('ok', true, 'movimiento_id', v_mov, 'destino', 'virgilio_sector',
    'stock_cervantes', (select cantidad from inventario where componente_id = p_comp_id and ubicacion_id = v_o),
    'stock_virgilio',  (select cantidad from inventario where componente_id = p_comp_id and ubicacion_id = v_d));
end $function$;
revoke execute on function "GP2".enviar_a_virgilio(bigint, numeric, text, timestamptz, text) from public, anon;
grant execute on function "GP2".enviar_a_virgilio(bigint, numeric, text, timestamptz, text) to authenticated, service_role;

-- ---------- 5) tablet_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".tablet_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
with
-- FABRICA (tallerista 3, 2026-09-30): lo que arma Fabrica. A Fabrica no se le mandan partes: se le
-- MANDA A PRODUCIR el articulo en cajas (Enviar -> Talleristas -> Fabrica), que descuenta el despiece
-- y suma el terminado en la ubicacion "Art. Terminado (Fabrica)"; desde ahi se manda a Virgilio
-- (Enviar -> Virgilio). [usuario 2026-09-30]
fab as materialized (
  select distinct a.id art_id, a.codigo, a.articulos_por_caja uxc, c.id comp_id
    from articulo a
    join ruta r on r.articulo_id = a.id
    join ruta_paso rp on rp.ruta_id = r.id and rp.tallerista_id = 3
    join componente c on upper(c.codigo) = upper(a.codigo) and c.sector_id = 12
   where not a.discontinuado and not coalesce(c.discontinuado, false)
),
-- FASONERO (proveedor_servicio.pedido_por_oc, hoy Maspoli): lo que falta entregar de su O.C.
-- ENVIADA, sumado por (proveedor, pieza que se le manda). Es el techo de lo que hay que mandarle:
-- si nos debe 10 mangos, hay que tener 10 virolas en su poder [usuario 2026-09-18]. Mismo criterio
-- que el inyector (rep_iny): el borrador es un pedido que todavia no salio y no dispara envio.
oc_ps as (
  select p.proveedor_id, p.comp_entrada_id as comp_id, sum(coalesce(x.pend,0)) as pend
    from (select distinct rp.proveedor_id, rp.comp_entrada_id, rp.comp_salida_id
            from ruta_paso rp
            join proveedor_servicio ps on ps.id = rp.proveedor_id and ps.pedido_por_oc
           where rp.tipo_paso = 'proveedor_servicio' and rp.comp_entrada_id is not null) p
    left join lateral (
       select sum(oi.cantidad - coalesce(oi.recibido,0)) as pend
         from orden_compra_item oi join orden_compra o on o.id = oi.oc_id
        where oi.componente_id = p.comp_salida_id and o.estado = 'enviada'
          and oi.cantidad > coalesce(oi.recibido,0)
    ) x on true
   group by p.proveedor_id, p.comp_entrada_id
),
env as (
  select v.tipo, v.ref_id::text as ref, v.comp_id
    from v_contraparte_parte v
   where v.lado = 'entrada'
     and ( (v.tipo = 'tallerista'
            and exists (select 1 from tallerista t where t.id = v.ref_id and t.activo and t.id <> 3))
        or (v.tipo = 'proveedor_servicio'
            -- los PS hibridos (Charcas/Eclipse) NO se envian desde la tablet: la entrega de su
            -- materia prima se registra solo en el modulo Casos especiales [usuario 2026-09-17].
            -- el FASONERO aparece SIEMPRE, igual que el inyector: sin O.C. su sugerido es 0 y sube
            -- cuando la orden sale [usuario 2026-09-18: "los inyectores por mas que no este
            -- cargada la orden de compra aparecen igual con cero sugerido, tendria que aparecer
            -- Maspoli con cero sugerido y cuando sale la orden de compra ahi sube el sugerido de
            -- entrega de virolas"]. El techo lo pone oc_ps en la CTE rep, que sin O.C. da 0.
            and exists (select 1 from proveedor_servicio ps where ps.id = v.ref_id and not ps.hibrido)) )
  union all
  select 'proveedor_at', apa.proveedor_at_id::text, ac.componente_id
    from articulo_prov_at apa
    join articulo a on a.codigo = apa.cod_art and not a.discontinuado
    join articulo_componente ac on ac.articulo_id = a.id
    join componente c on c.id = ac.componente_id
   where coalesce(apa.activo,true)
     and c.sector_id in (10,11) and not coalesce(c.discontinuado,false)
  union all
  select 'inyector', c.proveedor, c.material_id
    from componente c
   where c.material_id is not null and c.estado_compra is null and c.proveedor is not null
     and exists (select 1 from proveedor_insumo pi where pi.nombre = c.proveedor)
   group by c.proveedor, c.material_id
  union all
  -- FABRICA: sus articulos terminados (se cargan en cajas)
  select 'tallerista', '3', f.comp_id from fab f
  union all
  -- VIRGILIO (2026-09-30): art. terminados de Fabrica + insumos (plastico, fleje, caja) + SC y SP.
  -- Los importados no: esos los TRAE Virgilio (Recibir -> Virgilio).
  select 'virgilio', 'virgilio', f.comp_id from fab f
  union all
  select 'virgilio', 'virgilio', c.id
    from componente c
   where c.sector_id in (1, 2, 5, 6, 11) and not coalesce(c.discontinuado, false)
     and coalesce(c.estado_compra, '') <> 'importado'
),
-- rep (Enviar a PS / tallerista): el Maximo y el Sugerido salen del CONSUMO DE LA PIEZA QUE SE
-- ENVIA (la entrada), no de la salida. [usuario 2026-09-17: "sale del consumo de estadistica
-- madre x max de meses por ubicacion"]. Antes se calculaba sobre la SALIDA (inventario.maximo de
-- la pieza procesada/armada): las salidas de tallerista son nodos "X Terminado" del sector 12 que
-- no tienen demanda ni maximo cargado, asi que el 90% de las filas salia en 0 (Martin 6 de 94).
-- Ahora maximo = consumo(entrada) x meses_stock de la ubicacion del sector de la entrada:
--   · tallerista -> v_consumo_tallerista (la demanda YA repartida entre los que hacen el paso,
--     via v_reparto_efectivo; asi no se le pide un mes entero a cada uno de dos que arman lo mismo),
--   · PS         -> v_consumo_componente (demanda total de la pieza),
--   · PROV AT    -> v_consumo_prov_at (la demanda del articulo repartida entre los prov AT que lo
--     entregan y los talleristas que lo arman; sin reparto dictado, partes iguales) [usuario
--     2026-09-23: "el inventario maximo de los prov de art terminado tiene que ser al igual que
--     los talleristas de un mes de consumo... si hay mas de uno dividir segun la proporcion"],
--   · fleje (sector 5, en kg) -> v_consumo_fleje_kg (kg/mes) para cualquiera de los dos tipos.
-- Sugerido = maximo − lo que el tercero ya tiene (inventario en su ubicacion). meses_stock cae a 1
-- si la ubicacion no lo tiene (mismo default que OC). OJO, la ubicacion de la que salen los MESES
-- no es la misma para todos: el tallerista y el P.S. la toman del SECTOR de la pieza (como estaba),
-- y el prov AT de SU PROPIA ubicacion, que es donde vive el "un mes" que pidio el usuario. El consumo ya viene en la unidad de la
-- entrada (kg para fleje, uni para el resto), asi que no hay factor de conversion.
-- CONSUMOS, UNA sola vez (2026-09-22): antes se consultaban las tres vistas de consumo fila por
-- fila dentro de rep (una subconsulta correlacionada por cada pieza x destino), y cada vista es
-- un agregado de 30-40 ms. Materializadas aca se calculan una vez y rep las cruza por join:
-- tablet_bundle bajo de ~700 ms a ~200 ms con el mismo resultado.
cons_fk   as materialized (select componente_id, consumo_kg_mes from v_consumo_fleje_kg),
cons_tall as materialized (select tallerista_id, componente_id, uni_mes from v_consumo_tallerista),
cons_comp as materialized (select componente_id, consumo_uni_mes from v_consumo_componente),
cons_pat  as materialized (select proveedor_at_id, componente_id, uni_mes from v_consumo_prov_at),
rep as (
  select e.tipo, e.ref, e.comp_id,
         round(t.techo) as maximo_dest,
         null::numeric as stock_dest,   -- el front muestra saldo_dest como "Stock", no este
         greatest(0, round(
            t.techo
            - coalesce((select i.cantidad from inventario i
                         where i.componente_id = e.comp_id
                           and i.ubicacion_id = ubic_de(e.tipo, e.ref::bigint) limit 1),0)
         , 2)) as sugerido
    from (select distinct tipo, ref, comp_id from env
           where tipo in ('proveedor_servicio','tallerista','proveedor_at')
             -- Fabrica no tiene sugerido: se le manda a producir lo que se decida (2026-09-30)
             and not (tipo = 'tallerista' and ref = '3')) e
    join componente ent on ent.id = e.comp_id
    left join cons_fk   fk on fk.componente_id = e.comp_id
    left join cons_tall ct on ct.componente_id = e.comp_id and e.tipo = 'tallerista'
                          and ct.tallerista_id = e.ref::bigint
    left join cons_pat cpa on cpa.componente_id = e.comp_id and e.tipo = 'proveedor_at'
                          and cpa.proveedor_at_id = e.ref::bigint
    left join cons_comp vc on vc.componente_id = e.comp_id
    cross join lateral (
       select
         coalesce((select u.meses_stock from ubicacion u
                    where u.id = case when e.tipo = 'proveedor_at'
                                        then ubic_de('proveedor_at', e.ref::bigint)
                                      -- el tallerista se surte de UN mes (regla del usuario 2026-09-23:
                                      -- "los talleristas de un mes de consumo"), que vive en SU propia
                                      -- ubicacion (las 12 en meses_stock=1). Antes tomaba el meses_stock
                                      -- del SECTOR de la pieza (Bombilla=3, Plastico=4, Carton/Fleje=6),
                                      -- pensado para el stock de insumos del sector, e inflaba el
                                      -- sugerido: LLF8 a Alex daba 29 cajones (6.644 x 3 / 698) en vez
                                      -- de 9,5. El P.S. sigue tomando el del sector (como estaba).
                                      when e.tipo = 'tallerista'
                                        then ubic_de('tallerista', e.ref::bigint)
                                      else ubic_de('sector', ent.sector_id) end
                    limit 1), 1) as meses,
         case
           -- solo el fleje que se PESA va por kg/mes. IC3/IC3V (alambre N 90 cortado) son sector 5 pero
           -- se cuentan en unidades: no estan en v_consumo_fleje_kg y daban sugerido 0 a IJUPA
           -- [usuario 2026-09-25: "me aparece cero cajones en el sugerido. Tendria que salir el consumo"].
           when ent.sector_id = 5 and ent.unidad_medida = 'kg' then coalesce(fk.consumo_kg_mes, 0)
           when e.tipo = 'tallerista'     then coalesce(ct.uni_mes, 0)
           when e.tipo = 'proveedor_at'   then coalesce(cpa.uni_mes, 0)
           else                                coalesce(vc.consumo_uni_mes, 0)
         end as consumo
    ) cons
    cross join lateral (
       -- FASONERO: el techo es lo que falta entregar de su O.C., no el consumo x meses. Para el
       -- resto (PS normal y tallerista) no cambia nada.
       select case when e.tipo = 'proveedor_servicio'
                    and exists (select 1 from proveedor_servicio ps3
                                 where ps3.id = e.ref::bigint and ps3.pedido_por_oc)
                   then coalesce((select oc.pend from oc_ps oc
                                   where oc.proveedor_id = e.ref::bigint and oc.comp_id = e.comp_id), 0)
                   -- TALLERISTA CON O.C. DE VIRGILIO: mismo criterio que el fasonero sin O.C. — el
                   -- pedido no sale del consumo x meses sino de una orden que GP2 no lee, asi que
                   -- el techo es 0 y con el el sugerido [usuario 2026-09-23: "No es o.c. de
                   -- insumos. Es orden de compra que se hace desde Gestion Virgilio que hoy no
                   -- esta modelado aca. Por ahora sugeri 0"]. Cuando esa O.C. se modele, este 0
                   -- es lo unico que se cambia.
                   when e.tipo = 'tallerista'
                    and exists (select 1 from tallerista t8
                                 where t8.id = e.ref::bigint and t8.pedido_por_oc_virgilio)
                   -- (2026-09-26, unas horas: los pasos que entregan en GARAGE tambien iban por esta O.C.;
                   -- el dueno lo corrigio: "los que llenan garage se tienen que llenar por orden de compra
                   -- de INSUMOS, no por orden de compra de articulo terminado". Vuelven al maximo de la casa.)
                   -- 2026-09-26: la O.C. de Virgilio YA se lee (espejo GP2.oc_virgilio). El techo son las
                   -- partes que ese tallerista necesita para lo que falta entregar de la O.C. vigente,
                   -- explotada por receta y ruta (v_oc_virgilio_partes_tallerista). Sin O.C. sigue en 0.
                   then coalesce((select vt.uni_requeridas from v_oc_virgilio_partes_tallerista vt
                                   where vt.tallerista_id = e.ref::bigint and vt.componente_id = e.comp_id), 0)
                   -- PROV. DE ART. TERMINADO: igual que el tallerista con O.C. de Virgilio. El proveedor de
                   -- articulo terminado no tiene un maximo de inventario nuestro alla (no es gente de
                   -- la misma confianza que el tallerista a facon): lo que hay que mandarle sale de una
                   -- O.C. que emite Gestion Virgilio y que GP2 no lee, asi que el techo es 0 y con el el
                   -- sugerido [usuario 2026-09-24: "no tienen un maximo alla ellos... por lo tanto no
                   -- tiene que haber un sugerido de que mandarle, sino que tiene que aparecer en cero.
                   -- Cuando salga orden de compra de Virgilio... lo hace otro sistema ahora"]. DA VUELTA
                   -- la migracion del 2026-09-23 (consumo x meses con reparto), que queda dormida.
                   when e.tipo = 'proveedor_at'
                   -- ...HASTA EL 2026-09-26: ahora GP2 lee esa O.C. (espejo GP2.oc_virgilio ->
                   -- v_oc_virgilio_partes) y el techo son las PARTES (carton y caja) que el prov AT
                   -- necesita tener para cumplir lo que le falta entregar de su O.C. vigente
                   -- [usuario 2026-09-26: "solamente tenemos que mandarle partes para que puedan
                   -- hacer lo que les pide su orden de compra"]. Sin O.C. vigente sigue en 0.
                   then coalesce((select vp.uni_requeridas from v_oc_virgilio_partes vp
                                   where vp.tipo = 'proveedor_at' and vp.ref_id = e.ref::bigint
                                     and vp.componente_id = e.comp_id), 0)
                   else cons.consumo * cons.meses end as techo
    ) t
),
-- INYECTOR: el pedido de bolsas surge de la O.C. de partes plasticas ENVIADA (no del deficit
-- automatico). Sin OC enviada -> maximo(O.C.)=0 y sugerido=0; recien cuando se manda la OC de partes
-- (Compras/OC_GP2, proveedor = el inyector) aparecen los kg de bolsa. [usuario 2026-09-16]
rep_iny as (
  select 'inyector'::text as tipo, c.proveedor as ref, c.material_id as comp_id,
         sum(coalesce(ocp.pend,0) * coalesce(c.kg_x_uni,0)) as maximo_dest,  -- O.C. de partes -> kg de resina
         0::numeric as stock_dest,                                           -- el Stock lo pone online_sector en el front
         greatest(0, round(
            sum(coalesce(ocp.pend,0) * coalesce(c.kg_x_uni,0))
            - coalesce((select ir.cantidad from inventario ir
                         where ir.componente_id = c.material_id
                           and ir.ubicacion_id = ubic_de('inyector',
                                 (select pi2.id from proveedor_insumo pi2 where pi2.nombre = c.proveedor limit 1))
                         limit 1), 0)
         , 2)) as sugerido
    from componente c
    left join lateral (
       -- el vinculo es la PIEZA (c.proveedor ya es el inyector), no o.proveedor: la OC de rubro
       -- Plastico abarca partes de varios inyectores y puede venir con proveedor NULL.
       select sum(oi.cantidad - coalesce(oi.recibido,0)) as pend
         from orden_compra o
         join orden_compra_item oi on oi.oc_id = o.id
        where o.estado = 'enviada' and oi.componente_id = c.id
    ) ocp on true
   where c.material_id is not null and c.estado_compra is null and c.proveedor is not null
     and exists (select 1 from proveedor_insumo pi where pi.nombre = c.proveedor)
   group by c.proveedor, c.material_id
),
rec as (
  select 'tallerista'::text as tipo, v.ref_id::text as ref, v.comp_id,
         case when exists (select 1 from componente_bom b where b.componente_padre_id = v.comp_id)
              then null::bigint
              else (select case when count(distinct rp.comp_entrada_id) = 1
                                then min(rp.comp_entrada_id) end
                      from ruta_paso rp
                     where rp.tipo_paso = 'tallerista' and rp.tallerista_id = v.ref_id
                       and rp.comp_salida_id = v.comp_id and rp.comp_entrada_id is not null
                       and rp.comp_entrada_id <> v.comp_id) end as comp_entrada_id,
         (select count(distinct rp.comp_entrada_id) from ruta_paso rp
           where rp.tipo_paso = 'tallerista' and rp.tallerista_id = v.ref_id
             and rp.comp_salida_id = v.comp_id and rp.comp_entrada_id is not null
             and rp.comp_entrada_id <> v.comp_id)::int as n_entradas,
         exists (select 1 from componente_bom b where b.componente_padre_id = v.comp_id) as tiene_bom,
         null::text as cod_art,
         coalesce((select i.cantidad from inventario i
                    where i.componente_id = v.comp_id
                      and i.ubicacion_id = ubic_de('tallerista', v.ref_id) limit 1), 0) as esperado,
         'online_tall'::text as esperado_origen
    from v_contraparte_parte v
    join componente c on c.id = v.comp_id
   where v.tipo = 'tallerista' and v.lado = 'salida'
     and c.sector_id <> 12 and not coalesce(c.discontinuado,false)
     and exists (select 1 from tallerista t where t.id = v.ref_id and t.activo and t.id <> 3)
  union all
  select 'proveedor_servicio', rp.proveedor_id::text, rp.comp_salida_id, rp.comp_entrada_id,
         1, false, null::text,
         coalesce((select i.cantidad from inventario i
                    where i.componente_id = rp.comp_entrada_id
                      and i.ubicacion_id = ubic_de('proveedor_servicio', rp.proveedor_id) limit 1), 0),
         'online_ps'
    from (select distinct proveedor_id, comp_entrada_id, comp_salida_id
            from ruta_paso
           where tipo_paso = 'proveedor_servicio' and proveedor_id is not null
             and comp_entrada_id is not null and comp_salida_id is not null) rp
    join componente cs on cs.id = rp.comp_salida_id and not coalesce(cs.discontinuado,false)
  union all
  select 'proveedor_at', a.proveedor_at_id::text, null::bigint, null::bigint, 0, false, a.cod_art,
         (select sum(oi.cantidad - coalesce(oi.recibido,0)) from orden_compra o
            join orden_compra_item oi on oi.oc_id = o.id
            join componente ci on ci.id = oi.componente_id
           where o.estado in ('borrador','enviada')
             and o.proveedor = (select nombre from proveedor_at where id = a.proveedor_at_id)
             and ci.codigo = a.cod_art),
         'oc'
    from articulo_prov_at a
   where coalesce(a.activo,true)
     and exists (select 1 from proveedor_at p where p.id = a.proveedor_at_id and coalesce(p.activo,true))
     and not exists (select 1 from articulo art where art.codigo = a.cod_art and art.discontinuado)
  union all
  select 'proveedor_insumo', o.proveedor, oi.componente_id, null::bigint, 0, false, null::text,
         sum(oi.cantidad - coalesce(oi.recibido,0)),
         'oc'
    from orden_compra o
    join orden_compra_item oi on oi.oc_id = o.id
   where o.estado in ('borrador','enviada')
   group by o.proveedor, oi.componente_id
  having sum(oi.cantidad - coalesce(oi.recibido,0)) > 0
  union all
  select 'virgilio', 'virgilio', i.componente_id, null::bigint, 0, false, null::text,
         sum(i.cantidad), 'online_virgilio'
    from inventario i
    join ubicacion u on u.id = i.ubicacion_id and u.tipo in ('virgilio','virgilio_sector')
    join componente c on c.id = i.componente_id
   where c.sector_id <> 12 and not coalesce(c.discontinuado,false)
   group by i.componente_id
  having sum(i.cantidad) <> 0
  union all
  -- IMPORTADOS (2026-09-30): los TRAE Virgilio. Antes eran el rubro "Importados" de Recepcion de
  -- Insumos; ahora van sueltos en Recibir -> Virgilio [usuario: "que no esten dentro del modulo
  -- importados, que esten sueltos"]. Se registran como la recepcion de un Importado (remito en
  -- unidades y despues el control en kg).
  select 'virgilio', 'virgilio', c.id, null::bigint, 0, false, null::text, null::numeric, null::text
    from componente c
   where c.estado_compra = 'importado' and not coalesce(c.discontinuado,false)
),
env_x as (
  select distinct on (e.tipo, e.ref, e.comp_id) e.tipo, e.ref, e.comp_id,
         c.codigo cod,
         -- el terminado se llama como el ARTICULO ("Cierra Bolsa x2", no "058 Terminado")
         case when c.sector_id = 12
              then coalesce((select a.descripcion from articulo a where upper(a.codigo) = upper(c.codigo) limit 1), c.descripcion)
              else c.descripcion end descr,
         s.nombre sector, c.unidad_medida um,
         c.uni_x_cajon uxc, c.kg_x_uni kgu,
         -- envase de ENVIO propio de la pieza (componente.entrega_unidad/entrega_uni_x): una caja
         -- de 100 (GRJ13/GRJ14), una caja de 2400 (Descorazonador) o las bolsas de 120 de GRJ5/GRJ6.
         -- Si esta cargado gana sobre el "cajon" teorico (uni_x_cajon). [usuario 2026-09-24]
         c.entrega_unidad ent_uni, c.entrega_uni_x ent_ux,
         -- en que se escribe la CANTIDAD del envio: 'envase' (cajas cerradas) o 'kg'. NULL = la
         -- regla del sector (carton/caja en envase, el resto en kg). Z21: cajas [usuario 2026-09-25].
         c.envio_carga env_carga_pieza,
         c.sector_id sec_id, c.carton_formato cfmt,
         -- el terminado de Fabrica vive en "Art. Terminado (Fabrica)", no en un sector (2026-09-30)
         case when c.sector_id = 12
              then coalesce((select i.cantidad from inventario i
                              where i.componente_id = c.id
                                and i.ubicacion_id = ubic_de('art_terminado', 3) limit 1), 0)
              else coalesce((select i.cantidad from inventario i
                              where i.componente_id = c.id
                                and i.ubicacion_id = ubic_de('sector', c.sector_id) limit 1), 0) end online_sector,
         (select f.uxc from fab f where f.comp_id = c.id limit 1) art_uxc,
         case when e.tipo = 'virgilio' then case c.sector_id when 12 then 'Art. Terminados'
                                                             when 1 then 'SC' when 2 then 'SP'
                                                             else 'Insumos' end end grupo,
         -- saldo en poder del tercero = lo que le enviamos − lo que nos entregó = inventario de lo
         -- que se le manda (la pieza/resina) en la ubicacion del destino. [usuario 2026-09-16]
         coalesce((select i.cantidad from inventario i
                    where i.componente_id = c.id
                      and i.ubicacion_id = (case
                            when e.tipo in ('proveedor_servicio','tallerista','proveedor_at') then ubic_de(e.tipo, e.ref::bigint)
                            when e.tipo = 'inyector' then ubic_de('inyector',
                                  (select pi3.id from proveedor_insumo pi3 where pi3.nombre = e.ref limit 1))
                          end) limit 1), 0) saldo_dest,
         coalesce(rep.maximo_dest, ri.maximo_dest) maximo_dest,
         coalesce(rep.stock_dest,  ri.stock_dest)  stock_dest,
         coalesce(rep.sugerido,    ri.sugerido)    sugerido
    from env e
    join componente c on c.id = e.comp_id and not coalesce(c.discontinuado,false)
                     and c.id not in (select comp_id from "GP2".v_componente_muerto)
    left join sector s on s.id = c.sector_id
    left join rep     on rep.tipo = e.tipo and rep.ref = e.ref and rep.comp_id = e.comp_id
    left join rep_iny ri on ri.tipo = e.tipo and ri.ref = e.ref and ri.comp_id = e.comp_id
   order by e.tipo, e.ref, e.comp_id
),
rec_x as (
  select r.tipo, r.ref, r.comp_id, r.comp_entrada_id, r.n_entradas, r.tiene_bom, r.cod_art,
         max(r.esperado) esperado, min(r.esperado_origen) esperado_origen,
         coalesce(c.codigo, r.cod_art) cod,
         coalesce(c.descripcion, (select max(descripcion) from articulo_prov_at ap
                                   where ap.cod_art = r.cod_art)) descr,
         s.nombre sector, c.unidad_medida um, c.uni_x_cajon uxc, c.kg_x_uni kgu,
         c.entrega_unidad ent_uni, c.entrega_uni_x ent_ux, c.remito_unidad remito_uni,
         ce.codigo ent_cod, ce.descripcion ent_desc,
         -- el CAJON DE LA PIEZA ENVIADA, SOLO donde la pieza vuelve en el MISMO cajon en el que se
         -- mando: hoy los REMACHES que niquela Guazzaroni (sector 8). El esperado de un P.S. se
         -- cuenta en unidades de la ENTRADA (es lo que el proveedor tiene en su poder), asi que ahi
         -- el envase con el que se mira tiene que ser el de ESA pieza y no el de la que devuelve
         -- [usuario 2026-09-18: "Guazzaroni nos entrega los remaches niquelados en los mismos
         -- cajones que se lo enviamos... si envio 2 cajones lo esperado es recibir 2 cajones aprox
         -- (el peso niquelado es un poquito mas - muy infima la diferencia)", y enseguida el limite:
         -- "no aplica para todos los casos... te lo estoy diciendo en el caso de los remaches"].
         -- El uni_x_cajon del remache niquelado (V11 = 2.729 uni = 2 kg) NO es un cajon: es la bolsa
         -- en la que se fracciona DESPUES de recibirlo, con la matriz de embolsado. Mirar el
         -- esperado con ese numero multiplicaba por 10 lo que se le habia mandado.
         -- NULL en el resto de los P.S.: ahi el front sigue con el cajon de la pieza devuelta.
         case when ce.sector_id = 8 then ce.uni_x_cajon end ent_uxc,
         case when ce.sector_id = 8 then ce.kg_x_uni    end ent_kgu,
         -- ...Y CUANTO MIDE ESE CAJON DE VERDAD (2026-09-21): el que anoto logistica al enviar
         -- (movimiento.cajones), no el uni_x_cajon del maestro. CV1 salio como 1 cajon de 21 kg
         -- contra un cajon teorico de 20 kg y la tarjeta de Recibir decia 1,05 cajones [usuario:
         -- "tiene que aparecer en su stock los cajones que escribe logistica, no los que se
         -- calcula a partir de los kg"]. Va SOLO donde ya va ent_uxc (P.S. y sector Remache), que
         -- es donde el front mira el envase de la pieza ENVIADA; null = nadie anoto cajones y
         -- queda el de siempre.
         max(case when ce.sector_id = 8 and r.tipo = 'proveedor_servicio'
                  then (select v.uni_x_cajon_anotado from v_caj_contraparte v
                         where v.componente_id = r.comp_entrada_id
                           and v.ubicacion_id = ubic_de(r.tipo, r.ref::bigint)) end) ent_uxc_anot,
         (select a.articulos_por_caja from articulo a where a.codigo = r.cod_art) por_caja,
         (c.estado_compra = 'importado') importado, c.sector_id sec_id, c.proveedor prov
    from rec r
    left join componente c on c.id = r.comp_id
    left join componente ce on ce.id = r.comp_entrada_id
    left join sector s on s.id = c.sector_id
   where (r.comp_id is null or not coalesce(c.discontinuado,false))
     and (r.comp_id is null or r.comp_id not in (select comp_id from "GP2".v_componente_muerto))
   group by r.tipo, r.ref, r.comp_id, r.comp_entrada_id, r.n_entradas, r.tiene_bom, r.cod_art,
            c.codigo, c.descripcion, s.nombre, c.unidad_medida, c.uni_x_cajon, c.kg_x_uni,
            c.entrega_unidad, c.entrega_uni_x, c.remito_unidad,
            ce.codigo, ce.descripcion, ce.uni_x_cajon, ce.kg_x_uni, ce.sector_id,
            c.estado_compra, c.sector_id, c.proveedor
),
-- envio_unidad / envio_uni_x / envio_carga_unidad: unidad de ENVIO por proveedor (display), p.ej. AJ
-- Adhesivos manda de a paquetes de 100 pliegos y Ester de a bolsas de 1800 mangos. Es solo
-- presentacion: el front muestra/precarga el sugerido dividido por envio_uni_x (techo) y rotula la
-- columna con envio_unidad. envio_carga_unidad dice en QUE unidad se escribe la CANTIDAD: null = en
-- la unidad de envio (AJ escribe paquetes y el front multiplica de nuevo), 'kg' = se escribe en kg y
-- al lado se muestran las bolsas (Ester). En los dos casos lo que llega a la base esta en unidad
-- canonica (uni/kg): el inventario nunca ve bolsas ni paquetes. Hoy solo lo tiene
-- proveedor_servicio; el resto va null. [usuario 2026-09-17]
cp as (
  select 'tallerista'::text tipo, t.id::text ref, t.nombre, null::text envio_unidad, null::numeric envio_uni_x, null::text envio_carga_unidad, null::text entrega_unidad, null::numeric entrega_uni_x
    from tallerista t
   where t.activo
     and exists (select 1 from v_contraparte_parte v where v.tipo='tallerista' and v.ref_id = t.id)
  union all
  select 'proveedor_servicio', ps.id::text, ps.nombre, ps.envio_unidad, ps.envio_uni_x, ps.envio_carga_unidad, ps.entrega_unidad, ps.entrega_uni_x
    from proveedor_servicio ps
   where exists (select 1 from v_contraparte_parte v where v.tipo='proveedor_servicio' and v.ref_id = ps.id)
  union all
  select 'proveedor_at', p.id::text, p.nombre, null::text, null::numeric, null::text, null::text, null::numeric
    from proveedor_at p where coalesce(p.activo,true)
  union all
  select distinct 'proveedor_insumo', o.proveedor, o.proveedor, null::text, null::numeric, null::text, null::text, null::numeric
    from orden_compra o where o.estado in ('borrador','enviada')
  union all
  select 'virgilio', 'virgilio', 'Virgilio', null::text, null::numeric, null::text, null::text, null::numeric
  union all
  select distinct 'inyector', c.proveedor, c.proveedor, null::text, null::numeric, null::text, null::text, null::numeric
    from componente c
   where c.material_id is not null and c.estado_compra is null and c.proveedor is not null
     and exists (select 1 from proveedor_insumo pi where pi.nombre = c.proveedor)
)
select jsonb_build_object(
  'generado_en', now(),
  'contrapartes', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'tipo', cp.tipo, 'ref', cp.ref, 'nombre', cp.nombre,
             -- O.C. DE GESTION VIRGILIO (2026-09-23): a este tallerista no se le manda contra el
             -- maximo de la casa; lo que tiene que hacer sale de una O.C. que emite Gestion
             -- Virgilio y que GP2 todavia no lee. La Tablet lo muestra en su propia baldosa
             -- ("Talleristas O.C.", solo en Enviar) y su sugerido es 0 (ver la CTE t) [usuario].
             'oc', (cp.tipo = 'tallerista' and exists (select 1 from tallerista t9
                      where t9.id = cp.ref::bigint and t9.pedido_por_oc_virgilio)),
             'envio_unidad', cp.envio_unidad, 'envio_uni_x', cp.envio_uni_x,
             'entrega_unidad', cp.entrega_unidad, 'entrega_uni_x', cp.entrega_uni_x,
             'envio_carga_unidad', cp.envio_carga_unidad,
             'n_env', (select count(*) from env_x e where e.tipo = cp.tipo and e.ref = cp.ref),
             'n_rec', (select count(*) from rec_x r where r.tipo = cp.tipo and r.ref = cp.ref)
           ) order by cp.nombre), '[]'::jsonb)
      from cp where cp.nombre is not null),
  'enviar', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'tipo', tipo, 'ref', ref, 'comp_id', comp_id, 'cod', cod, 'desc', descr,
             'sector', sector, 'um', um, 'uxc', uxc, 'kg_x_uni', kgu,
             -- el TERMINADO de Fabrica se carga en CAJAS (articulo.articulos_por_caja) [2026-09-30]
             'env_unidad', case when sec_id = 12 and art_uxc > 0 and tipo in ('tallerista','virgilio') then 'cajas'
                                when tipo in ('tallerista','proveedor_at')
                                  then case when sec_id in (10,11) then coalesce(nullif(btrim(ent_uni),''), 'paquetes')
                                            else coalesce(nullif(btrim(ent_uni),''), 'cajones') end end,
             'env_factor', case when sec_id = 12 and art_uxc > 0 and tipo in ('tallerista','virgilio') then art_uxc
                                when tipo in ('tallerista','proveedor_at') then case
                                  when sec_id = 10 then nullif(ent_ux,0)
                                  when sec_id = 11 then (select pa.valor::numeric from parametro pa
                                                          where pa.clave = 'caja_uni_x_paquete')
                                  else coalesce(nullif(ent_ux,0), uxc) end end,
             'env_carga',  case when sec_id = 12 and art_uxc > 0 and tipo in ('tallerista','virgilio') then 'envase'
                                when tipo in ('tallerista','proveedor_at')
                                  then coalesce(env_carga_pieza,
                                         case when sec_id in (10,11) then 'envase' else 'kg' end) end,
             'online_sector', online_sector, 'saldo_dest', saldo_dest, 'grupo', grupo, 'sec_id', sec_id,
             'maximo', maximo_dest, 'stock_dest', stock_dest, 'sugerido', sugerido
           ) order by cod), '[]'::jsonb) from env_x),
  'recibir', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'tipo', tipo, 'ref', ref, 'comp_id', comp_id, 'comp_entrada_id', comp_entrada_id,
             'n_entradas', n_entradas, 'tiene_bom', tiene_bom,
             'cod_art', cod_art, 'cod', cod, 'desc', descr, 'sector', sector, 'um', um,
             'uxc', uxc, 'kg_x_uni', kgu, 'por_caja', por_caja,
             -- LA UNIDAD DEL REMITO LA DICE LA PIEZA (componente.remito_unidad): las bombillas de
             -- Martin vienen contadas y la cuchilla pesada [usuario 2026-09-23]. Sin dato, la
             -- Tablet usa la unidad canonica.
             'remito_unidad', remito_uni,
             -- envase de ENTREGA (hoy solo el tallerista): el esperado se mira en cajones (o en las
             -- bolsas de 120 de GRJ5/GRJ6) y la cantidad se escribe en kg.
             'env_unidad', case when tipo = 'tallerista' then coalesce(ent_uni, 'cajones') end,
             'env_factor', case when tipo = 'tallerista' then coalesce(ent_ux, uxc) end,
             'env_carga',  case when tipo = 'tallerista' then 'kg' end,
             'ent_cod', ent_cod, 'ent_desc', ent_desc, 'ent_uxc_anot', ent_uxc_anot,
             'ent_uxc', ent_uxc, 'ent_kgu', ent_kgu,
             'esperado', esperado, 'esperado_origen', esperado_origen,
             'importado', coalesce(importado, false), 'sector_id', sec_id, 'proveedor', prov
           ) order by cod), '[]'::jsonb) from rec_x),
  'alertas_abiertas', (select count(*) from alerta_recepcion where estado = 'abierta')
);
$function$
;

-- ---------- 6) tablet_registrar ----------
CREATE OR REPLACE FUNCTION "GP2".tablet_registrar(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare
  v_modo   text := lower(coalesce(p->>'modo',''));
  v_tipo   text := lower(coalesce(p->>'tipo',''));
  v_ref    text := nullif(btrim(coalesce(p->>'ref','')),'');
  v_nom    text;
  v_fecha  timestamptz := coalesce((p->>'fecha')::timestamptz, now());
  v_remito text := nullif(btrim(coalesce(p->>'remito','')),'');
  it       jsonb;
  v_comp   bigint; v_ent bigint; v_cant numeric; v_uni text; v_esp numeric;
  v_cod    text; v_desc text; v_cod_art text; v_por_caja numeric; v_cajones numeric;
  v_sust   bigint;
  v_r      jsonb; v_res jsonb := '[]'::jsonb; v_alertas jsonb := '[]'::jsonb;
  v_comparable numeric; v_alerta_id bigint; v_n int := 0;
  v_ubic_o bigint; v_ubic_d bigint; v_sec bigint; v_um text; v_mov bigint;
begin
  perform "GP2"._exigir_autorizado();  -- seguridad punto 1 fase B (2026-09-28)
  if v_modo not in ('enviar','recibir') then
    raise exception 'Modo invalido: "%". Tiene que ser enviar o recibir.', coalesce(v_modo,'null');
  end if;
  if v_ref is null then raise exception 'Falta decir a quien (ref).'; end if;
  if jsonb_typeof(p->'items') <> 'array' or jsonb_array_length(p->'items') = 0 then
    raise exception 'No hay nada cargado para registrar.';
  end if;

  v_nom := case v_tipo
    when 'tallerista'         then (select nombre from tallerista where id = v_ref::bigint)
    when 'proveedor_servicio' then (select nombre from proveedor_servicio where id = v_ref::bigint)
    when 'proveedor_at'       then (select nombre from proveedor_at where id = v_ref::bigint)
    when 'proveedor_insumo'   then v_ref
    when 'inyector'           then (select nombre from proveedor_insumo where nombre = v_ref)
    when 'virgilio'           then 'Virgilio'
  end;
  if v_nom is null then
    raise exception 'Contraparte inexistente (tipo=%, ref=%).', coalesce(v_tipo,'null'), v_ref;
  end if;
  if v_modo = 'enviar' and v_tipo not in ('tallerista','proveedor_servicio','proveedor_at','inyector','virgilio') then
    raise exception 'A "%" no se le envia desde la tablet: solo talleristas, prov. de servicio, prov. art. terminado, inyectores y Virgilio.', v_nom;
  end if;

  for it in select value from jsonb_array_elements(p->'items') loop
    v_comp     := nullif(it->>'comp_id','')::bigint;
    v_ent      := nullif(it->>'comp_entrada_id','')::bigint;
    v_cod_art  := nullif(btrim(coalesce(it->>'cod_art','')),'');
    v_cant     := nullif(it->>'cantidad','')::numeric;
    v_uni      := lower(coalesce(nullif(it->>'unidad',''), 'uni'));
    v_esp      := nullif(it->>'esperado','')::numeric;
    v_por_caja := nullif(it->>'por_caja','')::numeric;
    -- carton de OTRO articulo mandado en lugar del que corresponde (2026-09-21): viaja el carton
    -- OFICIAL al que reemplaza. Lo valida crear_envio_* (mismo sector, y que sea pieza del destino).
    v_sust     := nullif(it->>'sustituye_comp_id','')::bigint;
    v_cajones  := nullif(it->>'cajones','')::numeric;
    if v_uni not in ('uni','kg') then raise exception 'Unidad invalida: "%"', v_uni; end if;
    if v_cant is null or v_cant <= 0 then
      raise exception '% : la cantidad tiene que ser mayor a 0.', coalesce(v_cod_art, v_comp::text, '?');
    end if;
    if v_sust is not null and (v_modo <> 'enviar' or v_tipo not in ('tallerista','proveedor_at')) then
      raise exception 'El reemplazo de carton solo existe al ENVIAR a un tallerista o a un prov. de art. terminado.';
    end if;
    select codigo, descripcion into v_cod, v_desc from componente where id = v_comp;
    v_cod := coalesce(v_cod, v_cod_art);

    if v_modo = 'enviar' then
      -- FABRICA (tallerista 3, 2026-09-30): no se le mandan partes, se le manda a PRODUCIR el
      -- articulo: descuenta el despiece y suma el terminado en "Art. Terminado (Fabrica)".
      if v_tipo = 'tallerista' and v_ref = '3' then
        if v_uni <> 'uni' then raise exception '% : a Fabrica se le manda a producir en cajas (unidades).', coalesce(v_cod,'?'); end if;
        v_r := "GP2".fabrica_producir(v_comp, v_cant, v_fecha);
      elsif v_tipo = 'tallerista' then
        v_r := "GP2".crear_envio_tallerista(v_ref::bigint, v_comp, v_cant, v_uni, v_fecha, v_sust);
      elsif v_tipo = 'proveedor_servicio' then
        v_r := "GP2".crear_envio_ps(v_ref::bigint, v_comp, v_cant, v_uni, v_fecha, v_cajones);
      elsif v_tipo = 'inyector' then
        v_r := "GP2".enviar_material_inyector(v_ref, v_comp, v_cant, v_fecha);
      elsif v_tipo = 'virgilio' then
        -- VIRGILIO (2026-09-30): el art. terminado de Fabrica se da de baja (ahi termina el proceso);
        -- insumos, SC y SP pasan al deposito de ese sector en Virgilio.
        v_r := "GP2".enviar_a_virgilio(v_comp, v_cant, v_uni, v_fecha);
      else
        v_r := "GP2".crear_envio_prov_at(v_ref::bigint, v_comp, v_cant, v_uni, v_fecha, v_sust);
      end if;
      v_comparable := null;
    else
      if v_tipo = 'tallerista' then
        v_r := "GP2".crear_entrega_tallerista(v_ref::bigint, v_comp, v_cant, v_uni, v_fecha, true, v_ent);
      elsif v_tipo = 'proveedor_servicio' then
        if v_ent is null then
          raise exception '% : falta saber que SC consume ese SP (comp_entrada_id).', coalesce(v_cod,'?');
        end if;
        v_r := "GP2".crear_entrega_ps(v_ref::bigint, v_ent, v_comp, v_cant, v_fecha, null, false, v_uni);
      elsif v_tipo = 'proveedor_at' then
        if v_cod_art is null then raise exception 'Falta el codigo de articulo del prov. art. terminado.'; end if;
        v_r := "GP2".crear_entrega_prov_at(v_ref::bigint, v_cod_art, v_cant::int, v_remito, v_fecha::date);
      elsif v_tipo = 'proveedor_insumo' then
        v_r := "GP2".crear_recepcion_insumo(v_comp, v_ref, v_cant, v_uni, v_remito, v_fecha);
      elsif v_tipo = 'virgilio' and exists (select 1 from componente where id = v_comp and estado_compra = 'importado') then
        -- IMPORTADO que trae Virgilio (2026-09-30, antes rubro Importados de Recepcion de Insumos):
        -- la misma recepcion que el Importado cargado a mano; queda pendiente del control en kg.
        v_r := "GP2".crear_recepcion_insumo(v_comp,
                 (select coalesce(nullif(btrim(proveedor),''), 'Importado') from componente where id = v_comp),
                 v_cant, v_uni, coalesce(v_remito, 'Virgilio (tablet)'), v_fecha);
      else
        select sector_id, unidad_medida into v_sec, v_um from componente where id = v_comp;
        if v_sec is null then raise exception 'El componente % no existe', v_comp; end if;
        v_ubic_d := "GP2".ubic_de('sector', v_sec);
        v_ubic_o := coalesce(
          (select i.ubicacion_id from inventario i
             join ubicacion u on u.id = i.ubicacion_id
            where i.componente_id = v_comp and u.tipo in ('virgilio_sector','virgilio') and i.cantidad > 0
            order by case when u.tipo = 'virgilio_sector' then 0 else 1 end limit 1),
          "GP2".ubic_de('virgilio_sector', v_sec),
          (select id from ubicacion where tipo = 'virgilio' limit 1));
        if v_ubic_o is null or v_ubic_d is null then
          raise exception '% : falta la ubicacion de Virgilio o la del sector destino.', coalesce(v_cod,'?');
        end if;
        insert into movimiento(fecha, tipo_mov, comp_id, ubic_origen_id, ubic_destino_id,
                               cantidad, unidad_origen, unidad_destino, nota)
        values (v_fecha, 'traslado', v_comp, v_ubic_o, v_ubic_d, v_cant, v_uni, v_uni,
                'Recibido de Virgilio (tablet)')
        returning id into v_mov;
        v_r := jsonb_build_object('ok', true, 'movimiento_id', v_mov);
      end if;
    end if;

    v_n := v_n + 1;
    v_res := v_res || jsonb_build_object('cod', v_cod, 'cantidad', v_cant, 'unidad', v_uni, 'res', v_r);

    if v_modo = 'recibir' and v_esp is not null then
      v_comparable := case when v_tipo = 'proveedor_at'
                           then v_cant * coalesce(nullif(v_por_caja,0), 1) else v_cant end;
      -- LA ALERTA NO SALTA POR UN DECIMAL [usuario 2026-09-23: "por que salta la alerta? es
      -- exactamente la misma cantidad", con 1.852 uni contra 1.852 esperadas]. El saldo que el
      -- tercero tiene en su poder arrastra decimales de las conversiones kg <-> uni (10 kg de mango
      -- son 1.851,8518 uni), asi que comparar crudo anota una alerta por cada redondeo. Media
      -- unidad, o 5 gramos si la pieza se mide en kg: nadie entrega 0,15 mangos. La MISMA
      -- tolerancia vive en exceso() de la Tablet, que es el cartel que ve el operario.
      -- El case va ENTRE PARENTESIS a proposito: sin eso plpgsql corta la condicion del IF en el
      -- primer THEN que encuentra, que seria el del case, y la funcion no compila.
      -- Y NO SE COMPARA CONTRA EL STOCK DE UN P.S. [usuario 2026-09-23: "esta alerta me tiene
      -- que aparecer no a la hora de recibir, sino a la hora de hacer el control... porque puede
      -- haber 1.800 unidades de stock de proveedor de servicio y capaz recibo menos"]: lo que se
      -- carga aca es el REMITO y una entrega parcial es lo normal. Esa comparacion vive en
      -- ControlEntregaPS, contra el remito. En los demas destinos el aviso queda, pero recien
      -- arriba del 5 % (el mismo umbral que pidio para el control), con el piso de media unidad
      -- -5 gramos en kg- que cubre el caso de esperado 0.
      if v_tipo <> 'proveedor_servicio'
         and v_comparable > v_esp + greatest(
               (case when lower(coalesce(v_uni,'')) = 'kg' then 0.005 else 0.5 end),
               v_esp * 0.05) then
        insert into alerta_recepcion(fecha, origen_tipo, origen_ref, origen_nombre, comp_id, cod,
                                     descripcion, esperado, recibido, exceso, unidad, esperado_origen,
                                     movimiento_id)
        values (v_fecha, v_tipo, v_ref, v_nom, v_comp, v_cod, coalesce(v_desc, v_cod_art),
                v_esp, v_comparable, v_comparable - v_esp, v_uni,
                nullif(it->>'esperado_origen',''),
                coalesce((v_r->>'movimiento_id')::bigint, (v_r->>'id')::bigint))
        returning id into v_alerta_id;
        v_alertas := v_alertas || jsonb_build_object('id', v_alerta_id, 'cod', v_cod,
                       'esperado', v_esp, 'recibido', v_comparable, 'exceso', v_comparable - v_esp);
      end if;
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'n', v_n, 'contraparte', v_nom, 'modo', v_modo,
                            'items', v_res, 'alertas', v_alertas);
end $function$
;

-- ---------- 7) stock_general_extra_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".stock_general_extra_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
with pa as (
  select p.id, p.nombre, "GP2".ubic_de('proveedor_at', p.id) ubic_id
    from proveedor_at p
   where coalesce(p.activo, true)
), pa_comp as (
  select distinct pa.id pa_id, pa.nombre, pa.ubic_id, c.id comp_id, c.sector_id
    from pa
    join articulo_prov_at apa on apa.proveedor_at_id = pa.id and coalesce(apa.activo, true)
    join articulo a on a.codigo = apa.cod_art
    join articulo_componente ac on ac.articulo_id = a.id
    join componente c on c.id = ac.componente_id
   where c.sector_id in (10, 11)          -- Sector Carton y Sector Caja
), iny as (
  select pi.id, pi.nombre, coalesce(pi.activo, true) activo, u.id ubic_id
    from proveedor_insumo pi
    join ubicacion u on u.tipo = 'inyector' and u.ref_id = pi.id
), iny_mat as (
  -- (2026-09-30) la RESINA de cada inyector sale de sus PIEZAS (componente.proveedor = el inyector,
  -- componente.material_id = la resina), mismo filtro que rep_iny de tablet_bundle. Asi aparece
  -- aunque nunca se le haya mandado nada (Pat Bet Plast y JL Matriceria no tenian fila en inventario).
  select iny.id iny_id, iny.nombre, iny.ubic_id, c.material_id comp_id
    from iny
    join componente c on c.proveedor = iny.nombre
   where iny.activo and c.material_id is not null and c.estado_compra is null
  union
  -- + lo que ya tiene fila en su ubicacion, aunque ninguna pieza lo declare
  select iny.id, iny.nombre, iny.ubic_id, i.componente_id
    from iny
    join inventario i on i.ubicacion_id = iny.ubic_id
), pares as (
  select distinct p1.comp_salida_id comp_id, p1.proveedor_id ps1_id, p2.proveedor_id ps2_id
    from ruta_paso p1
    join ruta_paso p2 on p2.ruta_id = p1.ruta_id and p2.orden = p1.orden + 1
   where p1.tipo_paso = 'proveedor_servicio' and p2.tipo_paso = 'proveedor_servicio'
     and p1.comp_salida_id is not null and p2.comp_entrada_id = p1.comp_salida_id
), fab as (
  -- ART. TERMINADO de Fabrica (2026-09-30): lo que produjo y todavia no mando a Virgilio
  select distinct a.codigo, a.articulos_por_caja uxc, c.id comp_id
    from articulo a
    join ruta r on r.articulo_id = a.id
    join ruta_paso rp on rp.ruta_id = r.id and rp.tallerista_id = 3
    join componente c on upper(c.codigo) = upper(a.codigo) and c.sector_id = 12
   where not a.discontinuado and not coalesce(c.discontinuado, false)
), tr as (
  select pr.comp_id, ps1.nombre ps1_nombre, ps2.nombre ps2_nombre,
         coalesce((select sum(m._delta_dest) from movimiento m
                    where m.tipo_mov = 'entrega_ps'
                      and coalesce(m.comp_transformado_id, m.comp_id) = pr.comp_id
                      and m.ubic_origen_id = "GP2".ubic_de('proveedor_servicio', ps1.id)), 0)
       - coalesce((select sum(m._delta_orig) from movimiento m
                    where m.tipo_mov = 'envio_ps' and m.comp_id = pr.comp_id
                      and m.ubic_destino_id = "GP2".ubic_de('proveedor_servicio', ps2.id)), 0) cant
    from pares pr
    join proveedor_servicio ps1 on ps1.id = pr.ps1_id
    join proveedor_servicio ps2 on ps2.id = pr.ps2_id
)
select jsonb_build_object(
  'prov_at', coalesce((select jsonb_agg(x order by x->>'nom') from (
      select jsonb_build_object(
               'id', pa_id, 'nom', nombre, 'ubic', ubic_id,
               'filas', jsonb_agg(jsonb_build_object(
                          'cid', comp_id,
                          'cant', coalesce((select i.cantidad from inventario i
                                             where i.componente_id = comp_id and i.ubicacion_id = ubic_id), 0),
                          'max',  (select i.maximo from inventario i
                                    where i.componente_id = comp_id and i.ubicacion_id = ubic_id))
                        order by comp_id)) x
        from pa_comp group by pa_id, nombre, ubic_id) y), '[]'::jsonb),
  -- inyector: kg de resina en poder de cada inyector (0 si todavia no se le mando)
  'inyector', coalesce((select jsonb_agg(x order by x->>'nom') from (
      select jsonb_build_object(
               'id', iny_id, 'nom', nombre, 'ubic', ubic_id,
               'filas', jsonb_agg(jsonb_build_object(
                          'cid', comp_id,
                          'cant', coalesce((select i.cantidad from inventario i
                                             where i.componente_id = comp_id and i.ubicacion_id = ubic_id), 0))
                        order by comp_id)) x
        from iny_mat group by iny_id, nombre, ubic_id) y), '[]'::jsonb),
  'transito', coalesce((select jsonb_agg(jsonb_build_object(
      'cid', comp_id, 'ps1', ps1_nombre, 'ps2', ps2_nombre, 'cant', cant)
      order by ps1_nombre, ps2_nombre, comp_id) from tr), '[]'::jsonb),
  'art_terminado', jsonb_build_object(
      'ubic', "GP2".ubic_de('art_terminado', 3),
      'filas', coalesce((select jsonb_agg(jsonb_build_object(
          'cid', f.comp_id, 'uxc', f.uxc,
          'cant', coalesce((select i.cantidad from inventario i
                             where i.componente_id = f.comp_id
                               and i.ubicacion_id = "GP2".ubic_de('art_terminado', 3)), 0))
        order by f.codigo) from fab f), '[]'::jsonb)),
  -- el mismo articulo EN VIRGILIO: espejo de solo lectura que escribe Gestion Virgilio
  -- (GP2.virgilio_articulo_stock, en CAJAS). GP2 no lee public (Regla 0).
  'virgilio_art', coalesce((select jsonb_agg(jsonb_build_object(
          'cid', f.comp_id, 'uxc', f.uxc, 'cod_gv', v.cod, 'linea', v.linea,
          'cajas', v.stock_total, 'gondola', v.terminado, 'excedente', v.excedente, 'racks', v.racks,
          'a_guardar', v.a_guardar, 'actualizado', v.actualizado_en)
        order by f.codigo) from fab f
        left join "GP2".virgilio_articulo_stock v
          on regexp_replace(upper(v.cod_base), '^0+', '') = regexp_replace(upper(f.codigo), '^0+', '')),
      '[]'::jsonb),
  'generado_en', now());
$function$
;
