-- =====================================================================
-- VERIFICACIÓN DE CAJONES · 2 CAJONES POR OPERARIO QUE TRABAJÓ ESE DÍA (2026-10-08)
-- [usuario, Elías 08/10, textual: «tanto en GP2 como en gestión productiva entera sean 2 cajones x operario que
--  trabajó ese día en Cervantes»]. Antes eran 2 cajones EN TOTAL por día (de operarios distintos).
--
-- QUÉ CAMBIA
--   1) public.gp2_verif_cajones_sortear(date): por cada operario (legajo) con producción ese día se sortean hasta 2
--      cajones. Si el operario hizo un solo registro, es 1 (no se inventa). Dentro de cada operario se prefiere, en
--      este orden: (a) un cajón con dato para verificar (peso por unidad cargado en GP2, o unidades por caja si es
--      envasado, o carga en kg), (b) matrices DISTINTAS, (c) al azar. Se puede volver a llamar: completa lo que falte
--      hasta 2 por operario sin tocar lo ya sorteado ni lo ya cargado (el cron de las 15:00 llama sin argumentos).
--   2) public._gp2_verif_candidatos(date): además de public.db_n8n_espejo (la app vieja de Registro) lee la producción
--      de Registro Producción 3.0 vía GP2.v_produccion_todas (fuente 'reg_prod_3_0', ids NEGATIVOS: no chocan con los
--      del espejo, que son positivos). Sin esto, cuando los operarios pasen a 3.0 quedarían sin sortear. Un registro de
--      3.0 no entra si el espejo ya tiene el mismo (legajo, matriz, hora de inicio) ese día (no sortear dos veces lo
--      mismo). Quedan afuera los legajos de PRUEBA 0, 1, 600 (entrevistas), 999 y 9999.
--   El resto de las reglas de candidatos NO cambia (sin [CONT], sin piedra ni carga en kg, sin los ya sorteados).
--
-- Rollback: volver a correr db/migracion_verificacion_cajones_envasado_20261006.sql (define las dos funciones anteriores).
-- =====================================================================

create or replace function public._gp2_verif_candidatos(p_fecha date)
 returns table(id bigint, legajo text, operario text, matriz text, nombre_matriz text, uni numeric, carga_en text,
               hora_inicio time without time zone, hora_fin time without time zone, piezas jsonb, kmin numeric, kmax numeric,
               sectores text, es_envasado boolean, apc_min integer, apc_max integer)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  with base as (
    -- 1) la app vieja de Registro (espejo)
    select e.id::bigint as id, e."Legajo"::text as legajo, e."Nombre_Empleado"::text as operario, e."Matriz"::text as matriz,
           e."Nombre_Matriz"::text as nombre_matriz, e."Uni"::numeric as uni, e."Hora_Inicio" as hora_inicio, e."Hora_Fin" as hora_fin
      from public.db_n8n_espejo e
     where (e."Fecha" at time zone 'America/Argentina/Buenos_Aires')::date = p_fecha
       and coalesce(e."Eliminar", '') <> 'S'
       and coalesce(e."Uni", 0) >= 1
    union all
    -- 2) Registro Producción 3.0 (ids negativos), salvo lo que el espejo ya tiene
    select p.id::bigint, p.legajo::text, p.nombre_empleado::text, p.matriz_raw::text, p.nombre_matriz::text, p.uni::numeric,
           p.hora_inicio, p.hora_fin
      from "GP2".v_produccion_todas p
     where p.fuente = 'reg_prod_3_0'
       and (p.fecha at time zone 'America/Argentina/Buenos_Aires')::date = p_fecha
       and coalesce(p.eliminar, '') <> 'S'
       and coalesce(p.uni, 0) >= 1
       and not exists (select 1 from public.db_n8n_espejo e2
                        where (e2."Fecha" at time zone 'America/Argentina/Buenos_Aires')::date = p_fecha
                          and e2."Legajo"::text = p.legajo::text and e2."Matriz"::text = p.matriz_raw::text
                          and e2."Hora_Inicio" = p.hora_inicio and coalesce(e2."Eliminar", '') <> 'S')
  )
  select t.id, t.legajo, t.operario, t.matriz, t.nombre_matriz, t.uni, t.carga_en, t.hora_inicio, t.hora_fin, t.piezas,
         case when t.env then null else (select min((j->>'kg_x_uni')::numeric) from jsonb_array_elements(t.piezas) j where (j->>'kg_x_uni')::numeric > 0) end,
         case when t.env then null else (select max((j->>'kg_x_uni')::numeric) from jsonb_array_elements(t.piezas) j where (j->>'kg_x_uni')::numeric > 0) end,
         (select string_agg(distinct j->>'sector', ' / ') from jsonb_array_elements(t.piezas) j where j->>'sector' is not null),
         t.env,
         case when t.env then (select min((j->>'uni_x_caja')::int) from jsonb_array_elements(t.piezas) j where (j->>'uni_x_caja')::int > 0) end,
         case when t.env then (select max((j->>'uni_x_caja')::int) from jsonb_array_elements(t.piezas) j where (j->>'uni_x_caja')::int > 0) end
    from (
      select b.id, b.legajo, b.operario, b.matriz, b.nombre_matriz, b.uni,
             (select gm.carga_en from "GP2".matriz gm where gm.n_matriz = b.matriz limit 1) as carga_en,
             b.hora_inicio, b.hora_fin,
             (select coalesce(jsonb_agg(distinct jsonb_build_object(
                       'codigo', c.codigo, 'descripcion', c.descripcion, 'kg_x_uni', c.kg_x_uni, 'sector', s.nombre,
                       'sector_id', c.sector_id, 'uni_x_caja', a.articulos_por_caja)),
                     '[]'::jsonb)
                from "GP2".matriz gm
                join "GP2".ruta_paso rp on rp.matriz_id = gm.id
                join "GP2".componente c on c.id = rp.comp_salida_id
                left join "GP2".sector s on s.id = c.sector_id
                left join "GP2".articulo a on a.codigo = c.codigo and c.sector_id = 12
               where gm.n_matriz = b.matriz) as piezas,
             (exists (select 1 from public."Matrices" pm where pm."N_Matriz" = b.matriz and pm."Tipo_Matriz" = 'E')
              or coalesce(b.nombre_matriz, '') ~* '^(re)?env'
              or exists (select 1 from "GP2".matriz gm
                           join "GP2".ruta_paso rp on rp.matriz_id = gm.id
                           join "GP2".componente c on c.id = rp.comp_salida_id and c.sector_id = 12
                          where gm.n_matriz = b.matriz)) as env
        from base b
       where coalesce(b.matriz, '') <> ''
         and coalesce(b.nombre_matriz, '') not like '[CONT]%'
         and coalesce(b.legajo, '') not in ('0', '1', '600', '999', '9999')       -- legajos de prueba / entrevistas
         and not (exists (select 1 from public."Matrices" pm where pm."N_Matriz" = b.matriz and pm."Tipo_Matriz" = 'P')
                  or coalesce(b.nombre_matriz, '') ilike '%piedra%'
                  or exists (select 1 from "GP2".matriz gm where gm.n_matriz = b.matriz and gm.carga_en = 'kg'))
         and not exists (select 1 from "GP2".verif_cajon v where v.fecha = p_fecha and v.espejo_id = b.id)
    ) t;
$function$;

create or replace function public.gp2_verif_cajones_sortear(p_fecha date default null)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_fecha date := coalesce(p_fecha, (now() at time zone 'America/Argentina/Buenos_Aires')::date);
  v_n integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended('gp2_verif_cajones:' || v_fecha::text, 0));
  if not exists (select 1 from public._gp2_verif_candidatos(v_fecha)) then return 0; end if;

  insert into "GP2".verif_cajon_dia (fecha) values (v_fecha) on conflict (fecha) do nothing;

  -- 2 por OPERARIO: a cada legajo se le completa hasta 2 (lo ya sorteado de ese día cuenta)
  insert into "GP2".verif_cajon (fecha, espejo_id, legajo, operario, matriz, nombre_matriz, uni, carga_en,
                                 hora_inicio, hora_fin, piezas, kg_x_uni_min, kg_x_uni_max,
                                 kg_esperado_min, kg_esperado_max, sectores,
                                 es_envasado, uni_x_caja_min, uni_x_caja_max, cajas_esperadas_min, cajas_esperadas_max)
  select v_fecha, y.id, y.legajo, y.operario, y.matriz, y.nombre_matriz, y.uni, y.carga_en,
         y.hora_inicio, y.hora_fin, y.piezas, y.kmin, y.kmax,
         case when y.es_envasado then null when y.carga_en = 'kg' then y.uni else round(y.kmin * y.uni, 3) end,
         case when y.es_envasado then null when y.carga_en = 'kg' then y.uni else round(y.kmax * y.uni, 3) end,
         y.sectores,
         y.es_envasado, y.apc_min, y.apc_max,
         case when y.es_envasado and y.apc_max > 0 then round(y.uni / y.apc_max, 3) end,
         case when y.es_envasado and y.apc_min > 0 then round(y.uni / y.apc_min, 3) end
    from (
      select x.*,
             row_number() over (partition by x.legajo
                                order by x.con_dato desc, (x.n_en_matriz > 1) asc, random()) as pos
        from (
          select c.*,
                 (case when c.es_envasado then c.apc_min is not null else (c.kmin is not null or c.carga_en = 'kg') end) as con_dato,
                 row_number() over (partition by c.legajo, c.matriz order by random()) as n_en_matriz
            from public._gp2_verif_candidatos(v_fecha) c
        ) x
    ) y
   where y.pos <= 2 - (select count(*) from "GP2".verif_cajon v where v.fecha = v_fecha and v.legajo is not distinct from y.legajo)
   order by y.legajo, y.pos;
  get diagnostics v_n = row_count;
  return v_n;
end;
$function$;
