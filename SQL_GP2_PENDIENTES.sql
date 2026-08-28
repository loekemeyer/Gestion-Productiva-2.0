-- ============================================================================
-- SQL_GP2_PENDIENTES.sql — BORRADOR, NO APLICADO
-- Piezas que le faltan al schema GP2 para que todo el circuito funcione
-- internamente (sin depender de public). Detectadas en ANALISIS_GP2_2026-08-28.md.
--
-- ⚠️ ANTES DE APLICAR: verificar contra la base real (los cuerpos de las
-- funciones existentes no se pudieron introspeccionar en esta sesion).
-- Cada bloque dice que hay que chequear.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Tabla empleado (hoy no existe: el operario viene embebido en produccion)
--    Equivalente GP2 de public."Empleados" (Legajo, Activo='SI').
--    Desbloquea: maestro, tiempos, informes, disruptivas, premios.
-- ----------------------------------------------------------------------------
create table if not exists "GP2".empleado (
  id      bigint generated always as identity primary key,
  legajo  text not null unique,
  nombre  text not null,
  activo  boolean not null default true
);

comment on table "GP2".empleado is
  'Operarios de produccion. Reemplaza public."Empleados" (Activo=SI -> activo=true).';

-- Carga inicial desde la casa vieja (una sola vez):
-- insert into "GP2".empleado (legajo, nombre, activo)
-- select "Legajo", "Nombre", ("Activo" = 'SI')
-- from public."Empleados"
-- on conflict (legajo) do nothing;
-- CHEQUEAR: nombre real de la columna Nombre en public."Empleados".

-- Despues de crearla:
--  * produccion.legajo deberia validarse contra empleado.legajo (FK o trigger).
--  * produccion_bundle ya devuelve una clave "empleados" (rendimiento_GP2.js la
--    consume): redefinirla para que salga de esta tabla en vez del embebido.


-- ----------------------------------------------------------------------------
-- 2. Persistencia de Verificacion: ruta_confirmada / ruta_problema
--    Equivalentes GP2 de public."Rutas_Confirmadas" y "Rutas_Problemas".
--    En GP2 la ruta ya vive en ruta/ruta_paso, asi que NO copiamos ruta_json:
--    referenciamos ruta.id y conservamos la firma para deduplicar re-trazados.
-- ----------------------------------------------------------------------------
create table if not exists "GP2".ruta_confirmada (
  id            bigint generated always as identity primary key,
  ruta_id       bigint not null references "GP2".ruta(id) on delete cascade,
  firma         text not null unique,
  confirmado_por text not null,
  confirmado_en timestamptz not null default now()
);

create table if not exists "GP2".ruta_problema (
  id            bigint generated always as identity primary key,
  ruta_id       bigint not null references "GP2".ruta(id) on delete cascade,
  firma         text not null,
  problema      text not null default '(pendiente de revisar)',
  estado        text not null default 'pendiente'
                check (estado in ('pendiente','resuelto')),
  reportado_por text not null,
  reportado_en  timestamptz not null default now(),
  resuelto_en   timestamptz
);

create index if not exists ruta_problema_estado_idx on "GP2".ruta_problema (estado);

-- Migracion del historial viejo: mapear por firma. La firma legacy es
-- "F:<fleje>|tipo:label|..." — CHEQUEAR si ruta/ruta_paso permiten reconstruir
-- la misma firma; si no, guardar la firma legacy tal cual y matchear por fleje.
-- Ampliar verificacion_bundle() para devolver estas dos tablas y agregar RPCs:
--   ruta_confirmar(p_ruta_id, p_firma, p_usuario)
--   ruta_reportar(p_ruta_id, p_firma, p_problema, p_usuario)
--   ruta_resolver(p_id)


-- ----------------------------------------------------------------------------
-- 3. crear_entrega_tallerista — la puerta que falta
--    Existe crear_envio_tallerista pero no su inversa: la entrega del
--    tallerista (Recepcion Cervantes/Virgilio), el flujo mas usado del sistema.
--    BORRADOR espejado en crear_envio_tallerista; CHEQUEAR contra su cuerpo
--    real (convenciones de tipo_mov, ubicaciones y unidades) antes de aplicar.
-- ----------------------------------------------------------------------------
create or replace function "GP2".crear_entrega_tallerista(
  p_tallerista_id bigint,
  p_comp_id       bigint,
  p_cantidad      numeric,
  p_unidad        text,
  p_fecha         timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = "GP2"
as $$
declare
  v_ubic_tall  bigint;
  v_ubic_dest  bigint;
  v_mov_id     bigint;
begin
  -- ubicacion del tallerista (origen de la entrega)
  select id into v_ubic_tall
  from ubicacion where tipo = 'tallerista' and ref = p_tallerista_id;
  if v_ubic_tall is null then
    return jsonb_build_object('ok', false, 'error', 'tallerista sin ubicacion');
  end if;

  -- destino: la ubicacion-sector del sector del componente
  select u.id into v_ubic_dest
  from componente c join ubicacion u on u.tipo = 'sector' and u.ref = c.sector_id
  where c.id = p_comp_id;
  -- CHEQUEAR: nombre real de la col sector en componente (sector_id vs s).
  if v_ubic_dest is null then
    return jsonb_build_object('ok', false, 'error', 'componente sin sector/ubicacion');
  end if;

  insert into movimiento
    (fecha, tipo_mov, comp_id, ubic_origen_id, ubic_destino_id, cantidad, unidad_origen, unidad_destino)
  values
    (coalesce(p_fecha, now()), 'entrega_tallerista', p_comp_id, v_ubic_tall, v_ubic_dest,
     p_cantidad, coalesce(p_unidad,'uni'), coalesce(p_unidad,'uni'))
  returning id into v_mov_id;
  -- Los triggers fn_movimiento_calc / fn_movimiento_aplicar actualizan inventario.
  -- CHEQUEAR: el valor exacto de tipo_mov que esos triggers esperan.

  -- GRJ: si el componente tiene sub-BOM (componente_bom), el descuento de sus
  -- componentes deberia salir de ahi. CHEQUEAR si los triggers ya lo hacen o si
  -- hay que explotar el BOM aca (un movimiento por componente hijo).

  return jsonb_build_object('ok', true, 'movimiento_id', v_mov_id);
end $$;

-- NOTA espejo a la casa vieja: existe fn_espejo_entrega_tallerista (trigger).
-- CHEQUEAR sobre que tabla esta colgado y si esta entrega lo dispara, para que
-- Entregas Tallerista Virgilio (public) siga viendo lo que entra por GP2
-- mientras convivan las dos casas.


-- ----------------------------------------------------------------------------
-- 4. Limpieza
-- ----------------------------------------------------------------------------
-- 4a. Backups de migracion fuera del schema productivo:
-- drop table "GP2"._bak_ruta_paso_transitos;
-- drop table "GP2"._bak_maxcomp_transitos;
-- (o: alter table ... set schema backups; -- si se quiere conservar)

-- 4b. fleje_detalle_upsert esta DUPLICADA (6 args y 8 args). Dejar solo la de
-- 8 args (parametros nuevos con default) y dropear la vieja:
-- drop function "GP2".fleje_detalle_upsert(bigint, text, text, numeric, numeric, text);
-- CHEQUEAR antes cual llama el front cuando se conecte flejes_bundle.


-- ----------------------------------------------------------------------------
-- 5. Consultas de verificacion (correr ANTES de aplicar 3 y despues de todo)
-- ----------------------------------------------------------------------------
-- Cuerpos de las funciones clave:
-- select proname, pg_get_functiondef(p.oid)
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'GP2'
--   and proname in ('crear_envio_tallerista','fn_movimiento_calc',
--                   'fn_movimiento_aplicar','fn_espejo_entrega_tallerista',
--                   'fn_espejo_produccion','movimientos_bundle','stock_bundle');
--
-- Columnas reales de componente / movimiento / ubicacion:
-- select table_name, column_name, data_type from information_schema.columns
-- where table_schema = 'GP2'
--   and table_name in ('componente','movimiento','ubicacion','produccion')
-- order by table_name, ordinal_position;
--
-- RLS y grants (GP2 concentra todo el stock en inventario/movimiento):
-- select c.relname, c.relrowsecurity
-- from pg_class c join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'GP2' and c.relkind = 'r';
