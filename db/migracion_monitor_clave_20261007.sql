-- =====================================================================
-- MONITOR · CÓDIGO DE INGRESO (2026-10-07)
-- [usuario 2026-10-07, textual: "mira el repo GT y copia la forma de hacer el monitor y añadi el
--  modulo de monitor" + captura del Monitor de GT Admin: el código de 4 dígitos grande con la rueda].
--
-- COPIA LA FORMA DE loekemeyer/GT (sql/gt_schema_v3.sql): 4 dígitos que CAMBIAN CADA MINUTO, sacados
-- de la hora y de una semilla propia; vale también el del minuto anterior; el monitor lo muestra con
-- una rueda de cuenta regresiva y el celular lo tipea para entrar estando en la planta.
--   GT:  gt.clave_de(tramo) · public.gt_clave_actual() · public.gt_clave_validar(codigo)
--   GP2: "GP2"._monitor_clave_de(tramo) · "GP2".monitor_clave_actual() · "GP2".monitor_clave_validar(codigo)
--
-- DIFERENCIAS CON GT, A PROPÓSITO:
--   1) La semilla es propia (':gp2-clave:'): el código de GP2 nunca coincide con el de GT (mismo proyecto
--      de Supabase, mismo system_identifier) ni con el de la TV de Virgilio.
--   2) GT pide una CLAVE DE MONITOR compartida (gt.config.monitor_pass, bcrypt) y la renueva los lunes.
--      Acá NO hay clave compartida: ver el código exige una sesión de un MAIL HABILITADO
--      ("GP2"._exigir_autorizado(), la misma whitelist del login). El monitor es una pantalla del menú.
--      Por eso monitor_clave_actual NO se le da a anon (en GT hubo que revocarle gt_clave_actual a anon
--      para que el código no se leyera salteando la pantalla).
--   3) No hay tabla de ingresos ni aviso de Telegram: eso de GT es de su clave compartida del lunes.
--
-- ⚠ NO ES UN CANDADO (igual que en GT): el que valida (monitor_clave_validar) está abierto a anon a
--   propósito, porque el operario que tipea el código no tiene sesión. Devuelve SÓLO {ok}. Sirve para que
--   se entre estando en la planta, no para proteger datos. Nada lo llama todavía: lo usará la app de
--   registro de producción (otro repo).
--
-- Rollback:
--   drop function "GP2".monitor_clave_actual(), "GP2".monitor_clave_validar(text), "GP2"._monitor_clave_de(bigint);
-- =====================================================================

-- ---------- _monitor_clave_de: el código de cada minuto (interna) ----------
create or replace function "GP2"._monitor_clave_de(p_tramo bigint)
 returns text
 language sql
 stable security definer
 set search_path to 'GP2', 'pg_temp'
as $function$
  select lpad(((('x' || substr(md5((select system_identifier from pg_catalog.pg_control_system())::text
                 || ':gp2-clave:' || p_tramo::text), 1, 8))::bit(32)::bigint) % 10000)::text, 4, '0');
$function$;
revoke all on function "GP2"._monitor_clave_de(bigint) from public, anon, authenticated;

-- ---------- monitor_clave_actual: lo que muestra la pantalla (sólo mail habilitado) ----------
create or replace function "GP2".monitor_clave_actual()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'GP2', 'pg_temp'
as $function$
begin
  perform "GP2"._exigir_autorizado();
  return jsonb_build_object(
    'clave', "GP2"._monitor_clave_de(floor(extract(epoch from now()) / 60)::bigint),
    'cambia_en_s', 60 - (floor(extract(epoch from now()))::bigint % 60));
end $function$;
revoke all on function "GP2".monitor_clave_actual() from public, anon;
grant execute on function "GP2".monitor_clave_actual() to authenticated;

-- ---------- monitor_clave_validar: el operario tipea el código (abierta a anon, sólo {ok}) ----------
create or replace function "GP2".monitor_clave_validar(p_clave text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'GP2', 'pg_temp'
as $function$
declare
  v_t bigint := floor(extract(epoch from now()) / 60)::bigint;
  v_c text := regexp_replace(coalesce(p_clave, ''), '\D', '', 'g');
begin
  -- vale el de este minuto y el del anterior (el operario lo lee, camina y lo tipea)
  if v_c = '' or (v_c <> "GP2"._monitor_clave_de(v_t) and v_c <> "GP2"._monitor_clave_de(v_t - 1)) then
    return jsonb_build_object('ok', false);
  end if;
  return jsonb_build_object('ok', true);
end $function$;
revoke all on function "GP2".monitor_clave_validar(text) from public;
grant execute on function "GP2".monitor_clave_validar(text) to anon, authenticated;
