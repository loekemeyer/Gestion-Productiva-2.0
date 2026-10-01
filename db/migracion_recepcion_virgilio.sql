-- ============================================================================
-- Botón "→ Virgilio" en el control de cajas y en el pesaje de flejes.
-- Thomas, 2026-10-01 (versión tablet): "si el total del remito no entra en Cervantes
-- porque excede el espacio físico, no se baja del camión una parte de la mercadería y
-- va directo para Virgilio ... un botón en el control de cajas y flejes que se pueda
-- mandar una cantidad a Virgilio".
--
-- Modelo (A, confirmado por Thomas): el remito entra COMPLETO a Cervantes como compra
-- (así la O.C./factura cierra por el total comprado) y el botón traslada a Virgilio lo
-- que no bajó. El control compara después contra el ESPERADO = remito − lo de Virgilio,
-- así la diferencia deja de leerse como faltante.
--
-- Reusa enviar_a_virgilio (traslado sector → virgilio_sector) para no duplicar camino.
-- Aplicada a hrxfctzncixxqmpfhskv y probada en transacción abortada (caja 456, fleje 167):
-- caja remito 10000 → Virgilio 3000 → control 7000 deja Cervantes 7000 / Virgilio 3000 /
-- compra 10000; fleje igual. Verificación de inventario = 0 que no cierre.
-- ============================================================================

alter table "GP2".recepcion_insumo
  add column if not exists virgilio numeric not null default 0,
  add column if not exists virgilio_mov_id bigint references "GP2".movimiento(id) on delete set null;

comment on column "GP2".recepcion_insumo.virgilio is
  'Cantidad del remito que no entró a Cervantes y se trasladó directo a Virgilio (misma unidad que la recepción). La escribe recepcion_a_virgilio. El esperado-en-Cervantes del control = (cantidad_declarada|cantidad) - virgilio.';

-- recepcion_a_virgilio: fija cuánto de esta recepción se va a Virgilio (p_cantidad absoluto; 0 limpia).
create or replace function "GP2".recepcion_a_virgilio(
    p_recepcion_id bigint, p_cantidad numeric, p_usuario text default null)
  returns jsonb language plpgsql security definer set search_path to 'GP2'
as $function$
declare r "GP2".recepcion_insumo%rowtype; v_old numeric; v_remito numeric; v_counted numeric;
        v_res jsonb; v_mov bigint;
begin
  perform "GP2"._exigir_autorizado();
  if p_cantidad is null or p_cantidad < 0 then raise exception 'La cantidad a Virgilio no puede ser negativa'; end if;
  select * into r from "GP2".recepcion_insumo where id = p_recepcion_id;
  if not found then raise exception 'Recepción % no existe', p_recepcion_id using errcode='P0002'; end if;
  v_old := coalesce(r.virgilio, 0);
  v_remito := coalesce(r.cantidad_declarada, r.cantidad);
  if p_cantidad > v_remito then
    raise exception 'A Virgilio (%) no puede superar lo del remito (%)', p_cantidad, v_remito;
  end if;

  -- 1) sacar el traslado anterior (el trigger de DELETE devuelve el stock a Cervantes y lo quita de Virgilio)
  if r.virgilio_mov_id is not null then delete from "GP2".movimiento where id = r.virgilio_mov_id; end if;

  -- 2) si ya está controlado, la cantidad guardada es (contado + virgilio_anterior). El contado físico
  --    no cambia; cantidad/compra se mueven con virgilio para que Cervantes quede siempre en el contado.
  if coalesce(r.controlado, false) then
    v_counted := r.cantidad - v_old;
    update "GP2".recepcion_insumo set cantidad = v_counted + p_cantidad where id = p_recepcion_id;
    if r.movimiento_id is not null then
      update "GP2".movimiento set cantidad = v_counted + p_cantidad where id = r.movimiento_id;
    end if;
  end if;
  -- (sin controlar: cantidad = remito entero, que ya incluye lo de Virgilio; no se toca)

  -- 3) traslado nuevo a Virgilio (reusa enviar_a_virgilio: sector -> virgilio_sector)
  if p_cantidad > 0 then
    v_res := "GP2".enviar_a_virgilio(r.componente_id, p_cantidad, r.unidad, now(),
               'A Virgilio desde recepción '||p_recepcion_id||coalesce(' · remito '||r.remito,''));
    v_mov := (v_res->>'movimiento_id')::bigint;
  end if;

  update "GP2".recepcion_insumo set virgilio = p_cantidad, virgilio_mov_id = v_mov where id = p_recepcion_id;
  return jsonb_build_object('ok', true, 'recepcion_id', p_recepcion_id, 'virgilio', p_cantidad,
    'virgilio_mov_id', v_mov, 'traslado', v_res);
end $function$;

-- Seguridad fase B (2026-09-28): una RPC que ESCRIBE va para authenticated (no anon) y exige
-- usuario con _exigir_autorizado(). Igual que enviar_a_virgilio / controlar_recepcion_cajas.
revoke execute on function "GP2".recepcion_a_virgilio(bigint, numeric, text) from public, anon;
grant execute on function "GP2".recepcion_a_virgilio(bigint, numeric, text) to authenticated;

-- controlar_recepcion_cajas y control_recepcion_bundle: ver db/funciones_GP2.sql (suman virgilio).
-- v_recepcion_control: ver db/vistas_GP2.sql (expone virgilio + kg_esperado_cervantes y resta virgilio
-- del dif_kg_vs_remito). Ambos reaplicados en la base el 2026-10-01.
