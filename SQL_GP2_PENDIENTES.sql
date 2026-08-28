-- ============================================================================
-- SQL_GP2_PENDIENTES.sql
-- Piezas que le faltan al schema GP2 para que todo el circuito funcione
-- internamente (sin depender de public). Detectadas en ANALISIS_GP2_2026-08-28.md.
--
-- ESTADO (2026-08-28):
--   §1 empleado             -> BORRADOR, no aplicado
--   §2 ruta_confirmada/..   -> BORRADOR, no aplicado
--   §3 crear_entrega_tallerista -> ✅ APLICADA Y PROBADA en la base
--   §4 limpieza             -> BORRADOR, no aplicado
--   §5 nombres reales del schema -> verificado contra la base
--
-- Los bloques marcados BORRADOR no se ejecutaron: revisarlos antes de aplicar.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. [BORRADOR] Tabla empleado (hoy no existe: el operario viene embebido en produccion)
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
-- 2. [BORRADOR] Persistencia de Verificacion: ruta_confirmada / ruta_problema
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
-- 3. crear_entrega_tallerista  ✅ APLICADA Y PROBADA EN LA BASE (2026-08-28)
--    Ya no es borrador: existe en GP2. Se deja el resumen como referencia.
--
--    Firma:
--      crear_entrega_tallerista(p_tallerista_id bigint, p_comp_id bigint,
--                               p_cantidad numeric, p_unidad text default 'uni',
--                               p_fecha timestamptz default now(),
--                               p_descontar_bom boolean default true) -> jsonb
--
--    Reglas (verificadas contra datos reales):
--    * Destino = ubicacion del sector del componente. Los 84 articulos terminados
--      (sector 12) NO tienen ubicacion de sector: van a la ubicacion tipo
--      'virgilio' (id 33). Ese cuarto tipo de ubicacion no estaba documentado.
--    * ARMADO (el componente tiene hijos en componente_bom, ej. GRJ10): el armado
--      NACE en la entrega -> el movimiento va SIN origen y solo se descuentan las
--      partes de la ubicacion del tallerista, con tipo_mov 'consumo_armado'.
--      Descontar el armado ademas de sus partes contaba doble (bug corregido).
--    * PARTE SIN BOM: sale de la ubicacion del tallerista hacia el sector, normal.
--
--    Prueba ejecutada y revertida (GRJ10 de Carlos Aguirre, 100 uni):
--      GRJ10 -> Sector Garage +100 | LL7B -100 | E4 -300 (x3 OK) | E5 -100 | LLF8 -100
--      GRJ10 en el tallerista quedo en 0 (no se descuenta dos veces).
--      LL7B suelto (40 uni) -> Sector Crudo +40, tallerista -40.
--    Al borrar los movimientos el inventario volvio exactamente a cero: los
--    triggers revierten bien en DELETE.
--
--    FALTA para cerrar el circuito de talleristas:
--      * Devolucion (lo que el tallerista devuelve sin procesar).
--      * Prov. Art. Terminado (envios/entregas/control).
--      * UI: ninguna pantalla llama todavia a esta funcion.

-- ----------------------------------------------------------------------------
-- 4. [BORRADOR] Limpieza
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
-- 5. Nombres REALES del schema (verificados 2026-08-28) — ojo, no coinciden
--    con los nombres cortos que devuelven los bundles.
-- ----------------------------------------------------------------------------
--  componente     : id, codigo, descripcion, sector_id, unidad_medida, kg_x_uni, uni_x_cajon
--  ubicacion      : id, tipo, ref_id, nombre, meses_minimo
--                   tipo ∈ sector | tallerista | proveedor_servicio | virgilio
--  inventario     : id, componente_id, ubicacion_id, cantidad, minimo, actualizado_en
--  movimiento     : id, fecha, tipo_mov, comp_id, ubic_origen_id, ubic_destino_id,
--                   cantidad, comp_transformado_id, cantidad_transformada,
--                   unidad_origen, unidad_destino, _delta_orig, _delta_dest
--  componente_bom : id, componente_padre_id, componente_hijo_id, cantidad
--  tallerista     : id, cod_prov, nombre, clase
--
--  tipo_mov en uso: compra, envio_ps, envio_tallerista, fabricacion,
--                   entrega_tallerista y consumo_armado (nuevos).
--                   crear_entrega_ps escribe 'entrega_ps' (aun sin datos).
--
--  ⚠ INCONSISTENCIA A VIGILAR: crear_envio_ps, crear_entrega_ps y
--    crear_envio_tallerista buscan la ubicacion del sector por NOMBRE
--    (where tipo='sector' and nombre=<sector.nombre>), mientras que
--    crear_recepcion_insumo y crear_entrega_tallerista la buscan por
--    ref_id (where tipo='sector' and ref_id=<sector.id>). Hoy dan igual
--    porque ref_id = sector.id y nombre = sector.nombre en las 11 filas,
--    pero renombrar un sector rompe las tres primeras. Unificar por ref_id.
--
--  uni_x_cajon SI existe en componente (228 componentes lo tienen cargado):
--    la columna Cajon es reproducible, no hace falta inventarla.

-- ----------------------------------------------------------------------------
-- 6. Consultas de verificacion
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


-- ============================================================================
-- 7. RECEPCION DE INSUMOS EN DOS PASOS  ✅ APLICADO Y PROBADO (2026-08-28)
--    Rehecho segun el proceso real de la fabrica, que NO es el que implementa
--    el modulo viejo (StockFlejes/recepcion.html).
-- ============================================================================
--
-- PROCESO REAL (contado por el usuario):
--   PASO 1 — CARGA. Reciben y marcan TODO lo que llega, SIN controlar.
--     * Se mira el remito contra la OC; lo primero que se compara son los kg.
--     * Aperam y Basconia informan kg Y cantidad de rollos por fleje.
--       El resto de proveedores informa solo kg.
--     * En este paso NO se pesa nada y NO se pide desglose por rollo.
--   PASO 2 — CONTROL EN BALANZA. Despues, aparte:
--     * Llevan el pallet a la balanza y anotan el peso total palletizado.
--     * Anotan cuantos rollos hay y cuanto pesa cada rollo.
--     * Lo normal es que todos los rollos pesen igual (una sola linea).
--       Puede haber dos pesos distintos en el mismo pallet, pero es raro.
--
-- LOS DOS CHEQUEOS DEL CONTROL:
--   1) rollos sin clasificar = rollos del remito - rollos contados  ->  debe dar 0
--   2) sobrante = peso_balanza - suma(cantidad * kg_por_rollo)
--      debe caer entre 4 y 8 kg por pallet (es la tara del pallet).
--      Menos de 4 -> 'sobrante bajo'. Mas de 8 -> 'sobrante alto'.
--
-- POR QUE EL MODULO VIEJO ESTA MAL:
--   * Obliga a controlar MIENTRAS se carga: en Flejes abre el popup de "kg
--     estipulados" antes de dejar cargar los kg reales, y frena con un confirm
--     si difiere mas del 5%. El proceso real carga primero y controla despues.
--   * Pide el desglose peso por peso EN LA CARGA, cuando ese dato recien
--     aparece en la balanza (paso 2).
--   * La grilla de rollos aparece para todos los flejes, no solo para los
--     proveedores que informan rollos.
--   * Tiene TRES umbrales distintos y contradictorios para lo mismo:
--     0,05 kg absolutos (cartel en pantalla), 5% relativo (confirm que frena)
--     y otro 5% (alerta de Telegram posterior).
--   * El total viaja como string por el DOM: una suma tipo 3*1,1 se guarda
--     literal como '3.3000000000000003'.
--   * 'rollos' y 'rollos_json' guardan cosas distintas segun el rubro
--     (rollos en Flejes, paquetes en Cajas/Cartones; array u objeto).
--
-- LO QUE SE CREO EN GP2:
--   recepcion_insumo.rollos (integer, null si el remito no los informa)
--   recepcion_control       (recepcion_id unique, peso_balanza, pallets,
--                            controlado_por, controlado_en, nota)
--   recepcion_control_rollo (control_id, cantidad, kg_por_rollo)
--   parametro               (tara_pallet_min=4, tara_pallet_max=8)
--   v_recepcion_control     (vista con los dos chequeos ya calculados y un
--                            campo 'estado': sin controlar | rollos sin
--                            clasificar | sobrante bajo | sobrante alto | ok)
--   cargar_recepcion(p_comp_id,p_proveedor,p_cantidad,p_unidad,p_remito,
--                    p_rollos,p_fecha)            -> paso 1
--   guardar_control_recepcion(p_recepcion_id,p_peso_balanza,p_rollos jsonb,
--                    p_pallets,p_usuario,p_nota)  -> paso 2
--   recepcion_bundle()      -> insumos + proveedores + recepciones + tara
--
-- PRUEBAS EJECUTADAS Y REVERTIDAS (fleje A1, Basconia, 150 kg, 6 rollos):
--   A) 6x25=150, balanza 156  -> sobrante 6, sin clasificar 0   -> ok
--   B) 4x25 + 2x25 (dos tipos) -> tipos_de_peso 2                -> ok
--   C) solo 5 de 6 clasificados -> sin clasificar 1  -> 'rollos sin clasificar'
--   D) balanza 151 -> sobrante 1  -> 'sobrante bajo'
--   E) balanza 170 -> sobrante 20 -> 'sobrante alto'
--   End-to-end via RPC: paso 1 movio stock (movimiento compra -> Sector Fleje)
--   y paso 2 devolvio estado ok. Todo borrado despues; el stock volvio exacto.
--
-- PENDIENTE:
--   * Las dos pantallas (carga y control). Ninguna UI llama a estas RPC todavia.
--   * Confirmar con el usuario si se pesa UN pallet por vez (sobrante 4-8) o
--     varios juntos (sobrante 4-8 x pallets). La columna 'pallets' ya lo
--     contempla, default 1.
--   * OJO: hay componentes con el MISMO codigo en sectores distintos (ej. 'A1'
--     existe en Sector Fleje y en otro). Cualquier busqueda por codigo tiene
--     que desambiguar por sector o usar comp_id.
