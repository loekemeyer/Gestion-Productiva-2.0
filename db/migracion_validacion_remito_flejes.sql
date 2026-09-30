-- =====================================================================
-- VALIDACION DE STOCK · REMITO VS CONTROL — TAMBIEN LOS FLEJES (2026-09-30, segundo pase)
-- [usuario 2026-09-30, sobre si el pesaje de flejes entraba: "Sí, entran todas las recepciones xq
--  todas tienen control"].
--
-- EL CONTROL DEL FLEJE ES EL PESAJE POR PALLET (pesar_pallet -> recepcion_control +
-- recepcion_control_rollo). A diferencia del resto, ese control NO pisa el movimiento ni marca
-- recepcion_insumo.controlado: el stock sigue con los kg del REMITO. Por eso aca el fleje es un
-- origen propio, 'pesaje', y elegir "Control" SI mueve el stock (lo lleva a los kg pesados).
--
-- QUE NUMERO ES "LO CONTROLADO" — el mismo que ya usa v_control_pallet para juzgar el pallet:
--   modo_control 'peso_total'             -> la balanza (peso_balanza_total), que se compara
--                                            directo contra el remito;
--   'pesaje' / 'rollos_remito' (el resto) -> los rollos contados x su kg por rollo (kg_rollos); la
--                                            balanza sirve para chequear la tara del pallet.
-- Solo entra un pesaje COMPLETO: al menos un pallet pesado, ningun pallet sin pesar y ningun rollo
-- sin clasificar (estado de v_recepcion_control). Solo en kg: el pesaje es en kg y v_control_pallet
-- ya compara contra recepcion_insumo.cantidad asumiendo kg.
--
-- recepcion_insumo.cantidad NO se toca: para el fleje sigue siendo los kg del remito, que es lo que
-- lee v_recepcion_control (kg_remito). La decision vive en ingreso_real y en el movimiento.
--
-- Y el bundle manda en_stock (lo que tiene HOY el movimiento, en la misma magnitud) para que la
-- pantalla diga cuantas decisiones cambian el stock: en el fleje es al reves que en el resto.
-- =====================================================================

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
         case when m.tipo_mov = 'entrega_ps' then coalesce(m.cantidad_transformada, m.cantidad)
              else m.cantidad end as en_stock,
         c.controlado_en, c.controlado_por, c.ingreso_real, c.validado_en, c.validado_por
    from entrega_control c
    join movimiento m on m.id = c.movimiento_id
    join componente k on k.id = coalesce(m.comp_transformado_id, m.comp_id)
    left join ubicacion u on u.id = m.ubic_origen_id
    left join proveedor_servicio ps on u.tipo = 'proveedor_servicio' and ps.id = u.ref_id
    left join tallerista t on u.tipo = 'tallerista' and t.id = u.ref_id
), ins as (
  -- insumos controlados: el remito es cantidad_declarada (lo guarda el primer control), lo
  -- contado es cantidad (controlar_recepcion_kg / _cajas / guardar_control_cartones la pisan).
  select 'insumo'::text, r.id, r.movimiento_id, r.fecha, 'proveedor_insumo'::text,
         r.proveedor, r.remito, k.codigo, k.descripcion, r.unidad,
         coalesce(r.cantidad_declarada, r.cantidad), r.cantidad,
         (select mm.cantidad from movimiento mm where mm.id = r.movimiento_id),
         r.controlado_en, r.controlado_por, r.ingreso_real, r.validado_en, r.validado_por
    from recepcion_insumo r
    join componente k on k.id = r.componente_id
   where coalesce(r.controlado, false)
), pes as (
  -- flejes: el control es el pesaje por pallet, que no marca controlado ni pisa el movimiento
  select 'pesaje'::text, r.id, r.movimiento_id, r.fecha, 'proveedor_insumo'::text,
         r.proveedor, r.remito, k.codigo, k.descripcion, r.unidad,
         coalesce(r.cantidad_declarada, r.cantidad),
         case when coalesce(pi.modo_control, '') = 'peso_total' then v.peso_balanza_total
              else v.kg_rollos end,
         (select mm.cantidad from movimiento mm where mm.id = r.movimiento_id),
         (select max(ctl.controlado_en) from recepcion_control ctl where ctl.recepcion_id = r.id),
         (select string_agg(distinct ctl.controlado_por, ', ') from recepcion_control ctl
           where ctl.recepcion_id = r.id),
         r.ingreso_real, r.validado_en, r.validado_por
    from recepcion_insumo r
    join componente k on k.id = r.componente_id
    join v_recepcion_control v on v.recepcion_id = r.id
    left join proveedor_insumo pi on pi.nombre = r.proveedor
   where not coalesce(r.controlado, false)
     and r.unidad = 'kg'
     and v.pallets_pesados > 0
     and v.estado not in ('sin controlar', 'faltan pallets por pesar', 'rollos sin clasificar')
), todo as (
  select x.*, round(x.control - x.remito, 3) as diff,
         -- PENDIENTE = hay diferencia y nadie la valido despues del ultimo control. Un re-control
         -- (o re-pesaje) posterior a la validacion la vuelve a abrir.
         (round(x.control, 3) <> round(x.remito, 3)
          and (x.validado_en is null or x.validado_en < coalesce(x.controlado_en, x.validado_en))) as pendiente
    from (select * from ent union all select * from ins union all select * from pes) x
)
select jsonb_build_object(
  'generado_en', now(),
  'tol_pct', coalesce((select valor::numeric from parametro where clave = 'tol_ctrl_pct'), 5),
  -- las diferencias sin validar, TODAS (una diferencia pendiente no vence)
  'pend', coalesce((select jsonb_agg(jsonb_build_object(
        'origen', origen, 'id', id, 'mov_id', mov_id, 'fecha', fecha,
        'cp_tipo', cp_tipo, 'cp_nombre', cp_nombre, 'remito_nro', remito_nro,
        'codigo', codigo, 'descripcion', descripcion, 'unidad', unidad,
        'remito', remito, 'control', control, 'diff', diff, 'en_stock', en_stock,
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
  -- y lo que la tablet todavia no controlo (o el fleje que no termino de pesarse): se valida
  -- DESPUES del control, no antes
  'sin_controlar', (select count(*) from movimiento m
                     where m.tipo_mov in ('entrega_ps','entrega_tallerista')
                       and not exists (select 1 from entrega_control c where c.movimiento_id = m.id))
                 + (select count(*) from recepcion_insumo r join componente k on k.id = r.componente_id
                     where not coalesce(r.controlado, false) and k.sector_id <> 5)
                 + (select count(*) from v_recepcion_control v
                      join recepcion_insumo r on r.id = v.recepcion_id
                      join componente k on k.id = r.componente_id
                     where k.sector_id = 5 and not coalesce(r.controlado, false)
                       and (v.pallets_pesados = 0
                            or v.estado in ('sin controlar', 'faltan pallets por pesar', 'rollos sin clasificar')))
);
$function$;

CREATE OR REPLACE FUNCTION "GP2".validar_remito_control(p_items jsonb, p_usuario text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare
  it jsonb; v_origen text; v_id bigint; v_vale text; v_obj numeric; v_factor numeric;
  c entrega_control%rowtype; m movimiento%rowtype; r recepcion_insumo%rowtype;
  v_ctrl numeric; v_est text; v_pp bigint; v_modo text;
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

    elsif v_origen = 'pesaje' then
      -- FLEJE: el control es el pesaje por pallet. Lo controlado se calcula igual que en el bundle.
      select * into r from recepcion_insumo where id = v_id for update;
      if not found then raise exception 'La recepcion % no existe.', v_id; end if;
      select pi.modo_control into v_modo from proveedor_insumo pi where pi.nombre = r.proveedor;
      select case when coalesce(v_modo, '') = 'peso_total' then v.peso_balanza_total else v.kg_rollos end,
             v.estado, v.pallets_pesados
        into v_ctrl, v_est, v_pp
        from v_recepcion_control v where v.recepcion_id = v_id;
      if coalesce(v_pp, 0) = 0 or v_est in ('sin controlar', 'faltan pallets por pesar', 'rollos sin clasificar') then
        raise exception 'El pesaje de la recepcion % no esta completo (%): primero terminar de pesar.', v_id, coalesce(v_est, 'sin pesar');
      end if;
      if r.unidad <> 'kg' then
        raise exception 'La recepcion % no esta en kg: el pesaje no se puede comparar.', v_id;
      end if;
      v_obj := case v_vale when 'remito' then coalesce(r.cantidad_declarada, r.cantidad) else v_ctrl end;
      if v_obj is null or v_obj <= 0 then
        raise exception 'La recepcion % no tiene kg pesados para usar como ingreso.', v_id;
      end if;
      if r.movimiento_id is not null then
        update movimiento set cantidad = v_obj
         where id = r.movimiento_id and cantidad is distinct from v_obj;
        get diagnostics v_k = row_count;
        v_movs := v_movs + v_k;
      end if;
      -- recepcion_insumo.cantidad queda con los kg del remito: es lo que lee v_recepcion_control
      update recepcion_insumo
         set ingreso_real = v_vale, validado_en = now(), validado_por = v_usr
       where id = v_id;

    else
      raise exception 'Origen invalido: "%". Tiene que ser entrega, insumo o pesaje.', v_origen;
    end if;

    v_n := v_n + 1;
    if v_vale = 'remito' then v_rem := v_rem + 1; end if;
  end loop;

  return jsonb_build_object('ok', true, 'validados', v_n, 'al_remito', v_rem,
                            'movimientos_ajustados', v_movs, 'consumos_ajustados', v_hijos);
end $function$;
