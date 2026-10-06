-- =====================================================================
-- VERIFICACIÓN DE CAJONES — el ENVASADO también entra al sorteo (2026-10-06)
-- =====================================================================
-- Elías Irace: "envasado también. En caso de que sea envasado tendrías que ir a buscar las uni x caja
-- del envasado y la cantidad total que hizo". Antes (migracion_verificacion_cajones_20261006.sql) el
-- envasado se excluía porque no tiene peso. Ahora entra, pero no se pesa: se muestra el TOTAL que hizo
-- el operario y las UNIDADES POR CAJA, o sea cuántas cajas tiene que haber, y quien verifica CUENTA.
--
-- De dónde sale cada dato (medido el 06/10/2026):
--   * ES ENVASADO si: public."Matrices"."Tipo_Matriz" = 'E', o el nombre empieza con Env/ReEnv, o la
--     matriz cierra en GP2 un terminado (ruta_paso -> componente.sector_id = 12).
--   * UNIDADES POR CAJA: GP2.articulo.articulos_por_caja del terminado que cierra la matriz (la misma
--     fuente que usa la tablet de operarios para pasar cajas a unidades). Una matriz que cierra varios
--     artículos (la 383: 231/232/233/234; la 389: 207/229/909) da un rango si difieren.
--   * TOTAL QUE HIZO: Uni del registro de producción (unidades, no cajas: son múltiplos de las
--     unidades por caja, ej. la 514: 228, 300, 396, 96, 504).
--   * ⚠ HUECO DE DATOS: en los últimos 14 días Cervantes envasó con 8 matrices y SOLO 3 (309, 383, 389)
--     tienen ruta con terminado en GP2. La 341, 343 y 406 existen sin ningún paso, y la 513 y 514
--     no existen en GP2.matriz. Esas salen "sin unidades por caja en GP2: contá las cajas igual", y el
--     sorteo prefiere las que sí lo tienen (igual que con el peso).
--
-- ↩ Revertir: volver a aplicar db/migracion_verificacion_cajones_20261006.sql (recrea candidatos, sorteo y
--   verif_cajon_cargar de 5 parámetros) y quitar las columnas nuevas de GP2.verif_cajon.

-- ── La tabla: columnas y reglas del envasado (no se pesa, se cuenta).
alter table "GP2".verif_cajon
  add column if not exists es_envasado boolean not null default false,
  add column if not exists uni_x_caja_min integer,
  add column if not exists uni_x_caja_max integer,
  add column if not exists cajas_esperadas_min numeric,
  add column if not exists cajas_esperadas_max numeric,
  add column if not exists cajas_contadas integer,
  add column if not exists sueltas_contadas integer;
comment on column "GP2".verif_cajon.es_envasado is 'true: matriz de envasado. No se pesa: se cuentan cajas (cajas_contadas + sueltas_contadas) contra uni / uni_x_caja.';
comment on column "GP2".verif_cajon.uni_x_caja_min is 'GP2.articulo.articulos_por_caja del terminado que cierra la matriz (min y max si cierra varios). null = la matriz no tiene ruta con terminado en GP2.';

alter table "GP2".verif_cajon drop constraint verif_cajon_resultado_ck;
alter table "GP2".verif_cajon add constraint verif_cajon_resultado_ck
  check (resultado is null or resultado in ('pesado', 'contado', 'no_encontrado'));
alter table "GP2".verif_cajon add constraint verif_cajon_contado_ck
  check (resultado is distinct from 'contado' or (es_envasado and cajas_contadas is not null and cajas_contadas >= 0 and sueltas_contadas is not null and sueltas_contadas >= 0));
alter table "GP2".verif_cajon add constraint verif_cajon_envasado_no_pesa_ck
  check (not es_envasado or (cajon_numero is null and peso_bruto_kg is null and peso_neto_kg is null and kg_esperado_min is null));

-- ── Los candidatos: ahora con envasado. Cambia el tipo de retorno: hay que recrearla.
drop function if exists public._gp2_verif_candidatos(date);
create function public._gp2_verif_candidatos(p_fecha date)
returns table (id bigint, legajo text, operario text, matriz text, nombre_matriz text, uni numeric,
               carga_en text, hora_inicio time, hora_fin time, piezas jsonb,
               kmin numeric, kmax numeric, sectores text,
               es_envasado boolean, apc_min integer, apc_max integer)
language sql stable security definer
set search_path = public
as $$
  select t.id, t.legajo, t.operario, t.matriz, t.nombre_matriz, t.uni, t.carga_en, t.hora_inicio, t.hora_fin, t.piezas,
         case when t.env then null else (select min((j->>'kg_x_uni')::numeric) from jsonb_array_elements(t.piezas) j where (j->>'kg_x_uni')::numeric > 0) end,
         case when t.env then null else (select max((j->>'kg_x_uni')::numeric) from jsonb_array_elements(t.piezas) j where (j->>'kg_x_uni')::numeric > 0) end,
         (select string_agg(distinct j->>'sector', ' / ') from jsonb_array_elements(t.piezas) j where j->>'sector' is not null),
         t.env,
         case when t.env then (select min((j->>'uni_x_caja')::int) from jsonb_array_elements(t.piezas) j where (j->>'uni_x_caja')::int > 0) end,
         case when t.env then (select max((j->>'uni_x_caja')::int) from jsonb_array_elements(t.piezas) j where (j->>'uni_x_caja')::int > 0) end
    from (
      select e.id, e."Legajo" as legajo, e."Nombre_Empleado" as operario, e."Matriz" as matriz,
             e."Nombre_Matriz" as nombre_matriz, e."Uni"::numeric as uni,
             (select gm.carga_en from "GP2".matriz gm where gm.n_matriz = e."Matriz" limit 1) as carga_en,
             e."Hora_Inicio" as hora_inicio, e."Hora_Fin" as hora_fin,
             (select coalesce(jsonb_agg(distinct jsonb_build_object(
                       'codigo', c.codigo, 'descripcion', c.descripcion, 'kg_x_uni', c.kg_x_uni, 'sector', s.nombre,
                       'sector_id', c.sector_id, 'uni_x_caja', a.articulos_por_caja)),
                     '[]'::jsonb)
                from "GP2".matriz gm
                join "GP2".ruta_paso rp on rp.matriz_id = gm.id
                join "GP2".componente c on c.id = rp.comp_salida_id
                left join "GP2".sector s on s.id = c.sector_id
                left join "GP2".articulo a on a.codigo = c.codigo and c.sector_id = 12
               where gm.n_matriz = e."Matriz") as piezas,
             (exists (select 1 from public."Matrices" pm where pm."N_Matriz" = e."Matriz" and pm."Tipo_Matriz" = 'E')
              or coalesce(e."Nombre_Matriz", '') ~* '^(re)?env'
              or exists (select 1 from "GP2".matriz gm
                           join "GP2".ruta_paso rp on rp.matriz_id = gm.id
                           join "GP2".componente c on c.id = rp.comp_salida_id and c.sector_id = 12
                          where gm.n_matriz = e."Matriz")) as env
        from public.db_n8n_espejo e
       where (e."Fecha" at time zone 'America/Argentina/Buenos_Aires')::date = p_fecha
         and coalesce(e."Eliminar", '') <> 'S'
         and coalesce(e."Uni", 0) >= 1
         and coalesce(e."Matriz", '') <> ''
         and coalesce(e."Nombre_Matriz", '') not like '[CONT]%'
         -- PIEDRA fuera del sorteo [Elías, 06/10: "piedra queda fuera"]: la 501 (Piedra (TP) en public.Matrices, Tipo 'P'; en GP2 es
         -- "Afilado Cuchilla" y la única que se carga en kg). Se excluye por las tres vías, así no depende de una sola.
         and not (exists (select 1 from public."Matrices" pm where pm."N_Matriz" = e."Matriz" and pm."Tipo_Matriz" = 'P')
                  or coalesce(e."Nombre_Matriz", '') ilike '%piedra%'
                  or exists (select 1 from "GP2".matriz gm where gm.n_matriz = e."Matriz" and gm.carga_en = 'kg'))
         and not exists (select 1 from "GP2".verif_cajon v where v.fecha = p_fecha and v.espejo_id = e.id)
    ) t;
$$;
revoke all on function public._gp2_verif_candidatos(date) from public, anon, authenticated;

-- ── El sorteo: igual que antes, con las columnas del envasado y "tiene dato" según el tipo.
create or replace function public.gp2_verif_cajones_sortear(p_fecha date default null)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_fecha date := coalesce(p_fecha, (now() at time zone 'America/Argentina/Buenos_Aires')::date);
  v_faltan integer;
  v_n integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended('gp2_verif_cajones:' || v_fecha::text, 0));
  v_faltan := 2 - (select count(*) from "GP2".verif_cajon v where v.fecha = v_fecha);
  if v_faltan <= 0 then return 0; end if;
  if not exists (select 1 from public._gp2_verif_candidatos(v_fecha)) then return 0; end if;

  insert into "GP2".verif_cajon_dia (fecha) values (v_fecha) on conflict (fecha) do nothing;

  -- Primero los que tienen dato para verificar (peso por unidad, kg, o unidades por caja si es envasado);
  -- entre ésos, de operarios DISTINTOS.
  insert into "GP2".verif_cajon (fecha, espejo_id, legajo, operario, matriz, nombre_matriz, uni, carga_en,
                                 hora_inicio, hora_fin, piezas, kg_x_uni_min, kg_x_uni_max,
                                 kg_esperado_min, kg_esperado_max, sectores,
                                 es_envasado, uni_x_caja_min, uni_x_caja_max, cajas_esperadas_min, cajas_esperadas_max)
  select v_fecha, x.id, x.legajo, x.operario, x.matriz, x.nombre_matriz, x.uni, x.carga_en,
         x.hora_inicio, x.hora_fin, x.piezas, x.kmin, x.kmax,
         case when x.es_envasado then null when x.carga_en = 'kg' then x.uni else round(x.kmin * x.uni, 3) end,
         case when x.es_envasado then null when x.carga_en = 'kg' then x.uni else round(x.kmax * x.uni, 3) end,
         x.sectores,
         x.es_envasado, x.apc_min, x.apc_max,
         case when x.es_envasado and x.apc_max > 0 then round(x.uni / x.apc_max, 3) end,
         case when x.es_envasado and x.apc_min > 0 then round(x.uni / x.apc_min, 3) end
    from public._gp2_verif_candidatos(v_fecha) x
   order by (case when x.es_envasado then x.apc_min is not null else (x.kmin is not null or x.carga_en = 'kg') end) desc,
            (x.legajo in (select v.legajo from "GP2".verif_cajon v where v.fecha = v_fecha)) asc,
            row_number() over (partition by x.legajo,
                (case when x.es_envasado then x.apc_min is not null else (x.kmin is not null or x.carga_en = 'kg') end)
                order by random()) asc,
            random()
   limit v_faltan;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function public.gp2_verif_cajones_sortear(date) from public, anon, authenticated;

-- ── Cargar: peso (no envasado) o cajas contadas (envasado), o "no lo encontré". Cambia la firma: se recrea.
drop function if exists "GP2".verif_cajon_cargar(bigint, integer, numeric, boolean, text);
create function "GP2".verif_cajon_cargar(p_id bigint, p_cajon integer default null, p_bruto_kg numeric default null,
                                         p_no_encontrado boolean default false, p_nota text default null,
                                         p_cajas integer default null, p_sueltas integer default null)
returns jsonb
language plpgsql security definer
set search_path = "GP2"
as $$
declare
  v_fecha date;
  v_empezo timestamptz;
  v_env boolean;
  v_tara numeric;
  v_nota text := nullif(btrim(coalesce(p_nota, '')), '');
begin
  select v.fecha, d.empezado_en, v.es_envasado into v_fecha, v_empezo, v_env
    from "GP2".verif_cajon v join "GP2".verif_cajon_dia d on d.fecha = v.fecha
   where v.id = p_id;
  if not found then raise exception 'No encontré ese cajón' using errcode = 'P0002'; end if;
  if v_empezo is null then
    raise exception 'Primero apretá ▶ Empezar: así queda registrada la hora en que empezó la verificación' using errcode = '22023';
  end if;

  if coalesce(p_no_encontrado, false) then
    if v_nota is null then
      raise exception 'Si no encontraste el cajón, escribí qué pasó (dónde lo buscaste)' using errcode = '22023';
    end if;
    update "GP2".verif_cajon v
       set resultado = 'no_encontrado', cajon_numero = null, tara_kg = null, peso_bruto_kg = null, peso_neto_kg = null,
           cajas_contadas = null, sueltas_contadas = null, nota = v_nota, cargado_en = now()
     where v.id = p_id;
  elsif v_env then
    if p_cajon is not null or p_bruto_kg is not null then
      raise exception 'Es envasado: no se pesa, se cuentan las cajas' using errcode = '22023';
    end if;
    if p_cajas is null or p_cajas < 0 then
      raise exception 'Cargá cuántas cajas contaste (0 si no había)' using errcode = '22023';
    end if;
    if coalesce(p_sueltas, 0) < 0 then
      raise exception 'Las unidades sueltas no pueden ser negativas' using errcode = '22023';
    end if;
    if p_cajas > 5000 then
      raise exception 'Más de 5.000 cajas no puede ser: revisá el número' using errcode = '22023';
    end if;
    update "GP2".verif_cajon v
       set resultado = 'contado', cajas_contadas = p_cajas, sueltas_contadas = coalesce(p_sueltas, 0),
           nota = v_nota, cargado_en = now()
     where v.id = p_id;
  else
    if p_cajas is not null or p_sueltas is not null then
      raise exception 'Ese cajón no es envasado: se pesa, no se cuentan cajas' using errcode = '22023';
    end if;
    select c.tara_kg into v_tara from "GP2".cajon c where c.numero = p_cajon;
    if not found then raise exception 'Elegí en qué cajón lo pesaste (N° 1 a 10)' using errcode = '22023'; end if;
    if p_bruto_kg is null or p_bruto_kg <= v_tara then
      raise exception 'El peso de la balanza tiene que ser mayor que la tara del cajón N° % (% kg)',
        p_cajon, replace(v_tara::text, '.', ',') using errcode = '22023';
    end if;
    if p_bruto_kg > 300 then
      raise exception 'Más de 300 kg no puede ser un cajón: revisá el número' using errcode = '22023';
    end if;
    update "GP2".verif_cajon v
       set resultado = 'pesado', cajon_numero = p_cajon, tara_kg = v_tara, peso_bruto_kg = round(p_bruto_kg, 3),
           peso_neto_kg = round(p_bruto_kg - v_tara, 3), nota = v_nota, cargado_en = now()
     where v.id = p_id;
  end if;

  update "GP2".verif_cajon_dia d set terminado_en = now()
   where d.fecha = v_fecha and d.terminado_en is null
     and not exists (select 1 from "GP2".verif_cajon v where v.fecha = v_fecha and v.resultado is null);

  return "GP2".verif_cajones_bundle(v_fecha);
end;
$$;
revoke all on function "GP2".verif_cajon_cargar(bigint, integer, numeric, boolean, text, integer, integer) from public;
grant execute on function "GP2".verif_cajon_cargar(bigint, integer, numeric, boolean, text, integer, integer) to anon, authenticated;
-- comentario de resultado (para que db/ y la base coincidan)
comment on column "GP2".verif_cajon.resultado is 'pesado | contado (envasado) | no_encontrado (con nota obligatoria). null = falta.';
