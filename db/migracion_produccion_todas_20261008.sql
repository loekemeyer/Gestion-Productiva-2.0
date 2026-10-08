-- =============================================================================================
-- 2026-10-08 — Los informes de GP2 leen también la producción de Registro Producción 3.0
-- [Elías, 08/10: «3 si. y revisa que otras cosas en GP lo usan o usaban, para también actualizarlo»]
--
-- Desde el 08/10 los operarios de Cervantes (y la tablet de GP2, que es copia de 3.0) graban en
-- reg_prod_3_0.procesado_cervantes, no en "GP2".produccion. A "GP2".produccion sólo le llega la
-- Carga Manual (registrar_produccion). Sin esto, los informes se iban quedando sin datos.
--
-- 1) "GP2".v_produccion_todas = "GP2".produccion + reg_prod_3_0.produccion_gp2 (la vista que 3.0
--    expone con las columnas de GP2). Los registros de 3.0 llevan el id NEGATIVO (-id): los dos
--    lados numeran por su cuenta y chocan (3.0 tiene el 19 y el 20; GP2 va del 235 al 7524).
--    Columna `fuente`: 'gp2' | 'reg_prod_3_0'.
--    Es el ÚNICO punto donde GP2 lee reg_prod_3_0 para informes (excepción a la Regla 0, decidida
--    por Elías el 08/10). SELECT sólo para `authenticated`: las 4 pantallas que la leen directo
--    entran con Gmail (auth-guard), y así la producción de 3.0 no queda a la vista de la clave pública.
-- 2) Las 2 RPC que ESCRIBEN sobre un registro desde la oficina (marcar_revisado, anular_produccion)
--    reciben ese id: negativo → reg_prod_3_0.procesado_cervantes (id = -row_id).
-- 3) Los 8 bundles de informes pasan de `from "GP2".produccion` a `from "GP2".v_produccion_todas`
--    (reemplazo textual sobre pg_get_functiondef; frena si la cantidad de lecturas no es la esperada).
--
-- NO se tocan, a propósito:
--  - registrar_produccion (Carga Manual): sigue escribiendo en "GP2".produccion.
--  - registrar_evento_prod, anular_evento_prod, cerrar_rollo, registro_operarios_bundle: la tablet
--    vieja; anotadas para borrar (db/PENDIENTE_borrar_funciones_tablet_vieja.sql).
--  - Registro_GP2.html («Últimos registros» de la Carga Manual): lista lo que se cargó ahí.
-- =============================================================================================

-- 1) la vista
create or replace view "GP2".v_produccion_todas as
select p.id, p.fecha, p.legajo, p.nombre_empleado, p.matriz_raw, p.nombre_matriz, p.matriz_id,
       p.uni, p.premio, p.tiempo_toma, p.tiempo_historico, p.hora_inicio, p.hora_fin,
       p.anular_tiempo, p.segundos_historico, p.segundos_trabajados, p.segundos_tiempo_muerto,
       p.dia, p.mes, p.quincena, p.id_ejecucion, p.eliminar, p.revisado, p.origen_created_at,
       p.golpes, p.uni_x_golpe, 'gp2'::text as fuente
  from "GP2".produccion p
union all
select -r.id, r.fecha, r.legajo, r.nombre_empleado, r.matriz_raw, r.nombre_matriz, r.matriz_id,
       r.uni, r.premio, r.tiempo_toma, r.tiempo_historico, r.hora_inicio, r.hora_fin,
       r.anular_tiempo, r.segundos_historico, r.segundos_trabajados, r.segundos_tiempo_muerto,
       r.dia, r.mes, r.quincena, r.id_ejecucion, r.eliminar, r.revisado, r.origen_created_at,
       r.golpes, r.uni_x_golpe, 'reg_prod_3_0'::text
  from reg_prod_3_0.produccion_gp2 r;

comment on view "GP2".v_produccion_todas is
  'Producción de GP2 ("GP2".produccion: Carga Manual + historia de la tablet vieja) + la de Registro Producción 3.0 (reg_prod_3_0.produccion_gp2, id NEGATIVO). Fuente única de los informes desde el 08/10/2026.';

revoke all on "GP2".v_produccion_todas from public, anon;
grant select on "GP2".v_produccion_todas to authenticated;

-- 2) las 2 que escriben sobre un registro
CREATE OR REPLACE FUNCTION "GP2".marcar_revisado(row_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
begin
  perform "GP2"._exigir_autorizado();  -- seguridad punto 1 fase B (2026-09-28)
  -- id negativo = registro de Registro Producción 3.0 (v_produccion_todas lo expone como -id; 2026-10-08)
  if row_id < 0 then
    update reg_prod_3_0.procesado_cervantes set revisado = true where id = -row_id;
  else
    update produccion set revisado = true where id = row_id;
  end if;
  if not found then
    raise exception 'Registro id=% no encontrado', row_id;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION "GP2".anular_produccion(row_id bigint, p_hora_inicio text DEFAULT NULL::text, p_hora_fin text DEFAULT NULL::text, p_seg_tiempo_muerto numeric DEFAULT 0, p_uni numeric DEFAULT 0, p_seg_trabajados numeric DEFAULT 0, p_seg_historico numeric DEFAULT 0, p_premio numeric DEFAULT 0, p_anular boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
begin
  perform "GP2"._exigir_autorizado();  -- seguridad punto 1 fase B (2026-09-28)
  -- id negativo = registro de Registro Producción 3.0 (v_produccion_todas lo expone como -id; 2026-10-08)
  if row_id < 0 then
    update reg_prod_3_0.procesado_cervantes
    set hora_inicio = p_hora_inicio::time,
        hora_fin = p_hora_fin::time,
        segundos_tiempo_muerto = p_seg_tiempo_muerto,
        uni = p_uni,
        segundos_trabajados = p_seg_trabajados,
        segundos_historico = p_seg_historico,
        premio = p_premio,
        anular_tiempo = p_anular,
        revisado = case when p_anular then true else revisado end
    where id = -row_id;
  else
    update produccion
    set hora_inicio = p_hora_inicio::time,
        hora_fin = p_hora_fin::time,
        segundos_tiempo_muerto = p_seg_tiempo_muerto,
        uni = p_uni,
        segundos_trabajados = p_seg_trabajados,
        segundos_historico = p_seg_historico,
        premio = p_premio,
        anular_tiempo = p_anular,
        revisado = case when p_anular then true else revisado end
    where id = row_id;
  end if;
  if not found then
    raise exception 'Registro id=% no encontrado', row_id;
  end if;
end;
$function$;

-- 3) los 8 informes
do $$
declare
  esperado jsonb := '{"alertas_bundle":3,"disruptivas_bundle":2,"informes_bundle":1,
    "informes_matriz_bundle":1,"inicio_bundle":3,"problemas_matrices_bundle":1,
    "produccion_bundle":3,"produccion_maestro_bundle":3}';
  f text; d text; n int; k int;
begin
  for f in select jsonb_object_keys(esperado) loop
    select count(*), min(pg_get_functiondef(p.oid)) into k, d
      from pg_proc p where p.pronamespace = '"GP2"'::regnamespace and p.proname = f;
    if k <> 1 then raise exception '%: hay % funciones con ese nombre', f, k; end if;
    n := (select count(*) from regexp_matches(d, '\yfrom\s+("GP2"\.)?produccion\y', 'g'));
    if n <> (esperado->>f)::int then
      raise exception '%: % lecturas de produccion, se esperaban %', f, n, esperado->>f;
    end if;
    execute regexp_replace(d, '\y(from\s+)("GP2"\.)?produccion\y', '\1"GP2".v_produccion_todas', 'g');
  end loop;
end $$;
