-- =====================================================================
-- VALIDACION DE STOCK · REMITO VS CONTROL (2026-09-30)
-- [usuario 2026-09-30, textual: "Dentro de validación stock quiero que haya un módulo para validar
--  lo del conteo vs lo que hay cargado en el sistema y otro módulo para validar lo que se anoto en
--  el remito vs lo que se controlo (en todas las recepciones de version tablet) entonces todas las
--  diferencias entre remito y control se define que queda como ingreso real en este módulo"].
--
-- EL MISMO CRITERIO QUE EL CONTEO: dos roles. El operario de la tablet carga el REMITO y despues
-- CONTROLA (cuenta/pesa); el OPERADOR DEL SISTEMA decide, en Validacion de Stock, cual de los dos
-- numeros queda como INGRESO REAL. Contar y decidir son cosas distintas.
--
-- QUE NO CAMBIA: el control de la tablet sigue pisando el movimiento (controlar_entrega,
-- controlar_recepcion_kg / _cajas), asi que mientras nadie valida el stock ya esta con lo
-- CONTROLADO. Por eso el default de la validacion es "control": elegir control no mueve el stock,
-- elegir remito vuelve el movimiento a lo que decia el papel (los triggers de movimiento
-- recalculan el inventario, igual que cuando controla la tablet).
--
-- ALCANCE: las recepciones de la tablet que TIENEN control con numero propio:
--   entrega_ps / entrega_tallerista  -> GP2.entrega_control (declarado vs controlado)
--   compra (prov. de insumos)         -> GP2.recepcion_insumo (cantidad_declarada vs cantidad)
-- Fuera: prov. de art. terminado y Virgilio (la tablet no les hace control) y el pesaje por pallet
-- de flejes (no pisa el stock ni marca controlado: es un chequeo de tara, no un conteo).
-- =====================================================================

-- ---------- 1) la decision, en la fila del control (1 a 1, sin tabla nueva) ----------
alter table "GP2".entrega_control
  add column if not exists ingreso_real text,
  add column if not exists validado_en  timestamptz,
  add column if not exists validado_por text;
alter table "GP2".entrega_control drop constraint if exists entrega_control_ingreso_real_check;
alter table "GP2".entrega_control add constraint entrega_control_ingreso_real_check
  check (ingreso_real is null or ingreso_real in ('control','remito'));
comment on column "GP2".entrega_control.ingreso_real is 'Lo que decidio el operador del sistema en Validacion de Stock (Remito vs Control): ''control'' = queda lo contado (es lo que ya piso el control), ''remito'' = el movimiento vuelve a lo declarado. null = todavia no se valido. Si el control es posterior a validado_en, la validacion vuelve a quedar pendiente.';
comment on column "GP2".entrega_control.validado_en  is 'Cuando se valido (Validacion de Stock, modulo Remito vs Control).';
comment on column "GP2".entrega_control.validado_por is 'Quien valido (localStorage gp2_usuario de la pantalla).';

alter table "GP2".recepcion_insumo
  add column if not exists ingreso_real text,
  add column if not exists validado_en  timestamptz,
  add column if not exists validado_por text;
alter table "GP2".recepcion_insumo drop constraint if exists recepcion_insumo_ingreso_real_check;
alter table "GP2".recepcion_insumo add constraint recepcion_insumo_ingreso_real_check
  check (ingreso_real is null or ingreso_real in ('control','remito'));
comment on column "GP2".recepcion_insumo.ingreso_real is 'Lo que decidio el operador del sistema en Validacion de Stock (Remito vs Control): ''control'' = el movimiento queda con cantidad (lo contado), ''remito'' = el movimiento vuelve a cantidad_declarada. cantidad NO se toca: sigue siendo lo contado. null = sin validar.';
comment on column "GP2".recepcion_insumo.validado_en  is 'Cuando se valido (Validacion de Stock, modulo Remito vs Control).';
comment on column "GP2".recepcion_insumo.validado_por is 'Quien valido (localStorage gp2_usuario de la pantalla).';

-- ---------- 2) lo que ve la pantalla ----------
CREATE OR REPLACE FUNCTION "GP2".validacion_remito_bundle(p_dias integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
with ent as (
  -- entregas de P.S. y talleristas controladas. declarado y controlado estan en la MISMA magnitud
  -- (la pieza que entro: cantidad_transformada en el P.S., cantidad en el tallerista).
  select 'entrega'::text as origen, c.id, c.movimiento_id as mov_id, m.fecha,
         case m.tipo_mov when 'entrega_ps' then 'proveedor_servicio' else 'tallerista' end as cp_tipo,
         coalesce(ps.nombre, t.nombre, u.nombre) as cp_nombre, null::text as remito_nro,
         k.codigo, k.descripcion, c.declarado_unidad as unidad,
         c.declarado as remito, c.controlado as control,
         c.controlado_en, c.controlado_por, c.ingreso_real, c.validado_en, c.validado_por
    from entrega_control c
    join movimiento m on m.id = c.movimiento_id
    join componente k on k.id = coalesce(m.comp_transformado_id, m.comp_id)
    left join ubicacion u on u.id = m.ubic_origen_id
    left join proveedor_servicio ps on u.tipo = 'proveedor_servicio' and ps.id = u.ref_id
    left join tallerista t on u.tipo = 'tallerista' and t.id = u.ref_id
), ins as (
  -- insumos controlados: el remito es cantidad_declarada (lo guarda el primer control), lo
  -- contado es cantidad (controlar_recepcion_kg / _cajas la pisan).
  select 'insumo'::text, r.id, r.movimiento_id, r.fecha, 'proveedor_insumo'::text,
         r.proveedor, r.remito, k.codigo, k.descripcion, r.unidad,
         coalesce(r.cantidad_declarada, r.cantidad), r.cantidad,
         r.controlado_en, r.controlado_por, r.ingreso_real, r.validado_en, r.validado_por
    from recepcion_insumo r
    join componente k on k.id = r.componente_id
   where coalesce(r.controlado, false)
), todo as (
  select x.*, round(x.control - x.remito, 3) as diff,
         -- PENDIENTE = hay diferencia y nadie la valido despues del ultimo control. Un re-control
         -- posterior a la validacion la vuelve a abrir (el control piso el movimiento de nuevo).
         (round(x.control, 3) <> round(x.remito, 3)
          and (x.validado_en is null or x.validado_en < coalesce(x.controlado_en, x.validado_en))) as pendiente
    from (select * from ent union all select * from ins) x
)
select jsonb_build_object(
  'generado_en', now(),
  'tol_pct', coalesce((select valor::numeric from parametro where clave = 'tol_ctrl_pct'), 5),
  -- las diferencias sin validar, TODAS (una diferencia pendiente no vence)
  'pend', coalesce((select jsonb_agg(jsonb_build_object(
        'origen', origen, 'id', id, 'mov_id', mov_id, 'fecha', fecha,
        'cp_tipo', cp_tipo, 'cp_nombre', cp_nombre, 'remito_nro', remito_nro,
        'codigo', codigo, 'descripcion', descripcion, 'unidad', unidad,
        'remito', remito, 'control', control, 'diff', diff,
        'controlado_en', controlado_en, 'controlado_por', controlado_por
      ) order by fecha desc, id desc) from todo where pendiente), '[]'::jsonb),
  -- lo ya validado, lo mas nuevo arriba
  'hechos', coalesce((select jsonb_agg(h order by ts desc) from (
      select jsonb_build_object(
        'origen', origen, 'id', id, 'fecha', fecha, 'cp_tipo', cp_tipo, 'cp_nombre', cp_nombre,
        'codigo', codigo, 'descripcion', descripcion, 'unidad', unidad,
        'remito', remito, 'control', control, 'diff', diff, 'ingreso_real', ingreso_real,
        'validado_en', validado_en, 'validado_por', validado_por) h, validado_en ts
        from todo
       where not pendiente and validado_en is not null
         and validado_en >= now() - make_interval(days => greatest(coalesce(p_dias, 30), 1))
       order by validado_en desc limit 50) z), '[]'::jsonb),
  -- de contexto: controles del periodo que coincidieron con el remito (no hay nada que decidir)
  'sin_diferencia', (select count(*) from todo
                      where diff = 0
                        and controlado_en >= now() - make_interval(days => greatest(coalesce(p_dias, 30), 1))),
  -- y lo que la tablet todavia no controlo: se valida DESPUES del control, no antes
  'sin_controlar', (select count(*) from movimiento m
                     where m.tipo_mov in ('entrega_ps','entrega_tallerista')
                       and not exists (select 1 from entrega_control c where c.movimiento_id = m.id))
                 + (select count(*) from recepcion_insumo r join componente k on k.id = r.componente_id
                     where not coalesce(r.controlado, false) and k.sector_id <> 5)
);
$function$;

-- ---------- 3) la decision ----------
-- p_items: [{origen:'entrega'|'insumo', id, ingreso_real:'control'|'remito'}]
-- Idempotente: deja el movimiento en el numero elegido (no "revierte"), asi re-validar no duplica.
CREATE OR REPLACE FUNCTION "GP2".validar_remito_control(p_items jsonb, p_usuario text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare
  it jsonb; v_origen text; v_id bigint; v_vale text; v_obj numeric; v_factor numeric;
  c entrega_control%rowtype; m movimiento%rowtype; r recepcion_insumo%rowtype;
  v_n int := 0; v_rem int := 0; v_movs int := 0; v_hijos int := 0; v_k int;
  v_usr text := nullif(btrim(coalesce(p_usuario, '')), '');
begin
  perform "GP2"._exigir_autorizado();
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'No hay nada para validar.';
  end if;

  for it in select value from jsonb_array_elements(p_items) loop
    v_origen := lower(coalesce(it->>'origen', ''));
    v_id     := nullif(it->>'id', '')::bigint;
    v_vale   := lower(coalesce(it->>'ingreso_real', ''));
    if v_vale not in ('control', 'remito') then
      raise exception 'Ingreso real invalido: "%". Tiene que ser control o remito.', v_vale;
    end if;

    if v_origen = 'entrega' then
      select * into c from entrega_control where id = v_id for update;
      if not found then raise exception 'El control de entrega % no existe.', v_id; end if;
      select * into m from movimiento where id = c.movimiento_id for update;
      v_obj := case v_vale when 'remito' then c.declarado else c.controlado end;

      if m.tipo_mov = 'entrega_ps' then
        -- mismo calculo que controlar_entrega: el SC consumido es la SP recibida en su canonica
        if coalesce(m.cantidad_transformada, m.cantidad) is distinct from v_obj then
          update movimiento
             set cantidad = to_canonical(m.comp_transformado_id, v_obj, c.declarado_unidad),
                 cantidad_transformada = v_obj
           where id = m.id;
          v_movs := v_movs + 1;
        end if;
      elsif m.tipo_mov = 'entrega_tallerista' then
        -- mismo criterio que controlar_entrega: los consumos (hijos) se escalan con el mismo
        -- factor [usuario 2026-09-23: "entrego 98 de 100 -> consumio 98"]
        if m.cantidad is distinct from v_obj then
          v_factor := v_obj / nullif(m.cantidad, 0);
          if v_factor is not null then
            update movimiento set cantidad = round(cantidad * v_factor, 6) where mov_padre_id = m.id;
            get diagnostics v_k = row_count;
            v_hijos := v_hijos + v_k;
          end if;
          update movimiento set cantidad = v_obj where id = m.id;
          v_movs := v_movs + 1;
        end if;
      else
        raise exception 'El movimiento % no es una entrega (es %).', m.id, m.tipo_mov;
      end if;
      -- los cajones no se tocan: son el envase CONTADO, un dato fisico, no el numero que se decide

      update entrega_control
         set ingreso_real = v_vale, validado_en = now(), validado_por = v_usr
       where id = v_id;

    elsif v_origen = 'insumo' then
      select * into r from recepcion_insumo where id = v_id for update;
      if not found then raise exception 'La recepcion % no existe.', v_id; end if;
      if not coalesce(r.controlado, false) then
        raise exception 'La recepcion % todavia no se controlo: primero el control, despues la validacion.', v_id;
      end if;
      v_obj := case v_vale when 'remito' then coalesce(r.cantidad_declarada, r.cantidad) else r.cantidad end;
      if r.movimiento_id is not null then
        update movimiento set cantidad = v_obj
         where id = r.movimiento_id and cantidad is distinct from v_obj;
        get diagnostics v_k = row_count;
        v_movs := v_movs + v_k;
      end if;
      update recepcion_insumo
         set ingreso_real = v_vale, validado_en = now(), validado_por = v_usr
       where id = v_id;

    else
      raise exception 'Origen invalido: "%". Tiene que ser entrega o insumo.', v_origen;
    end if;

    v_n := v_n + 1;
    if v_vale = 'remito' then v_rem := v_rem + 1; end if;
  end loop;

  return jsonb_build_object('ok', true, 'validados', v_n, 'al_remito', v_rem,
                            'movimientos_ajustados', v_movs, 'consumos_ajustados', v_hijos);
end $function$;

revoke all on function "GP2".validar_remito_control(jsonb, text) from public, anon;
grant execute on function "GP2".validar_remito_control(jsonb, text) to authenticated, service_role;
grant execute on function "GP2".validacion_remito_bundle(integer) to anon, authenticated, service_role;
