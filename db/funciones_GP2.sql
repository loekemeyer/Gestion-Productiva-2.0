-- =====================================================================
-- FUNCIONES del schema GP2 — export automatico 2026-08-29 (pg_get_functiondef, exacto)
-- Fuente de verdad: Supabase (hrxfctzncixxqmpfhskv). Este archivo es respaldo/referencia.
-- =====================================================================

-- ---------- _aplicar_recepcion_a_oc ----------
CREATE OR REPLACE FUNCTION "GP2"._aplicar_recepcion_a_oc(p_comp_id bigint, p_cantidad numeric, p_unidad text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare
  it record; v_resto numeric := p_cantidad; v_aplicar numeric; v_pend numeric;
  v_kgu numeric; v_cant_item numeric; v_ocs jsonb := '[]'::jsonb;
begin
  select kg_x_uni into v_kgu from componente where id = p_comp_id;
  for it in
    select oi.id, oi.cantidad, oi.recibido, oi.unidad, o.id oc_id, o.numero, o.estado
    from orden_compra_item oi
    join orden_compra o on o.id = oi.oc_id
    where oi.componente_id = p_comp_id
      and o.estado in ('enviada','borrador')
      and oi.recibido < oi.cantidad
    order by case o.estado when 'enviada' then 0 else 1 end, o.numero, oi.id
  loop
    exit when v_resto <= 0;
    -- convertir lo recibido a la unidad del item de OC si difieren
    v_cant_item := v_resto;
    if lower(coalesce(it.unidad,'uni')) <> lower(coalesce(p_unidad,'uni')) then
      if v_kgu is null or v_kgu <= 0 then
        continue; -- sin conversion posible: no cruzar contra este item
      elsif lower(coalesce(it.unidad,'uni')) = 'kg' then
        v_cant_item := v_resto * v_kgu;      -- recibi uni, la OC pide kg
      else
        v_cant_item := v_resto / v_kgu;      -- recibi kg, la OC pide uni
      end if;
    end if;
    v_pend := it.cantidad - it.recibido;
    v_aplicar := least(v_cant_item, v_pend);
    if v_aplicar <= 0 then continue; end if;
    update orden_compra_item set recibido = recibido + v_aplicar where id = it.id;
    -- descontar del resto en la unidad de la recepcion
    if lower(coalesce(it.unidad,'uni')) <> lower(coalesce(p_unidad,'uni')) then
      if lower(coalesce(it.unidad,'uni')) = 'kg' then v_resto := v_resto - v_aplicar / v_kgu;
      else v_resto := v_resto - v_aplicar * v_kgu; end if;
    else
      v_resto := v_resto - v_aplicar;
    end if;
    v_ocs := v_ocs || jsonb_build_object('numero', it.numero, 'aplicado', round(v_aplicar,2), 'unidad', it.unidad);
    -- OC completa -> recibida
    if not exists (select 1 from orden_compra_item x where x.oc_id = it.oc_id and x.recibido < x.cantidad) then
      update orden_compra set estado = 'recibida' where id = it.oc_id and estado <> 'anulada';
      v_ocs := v_ocs || jsonb_build_object('numero', it.numero, 'completa', true);
    end if;
  end loop;
  return v_ocs;
end $function$;

-- ---------- _es_sector_insumo ----------
CREATE OR REPLACE FUNCTION "GP2"._es_sector_insumo(p bigint)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'GP2'
AS $function$
  select p in (5,6,7,8,9,10,11)
$function$;

-- ---------- abm_articulo_baja ----------
CREATE OR REPLACE FUNCTION "GP2".abm_articulo_baja(p_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
declare v_cod text; v_bom int;
begin
  select codigo into v_cod from articulo where id=p_id;
  if v_cod is null then raise exception 'Artículo % inexistente', p_id; end if;
  delete from articulo_componente where articulo_id=p_id; get diagnostics v_bom = row_count;
  delete from articulo where id=p_id;
  return jsonb_build_object('ok',true,'id',p_id,'codigo',v_cod,'bom_borradas',v_bom);
end $function$;

-- ---------- abm_articulo_upsert ----------
CREATE OR REPLACE FUNCTION "GP2".abm_articulo_upsert(p_id bigint, p_codigo text, p_familia text, p_caja_id bigint, p_por_caja integer, p_estadistica numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
declare v_id bigint; v_accion text;
begin
  if p_codigo is null or btrim(p_codigo)='' then raise exception 'El código es obligatorio'; end if;
  if p_caja_id is not null and not exists (select 1 from componente where id=p_caja_id)
    then raise exception 'La caja (componente %) no existe', p_caja_id; end if;
  if p_id is null then
    if exists (select 1 from articulo where lower(btrim(codigo))=lower(btrim(p_codigo)))
      then raise exception 'Ya existe un artículo con el código %', p_codigo; end if;
    select coalesce(max(id),0)+1 into v_id from articulo;
    insert into articulo(id,codigo,familia,componente_caja_id,articulos_por_caja,estadistica_madre_uni_mes)
    values (v_id,btrim(p_codigo),p_familia,p_caja_id,p_por_caja,p_estadistica);
    v_accion:='alta';
  else
    if not exists (select 1 from articulo where id=p_id) then raise exception 'Artículo % inexistente', p_id; end if;
    update articulo set codigo=btrim(p_codigo), familia=p_familia, componente_caja_id=p_caja_id,
      articulos_por_caja=p_por_caja, estadistica_madre_uni_mes=p_estadistica where id=p_id;
    v_id:=p_id; v_accion:='edicion';
  end if;
  return jsonb_build_object('ok',true,'id',v_id,'accion',v_accion,'codigo',btrim(p_codigo));
end $function$;

-- ---------- abm_articulos_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".abm_articulos_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
select jsonb_build_object(
  'sect', (select jsonb_object_agg(id::text, jsonb_build_object('tipo',tipo,'nom',nombre)) from "GP2".sector),
  'partes', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'cod', c.codigo, 'd', c.descripcion, 's', c.sector_id) order by c.codigo), '[]'::jsonb)
    from "GP2".componente c where c.sector_id is distinct from 12),
  'art', (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id',   a.id,
        'cod',  a.codigo,
        'fam',  a.familia,
        'por',  a.articulos_por_caja,
        'caja', a.componente_caja_id,
        'caja_cod',  cj.codigo,
        'caja_desc', cj.descripcion,
        'est',  a.estadistica_madre_uni_mes,
        'comp', coalesce((
          select jsonb_agg(jsonb_build_object(
            'cid', c.id,
            'cod', c.codigo,
            'd',   c.descripcion,
            's',   c.sector_id,
            'um',  c.unidad_medida,
            'q',   ac.cantidad,
            'kg',  c.kg_x_uni,
            'uxc', c.uni_x_cajon
          ) order by c.sector_id nulls last, c.codigo)
          from "GP2".articulo_componente ac
          join "GP2".componente c on c.id = ac.componente_id
          where ac.articulo_id = a.id
        ), '[]'::jsonb)
      ) order by a.codigo
    ), '[]'::jsonb)
    from "GP2".articulo a
    left join "GP2".componente cj on cj.id = a.componente_caja_id
  )
);
$function$;

-- ---------- abm_bom_guardar ----------
CREATE OR REPLACE FUNCTION "GP2".abm_bom_guardar(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare
  v_art bigint := (p->>'articulo_id')::bigint;
  v_cod text; it jsonb; v_cid bigint; v_q numeric;
  v_altas int := 0; v_cambios int := 0; v_bajas int := 0;
  v_ids bigint[] := '{}'; v_avisos jsonb := '[]'::jsonb;
begin
  select codigo into v_cod from articulo where id = v_art;
  if v_cod is null then raise exception 'Articulo inexistente (id=%).', v_art; end if;

  for it in select * from jsonb_array_elements(coalesce(p->'lineas','[]'::jsonb)) loop
    v_cid := (it->>'comp_id')::bigint;
    v_q   := (it->>'cantidad')::numeric;
    if v_cid is null then raise exception 'Linea sin comp_id.'; end if;
    if v_q is null or v_q <= 0 then
      raise exception 'Cantidad invalida para el componente id=% (debe ser > 0).', v_cid;
    end if;
    if not exists (select 1 from componente c where c.id = v_cid) then
      raise exception 'Componente inexistente (id=%).', v_cid;
    end if;
    if exists (select 1 from componente c where c.id = v_cid and c.sector_id = 12) then
      raise exception 'Un articulo terminado no puede ser parte de una receta (comp id=%).', v_cid;
    end if;
    v_ids := v_ids || v_cid;
    if exists (select 1 from articulo_componente ac where ac.articulo_id=v_art and ac.componente_id=v_cid) then
      update articulo_componente set cantidad = v_q
       where articulo_id=v_art and componente_id=v_cid and cantidad is distinct from v_q;
      if found then v_cambios := v_cambios + 1; end if;
    else
      insert into articulo_componente(articulo_id, componente_id, cantidad) values (v_art, v_cid, v_q);
      v_altas := v_altas + 1;
    end if;
  end loop;

  delete from articulo_componente ac
   where ac.articulo_id = v_art and not (ac.componente_id = any(v_ids));
  get diagnostics v_bajas = row_count;

  -- avisos de normalizacion contra las rutas del articulo
  with salidas as (
    select distinct rp.comp_salida_id
    from ruta r join ruta_paso rp on rp.ruta_id = r.id
    where r.articulo_id = v_art and rp.comp_salida_id is not null
  ), receta as (
    select ac.componente_id from articulo_componente ac where ac.articulo_id = v_art
  )
  select coalesce(jsonb_agg(x.msg), '[]'::jsonb) into v_avisos
  from (
    select 'La parte '||c.codigo||' esta en la receta pero NINGUNA ruta del articulo la produce (completar ruta/ruta_paso).' as msg
    from receta rc join componente c on c.id = rc.componente_id
    where not "GP2"._es_sector_insumo(c.sector_id)
      and rc.componente_id not in (select comp_salida_id from salidas)
    union all
    select 'La ruta produce '||c.codigo||' pero NO esta en la receta (agregarla o revisar la ruta).'
    from salidas s join componente c on c.id = s.comp_salida_id
    where c.sector_id is distinct from 12
      and s.comp_salida_id not in (select componente_id from receta)
  ) x;

  return jsonb_build_object('ok', true, 'articulo', v_cod,
    'altas', v_altas, 'cambios', v_cambios, 'bajas', v_bajas, 'avisos', v_avisos);
end $function$;

-- ---------- ajustar_rollos ----------
CREATE OR REPLACE FUNCTION "GP2".ajustar_rollos(p_comp_id bigint, p_kg_por_rollo numeric, p_delta integer, p_motivo text DEFAULT 'ajuste'::text, p_nota text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare v_id bigint;
begin
  if p_motivo not in ('inicial','ajuste','devolucion') then
    raise exception 'Motivo invalido: %', p_motivo;
  end if;
  insert into rollo_evento(componente_id, kg_por_rollo, delta, motivo, nota)
  values (p_comp_id, p_kg_por_rollo, p_delta, p_motivo, p_nota) returning id into v_id;
  return jsonb_build_object('ok',true,'id',v_id);
end $function$;

-- ---------- alertas_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".alertas_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
with ref as (
  select max(fecha)::date d from "GP2".produccion where (eliminar is null or eliminar <> 'S')
),
matrices as (
  select matriz_raw m,
         (array_agg(nombre_matriz) filter (where nombre_matriz is not null and nombre_matriz <> ''))[1] nm,
         max(tiempo_historico) th
  from "GP2".produccion
  where matriz_raw is not null and matriz_raw <> ''
    and (eliminar is null or eliminar <> 'S')
  group by matriz_raw
),
sin_tiempo as (
  select m, nm, th from matrices where th is null or th = 0
),
eventos as (
  select nombre_matriz, matriz_raw, legajo, nombre_empleado, fecha,
         to_char(fecha,'YYYY-MM-DD') fstr, to_char(hora_inicio,'HH24:MI:SS') hstr
  from "GP2".produccion
  where (eliminar is null or eliminar <> 'S')
    and fecha >= (select d from ref) - interval '30 days'
)
select jsonb_build_object(
  'generado_en', now(),
  'ref_fecha', (select d from ref),
  'ventana_dias', 30,
  'matriz_sin_tiempo', jsonb_build_object(
    'total', (select count(*) from sin_tiempo),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('N_Matriz', m, 'Nombre_Matriz', nm, 'Tiempo_Historico', coalesce(th,0)) order by m)
      from sin_tiempo), '[]'::jsonb)
  ),
  'rm', jsonb_build_object(
    'total', (select count(*) from eventos where nombre_matriz ilike 'RM %'),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('Fecha',fstr,'Hora',hstr,'Legajo',legajo,'Empleado',nombre_empleado,'Matriz',matriz_raw,'Nombre_Matriz',nombre_matriz) order by fecha desc)
      from eventos where nombre_matriz ilike 'RM %'), '[]'::jsonb)
  ),
  'pm', jsonb_build_object(
    'total', (select count(*) from eventos where nombre_matriz ilike 'PM %'),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('Fecha',fstr,'Hora',hstr,'Legajo',legajo,'Empleado',nombre_empleado,'Matriz',matriz_raw,'Nombre_Matriz',nombre_matriz) order by fecha desc)
      from eventos where nombre_matriz ilike 'PM %'), '[]'::jsonb)
  ),
  'pendientes', jsonb_build_array(
    jsonb_build_object(
      'clave','stock_bajo_minimo',
      'titulo','Stock bajo minimo',
      'motivo','Depende de GP2.inventario, que se deriva de GP2.movimiento. Los movimientos de entrada de insumos (Cajas / E.Madre) todavia no estan migrados, por lo que el stock arroja cantidades negativas irreales (ej. -490992) y no es confiable. Reactivar cuando esten cargados esos movimientos.'
    )
  )
);
$function$;

-- ---------- alta_proveedor_insumo ----------
CREATE OR REPLACE FUNCTION "GP2".alta_proveedor_insumo(p_nombre text, p_rubro text DEFAULT NULL::text, p_modo_control text DEFAULT 'ninguno'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare v_n text := nullif(btrim(coalesce(p_nombre,'')),'');
begin
  if v_n is null then raise exception 'El nombre del proveedor no puede estar vacio.'; end if;
  insert into proveedor_insumo(nombre, rubro, modo_control)
  values (v_n, nullif(btrim(coalesce(p_rubro,'')),''), coalesce(nullif(btrim(p_modo_control),''),'ninguno'))
  on conflict (nombre) do update
     set activo = true,
         rubro = coalesce(excluded.rubro, proveedor_insumo.rubro);
  return jsonb_build_object('ok',true,'nombre',v_n);
end $function$;

-- ---------- anular_evento_prod ----------
CREATE OR REPLACE FUNCTION "GP2".anular_evento_prod(p_id_ejecucion text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare v_n int;
begin
  if nullif(btrim(coalesce(p_id_ejecucion,'')),'') is null then
    raise exception 'Falta id_ejecucion';
  end if;
  update produccion set eliminar = 'S' where id_ejecucion = p_id_ejecucion;
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'anulados', v_n);
end $function$;

-- ---------- anular_produccion ----------
CREATE OR REPLACE FUNCTION "GP2".anular_produccion(row_id bigint, p_hora_inicio text DEFAULT NULL::text, p_hora_fin text DEFAULT NULL::text, p_seg_tiempo_muerto numeric DEFAULT 0, p_uni numeric DEFAULT 0, p_seg_trabajados numeric DEFAULT 0, p_seg_historico numeric DEFAULT 0, p_premio numeric DEFAULT 0, p_anular boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
begin
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
  if not found then
    raise exception 'Registro id=% no encontrado', row_id;
  end if;
end;
$function$;

-- ---------- asignar_proveedor_parte ----------
CREATE OR REPLACE FUNCTION "GP2".asignar_proveedor_parte(p_comp_id bigint, p_proveedor text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare
  v_prov text := nullif(btrim(coalesce(p_proveedor,'')),'');
  v_cod text; v_sector text; v_antes text;
begin
  select c.codigo, s.nombre, nullif(btrim(coalesce(c.proveedor,'')),'')
    into v_cod, v_sector, v_antes
    from componente c left join sector s on s.id=c.sector_id
   where c.id = p_comp_id;
  if v_cod is null then
    raise exception 'Componente inexistente (id=%).', p_comp_id;
  end if;

  -- v_prov null = desasignar (queda pendiente de definir, no se inventa nada)
  if v_prov is not null and not exists (
       select 1 from proveedor_insumo where nombre = v_prov and activo) then
    raise exception 'El proveedor "%" no existe o esta inactivo. Dalo de alta primero.', v_prov;
  end if;

  update componente set proveedor = v_prov where id = p_comp_id;

  return jsonb_build_object('ok',true,'comp_id',p_comp_id,'codigo',v_cod,
                            'sector',v_sector,'antes',v_antes,'proveedor',v_prov);
end $function$;

-- ---------- cargar_recepcion ----------
CREATE OR REPLACE FUNCTION "GP2".cargar_recepcion(p_comp_id bigint, p_proveedor text, p_cantidad numeric, p_unidad text DEFAULT NULL::text, p_remito text DEFAULT NULL::text, p_rollos integer DEFAULT NULL::integer, p_pallets integer DEFAULT NULL::integer, p_fecha timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare v_res jsonb; v_rec bigint;
begin
  if p_rollos is not null and p_rollos <= 0 then
    raise exception 'Los rollos deben ser mayores a 0 (recibido: %)', p_rollos;
  end if;
  if p_pallets is not null and p_pallets <= 0 then
    raise exception 'Los pallets deben ser mayores a 0 (recibido: %)', p_pallets;
  end if;
  v_res := "GP2".crear_recepcion_insumo(p_comp_id, p_proveedor, p_cantidad, p_unidad, p_remito, p_fecha);
  v_rec := (v_res->>'recepcion_id')::bigint;
  update "GP2".recepcion_insumo
     set rollos = p_rollos, pallets = p_pallets
   where id = v_rec;
  return v_res || jsonb_build_object('rollos', p_rollos, 'pallets', p_pallets);
end $function$;

-- ---------- cerrar_rollo ----------
CREATE OR REPLACE FUNCTION "GP2".cerrar_rollo(p_legajo text, p_quedo_resto boolean, p_uni_producidas numeric DEFAULT NULL::numeric, p_fecha timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare u record; v_uni numeric; v_ppk numeric; v_esp numeric; v_alerta text;
begin
  select * into u from rollo_uso where legajo=p_legajo and ts_fin is null
   order by ts_inicio desc limit 1;
  if u.id is null then
    return jsonb_build_object('ok',false,'error','No hay rollo abierto para el legajo '||p_legajo);
  end if;
  v_uni := coalesce(p_uni_producidas,
    (select coalesce(sum(uni),0) from produccion
      where legajo=p_legajo and fecha >= u.ts_inicio and fecha <= coalesce(p_fecha,now()) and uni > 0));
  select partes_por_kilo_de_fleje into v_ppk from matriz
   where btrim(n_matriz) = btrim(coalesce(u.matriz_raw,'')) limit 1;
  v_esp := case when v_ppk is not null and v_ppk > 0 then u.kg_por_rollo * v_ppk end;
  if not p_quedo_resto and v_esp is not null then
    if v_uni < v_esp * 0.6 then
      v_alerta := 'Rollo terminado con '||round(v_uni)||' uni, pero un rollo de '||u.kg_por_rollo||
        ' kg deberia dar ~'||round(v_esp)||'. Diferencia grande: revisar.';
    elsif v_uni > v_esp * 1.4 then
      v_alerta := 'Rollo rindio '||round(v_uni)||' uni, bastante mas que las ~'||round(v_esp)||
        ' esperadas. Revisar el parametro piezas/kg.';
    end if;
  end if;
  update rollo_uso set ts_fin=coalesce(p_fecha,now()), quedo_resto=p_quedo_resto,
    uni_producidas=v_uni, uni_esperadas=v_esp where id=u.id;
  -- si quedo resto, el rollo vuelve al stock como devolucion parcial NO se puede
  -- cuantificar en rollos enteros: queda registrado en el uso, no en el ledger.
  return jsonb_build_object('ok',true,'uso_id',u.id,'kg_por_rollo',u.kg_por_rollo,
    'uni_producidas',v_uni,'uni_esperadas',v_esp,'quedo_resto',p_quedo_resto,'alerta',v_alerta);
end $function$;

-- ---------- composicion_stock ----------
CREATE OR REPLACE FUNCTION "GP2".composicion_stock(p_comp_id bigint, p_ubic_id bigint DEFAULT NULL::bigint, p_limit integer DEFAULT 300, p_ubic_tipo text DEFAULT NULL::text, p_ref_id bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
  with u as (
    select coalesce(
      p_ubic_id,
      (select id from ubicacion
        where p_ubic_tipo is not null and tipo = p_ubic_tipo
          and (p_ref_id is null or ref_id = p_ref_id)
        limit 1)
    ) as id
  ),
  todos as (
    select m.id, m.fecha, m.tipo_mov as tipo, 'ent'::text as signo,
           coalesce(m._delta_dest,0) as cantidad, m.cajones, m.faltante,
           coalesce(uo.nombre,'—') as contraparte,
           case when m.comp_transformado_id is not null and m.comp_id <> p_comp_id
                then (select codigo from componente where id = m.comp_id) end as via
    from movimiento m
    left join ubicacion uo on uo.id = m.ubic_origen_id
    cross join u
    where m.ubic_destino_id = u.id
      and coalesce(m.comp_transformado_id, m.comp_id) = p_comp_id
    union all
    select m.id, m.fecha, m.tipo_mov, 'sal',
           coalesce(m._delta_orig,0), m.cajones, m.faltante,
           coalesce(ud.nombre,'—'),
           case when m.comp_transformado_id is not null
                then (select codigo from componente where id = m.comp_transformado_id) end
    from movimiento m
    left join ubicacion ud on ud.id = m.ubic_destino_id
    cross join u
    where m.ubic_origen_id = u.id and m.comp_id = p_comp_id
  ),
  pagina as (select * from todos order by fecha desc, id desc limit greatest(p_limit,1))
  select jsonb_build_object(
    'comp', (select jsonb_build_object('id',c.id,'codigo',c.codigo,'descripcion',c.descripcion,
                                       'kg_x_uni',c.kg_x_uni,'uni_x_cajon',c.uni_x_cajon)
             from componente c where c.id = p_comp_id),
    'ubicacion', (select jsonb_build_object('id',x.id,'nombre',x.nombre,'tipo',x.tipo)
                  from ubicacion x cross join u where x.id = u.id),
    'online',  (select i.cantidad from inventario i cross join u
                where i.componente_id = p_comp_id and i.ubicacion_id = u.id),
    'minimo',  (select i.minimo from inventario i cross join u
                where i.componente_id = p_comp_id and i.ubicacion_id = u.id),
    'actualizado_en', (select i.actualizado_en from inventario i cross join u
                where i.componente_id = p_comp_id and i.ubicacion_id = u.id),
    'total_movs', (select count(*) from todos),
    'movs', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id',p.id,'fecha',p.fecha,'tipo',p.tipo,'signo',p.signo,
               'cantidad',p.cantidad,'cajones',p.cajones,'faltante',p.faltante,
               'contraparte',p.contraparte,'via',p.via
             ) order by p.fecha desc, p.id desc)
      from pagina p), '[]'::jsonb)
  );
$function$;

-- ---------- control_envios_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".control_envios_bundle(p_desde date, p_hasta date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
select jsonb_build_object(
  'filas', (select coalesce(jsonb_agg(jsonb_build_object(
      'fecha', to_char(m.fecha at time zone 'America/Argentina/Buenos_Aires','YYYY-MM-DD'),
      'tipo', m.tipo_mov,
      'comp_id', c.id, 'codigo', c.codigo, 'descripcion', c.descripcion,
      'um', c.unidad_medida, 'kg_x_uni', c.kg_x_uni, 'uni_x_cajon', c.uni_x_cajon,
      'orig', uo.nombre, 'dest', ud.nombre,
      'cantidad', m.cantidad, 'unidad', coalesce(m.unidad_origen, m.unidad_destino),
      'canon', m._delta_orig)),'[]'::jsonb)
    from movimiento m
    join componente c on c.id = m.comp_id
    left join ubicacion uo on uo.id = m.ubic_origen_id
    left join ubicacion ud on ud.id = m.ubic_destino_id
    where m.tipo_mov in ('envio_ps','entrega_ps','envio_tallerista','entrega_tallerista',
                         'recepcion_virgilio','devolucion_tallerista','envio_prov_at','compra')
      and (m.fecha at time zone 'America/Argentina/Buenos_Aires')::date between p_desde and p_hasta),
  'desde', p_desde, 'hasta', p_hasta, 'generado_en', now());
$function$;

-- ---------- control_ps_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".control_ps_bundle()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
with ps as (
  select p.id ps_id, p.cod_prov, p.nombre, p.proceso, u.id ubic_id
  from proveedor_servicio p
  join ubicacion u on u.tipo='proveedor_servicio' and u.ref_id=p.id
),
cfg as (  -- partes configuradas: las que ENTRAN a cada PS segun las rutas
  select distinct ps.ubic_id, rp.comp_entrada_id comp_id
  from ps join ruta_paso rp on rp.tipo_paso='proveedor_servicio' and rp.proveedor_id=ps.ps_id
  where rp.comp_entrada_id is not null
),
env as (select ubic_destino_id ubic_id, comp_id, sum(_delta_orig) enviado from movimiento where tipo_mov='envio_ps' group by 1,2),
ent as (select ubic_origen_id ubic_id, comp_id, sum(_delta_dest) entregado from movimiento where tipo_mov='entrega_ps' group by 1,2),
inv as (select ubicacion_id ubic_id, componente_id comp_id, sum(cantidad) saldo from inventario group by 1,2),
keys as (
  select ubic_id, comp_id from cfg
  union select ubic_id, comp_id from env
  union select ubic_id, comp_id from ent
  union select ubic_id, comp_id from inv
),
partes as (
  select ps.ps_id, k.comp_id,
    coalesce(env.enviado,0) enviado, coalesce(ent.entregado,0) entregado, coalesce(inv.saldo,0) saldo
  from keys k
  join ps on ps.ubic_id=k.ubic_id
  left join env on env.ubic_id=k.ubic_id and env.comp_id=k.comp_id
  left join ent on ent.ubic_id=k.ubic_id and ent.comp_id=k.comp_id
  left join inv on inv.ubic_id=k.ubic_id and inv.comp_id=k.comp_id
),
partes_j as (
  select p.ps_id, jsonb_agg(jsonb_build_object(
      'comp_id',p.comp_id,'codigo',c.codigo,'descripcion',c.descripcion,'sector',s.nombre,
      'enviado',round(p.enviado,3),'entregado',round(p.entregado,3),'saldo',round(p.saldo,3)
    ) order by c.codigo, c.id) partes
  from partes p join componente c on c.id=p.comp_id left join sector s on s.id=c.sector_id
  group by p.ps_id
)
select jsonb_build_object('generado_en', now(),
  'proveedores', coalesce(jsonb_agg(jsonb_build_object(
    'ps_id',ps.ps_id,'nombre',ps.nombre,'proceso',ps.proceso,'cod_prov',ps.cod_prov,
    'nombre_viejo', al.nombre_viejo, 'partes', coalesce(pj.partes,'[]'::jsonb)
  ) order by ps.nombre),'[]'::jsonb))
from ps
left join lateral (select nombre_viejo from proveedor_servicio_alias a where a.ps_id=ps.ps_id and a.confianza='confirmado' order by a.id limit 1) al on true
left join partes_j pj on pj.ps_id=ps.ps_id;
$function$;

-- ---------- control_talleristas_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".control_talleristas_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
with mov as (
  -- normaliza cada movimiento a: tallerista, componente, enviado/entregado en unidades + kg crudo
  select
    case when m.tipo_mov = 'envio_tallerista' then ud.ref_id else uo.ref_id end as tall_id,
    m.comp_id,
    m.tipo_mov,
    -- unidades: 'uni' tal cual; 'kg' se convierte con kg_x_uni (>0 garantizado para los kg de envío)
    case
      when m.unidad_origen = 'uni' then m.cantidad
      when m.unidad_origen = 'kg' and coalesce(c.kg_x_uni,0) > 0 then m.cantidad / c.kg_x_uni
      else 0
    end as uni,
    case when m.unidad_origen = 'kg' then m.cantidad else 0 end as kg_raw,
    -- flag: kg sin factor de conversión (no debería ocurrir hoy, pero lo marcamos)
    case when m.unidad_origen = 'kg' and coalesce(c.kg_x_uni,0) = 0 then 1 else 0 end as kg_sin_factor
  from movimiento m
  join componente c on c.id = m.comp_id
  left join ubicacion uo on uo.id = m.ubic_origen_id
  left join ubicacion ud on ud.id = m.ubic_destino_id
  where m.tipo_mov in ('envio_tallerista','entrega_tallerista','consumo_tall','devolucion_tallerista')
),
agg as (
  select
    mov.tall_id,
    mov.comp_id,
    sum(case when mov.tipo_mov = 'envio_tallerista'   then mov.uni else 0 end) as enviado,
    sum(case when mov.tipo_mov in ('entrega_tallerista','consumo_tall') then mov.uni else 0 end) as entregado,
    sum(case when mov.tipo_mov = 'devolucion_tallerista' then mov.uni else 0 end) as devuelto,
    sum(case when mov.tipo_mov = 'envio_tallerista'   then mov.kg_raw else 0 end) as enviado_kg,
    max(mov.kg_sin_factor) as kg_sin_factor
  from mov
  group by mov.tall_id, mov.comp_id
),
partes as (
  select
    a.tall_id,
    jsonb_build_object(
      'comp_id', a.comp_id,
      'cod', c.codigo,
      'desc', c.descripcion,
      'sector', s.nombre,
      'kg_x_uni', c.kg_x_uni,
      'enviado', round(a.enviado::numeric, 2),
      'entregado', round(a.entregado::numeric, 2),
      'devuelto', round(a.devuelto::numeric, 2),
      'saldo', round((a.enviado - a.entregado - a.devuelto)::numeric, 2),
      'enviado_kg', round(a.enviado_kg::numeric, 3),
      'kg_sin_factor', (a.kg_sin_factor = 1)
    ) as parte,
    c.codigo as cod_sort
  from agg a
  join componente c on c.id = a.comp_id
  left join sector s on s.id = c.sector_id
),
por_tall as (
  select
    p.tall_id,
    jsonb_agg(p.parte order by p.cod_sort) as partes,
    count(*) as n_partes,
    round(sum((p.parte->>'enviado')::numeric),2)   as tot_enviado,
    round(sum((p.parte->>'entregado')::numeric),2) as tot_entregado,
    round(sum((p.parte->>'saldo')::numeric),2)     as tot_saldo
  from partes p
  group by p.tall_id
)
select jsonb_build_object(
  'generado_en', now(),
  'talleristas', coalesce(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'nombre', t.nombre,
      'cod_prov', t.cod_prov,
      'n_partes', pt.n_partes,
      'tot_enviado', pt.tot_enviado,
      'tot_entregado', pt.tot_entregado,
      'tot_saldo', pt.tot_saldo,
      'partes', pt.partes
    ) order by t.nombre
  ), '[]'::jsonb)
)
from por_tall pt
join tallerista t on t.id = pt.tall_id;
$function$;

-- ---------- crear_devolucion_tallerista ----------
CREATE OR REPLACE FUNCTION "GP2".crear_devolucion_tallerista(p_tallerista_id bigint, p_comp_id bigint, p_cantidad numeric, p_unidad text, p_destino text, p_motivo text DEFAULT NULL::text, p_fecha timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare
  v_tall text; v_cod text; v_sector text;
  v_ubic_orig bigint; v_ubic_dest bigint; v_mov bigint; v_dev bigint;
  v_unidad text := lower(trim(coalesce(p_unidad,'')));
  v_online numeric; v_canon numeric; v_aviso text;
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a 0.';
  end if;
  if v_unidad not in ('kg','uni') then
    raise exception 'Unidad invalida: "%". Debe ser "kg" o "uni".', coalesce(p_unidad,'null');
  end if;
  if p_destino not in ('sector','analizar') then
    raise exception 'Destino invalido: "%". Debe ser "sector" o "analizar".', coalesce(p_destino,'null');
  end if;

  select nombre into v_tall from tallerista where id = p_tallerista_id;
  if v_tall is null then raise exception 'Tallerista inexistente (id=%).', p_tallerista_id; end if;

  select id into v_ubic_orig from ubicacion where tipo='tallerista' and ref_id=p_tallerista_id limit 1;
  if v_ubic_orig is null then
    raise exception 'El tallerista "%" no tiene ubicacion asociada.', v_tall;
  end if;

  select c.codigo, s.nombre into v_cod, v_sector
    from componente c left join sector s on s.id=c.sector_id where c.id=p_comp_id;
  if not found then raise exception 'Componente inexistente (id=%).', p_comp_id; end if;

  if p_destino = 'sector' then
    if v_sector is null then
      raise exception 'El componente "%" no tiene sector asignado; mandalo "Para Analizar".', coalesce(v_cod,'?');
    end if;
    select id into v_ubic_dest from ubicacion where tipo='sector' and nombre=v_sector limit 1;
    if v_ubic_dest is null then
      raise exception 'No existe ubicacion de sector para "%".', v_sector;
    end if;
  else
    select id into v_ubic_dest from ubicacion where tipo='analisis' limit 1;
    if v_ubic_dest is null then raise exception 'Falta la ubicacion "Para Analizar".'; end if;
  end if;

  -- avisar (sin bloquear) si devuelve mas de lo que tiene online
  v_canon := "GP2".to_canonical(p_comp_id, p_cantidad, v_unidad);
  select cantidad into v_online from inventario
   where componente_id=p_comp_id and ubicacion_id=v_ubic_orig;
  if coalesce(v_online,0) < v_canon then
    v_aviso := 'OJO: '||v_tall||' tiene online '||coalesce(round(v_online,2)::text,'0')||
      ' de '||coalesce(v_cod,'?')||' y devuelve '||round(v_canon,2)||' (queda negativo).';
  end if;

  insert into movimiento(fecha, tipo_mov, comp_id, ubic_origen_id, ubic_destino_id,
                         cantidad, unidad_origen, unidad_destino)
  values (coalesce(p_fecha,now()), 'devolucion_tallerista', p_comp_id, v_ubic_orig, v_ubic_dest,
          p_cantidad, v_unidad, v_unidad)
  returning id into v_mov;

  insert into devolucion_tallerista(movimiento_id, tallerista_id, destino, motivo)
  values (v_mov, p_tallerista_id, p_destino, nullif(trim(coalesce(p_motivo,'')),''))
  returning id into v_dev;

  return jsonb_build_object('ok',true,'id',v_dev,'movimiento_id',v_mov,'tallerista',v_tall,
    'codigo',v_cod,'destino',p_destino,'cantidad',p_cantidad,'unidad',v_unidad,'aviso',v_aviso);
end $function$;

-- ---------- crear_entrega_ps ----------
CREATE OR REPLACE FUNCTION "GP2".crear_entrega_ps(p_ps_id bigint, p_comp_sc_id bigint, p_comp_sp_id bigint, p_kg numeric, p_fecha timestamp with time zone DEFAULT now(), p_cajones numeric DEFAULT NULL::numeric, p_faltante boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
declare v_ps bigint; v_dest bigint; v_sec_id bigint; v_secsp text; v_umsc text;
        v_codsp text; v_codsc text; v_cons numeric; v_id bigint;
begin
  if p_kg is null or p_kg <= 0 then raise exception 'Los kg deben ser mayores a 0'; end if;
  select c.sector_id, s.nombre, c.codigo into v_sec_id, v_secsp, v_codsp
    from componente c join sector s on s.id=c.sector_id where c.id=p_comp_sp_id;
  select unidad_medida, codigo into v_umsc, v_codsc from componente where id=p_comp_sc_id;
  if v_secsp is null then raise exception 'Componente SP % inexistente o sin sector', p_comp_sp_id; end if;
  if v_codsc is null then raise exception 'Componente SC % inexistente', p_comp_sc_id; end if;
  select id into v_ps   from ubicacion where tipo='proveedor_servicio' and ref_id=p_ps_id limit 1;
  select id into v_dest from ubicacion where tipo='sector' and ref_id=v_sec_id limit 1;
  if v_ps is null then raise exception 'No hay ubicación para el proveedor de servicio %', p_ps_id; end if;
  if v_dest is null then raise exception 'No hay ubicación para el sector % (id=%) del SP', v_secsp, v_sec_id; end if;
  v_cons := to_canonical(p_comp_sp_id, p_kg, 'kg');
  insert into movimiento(fecha,tipo_mov,comp_id,ubic_origen_id,ubic_destino_id,cantidad,unidad_origen,
                         comp_transformado_id,cantidad_transformada,unidad_destino,cajones,faltante)
  values (coalesce(p_fecha,now()),'entrega_ps',p_comp_sc_id,v_ps,v_dest,v_cons,
          case when lower(coalesce(v_umsc,'unidad'))='kg' then 'kg' else 'uni' end,
          p_comp_sp_id,p_kg,'kg',p_cajones,coalesce(p_faltante,false))
  returning id into v_id;
  return jsonb_build_object('ok',true,'id',v_id,'sc',v_codsc,'sp',v_codsp,'kg',p_kg,
    'consumo_canon',v_cons,'cajones',p_cajones,'faltante',coalesce(p_faltante,false));
end $function$;

-- ---------- crear_entrega_tallerista ----------
CREATE OR REPLACE FUNCTION "GP2".crear_entrega_tallerista(p_tallerista_id bigint, p_comp_id bigint, p_cantidad numeric, p_unidad text DEFAULT 'uni'::text, p_fecha timestamp with time zone DEFAULT now(), p_descontar_bom boolean DEFAULT true, p_comp_entrada_id bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
declare
  v_unidad            text    := lower(trim(coalesce(p_unidad, 'uni')));
  v_tall_nombre       text;
  v_ubic_tall         bigint;
  v_ubic_origen       bigint;
  v_ubic_destino      bigint;
  v_destino_nom       text;
  v_cod               text;
  v_sector_id         bigint;
  v_sector_nom        text;
  v_qty_canon         numeric;
  v_mov_id            bigint;
  v_hijo_mov          bigint;
  v_hijos             jsonb   := '[]'::jsonb;
  v_es_armado         boolean := false;
  v_es_transformacion boolean := false;
  v_comp_entrada_cod  text;
  v_consumo_mov       bigint;
  r                   record;
  v_hijo_um           text;
  v_hijo_qty          numeric;
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a 0 (recibido: %).', coalesce(p_cantidad::text, 'null');
  end if;
  if v_unidad not in ('kg', 'uni') then
    raise exception 'Unidad invalida: "%". Debe ser "kg" o "uni".', coalesce(p_unidad, 'null');
  end if;

  select nombre into v_tall_nombre from tallerista where id = p_tallerista_id;
  if v_tall_nombre is null then
    raise exception 'Tallerista inexistente (id=%).', p_tallerista_id;
  end if;
  select id into v_ubic_tall from ubicacion
   where tipo = 'tallerista' and ref_id = p_tallerista_id limit 1;
  if v_ubic_tall is null then
    raise exception 'El tallerista "%" (id=%) no tiene ubicacion asociada.', v_tall_nombre, p_tallerista_id;
  end if;

  select c.codigo, c.sector_id, s.nombre into v_cod, v_sector_id, v_sector_nom
    from componente c left join sector s on s.id = c.sector_id
   where c.id = p_comp_id;
  if not found then
    raise exception 'Componente inexistente (id=%).', p_comp_id;
  end if;

  -- Destino: ubicacion del sector del componente.
  -- Articulos terminados (sector sin ubicacion propia) van a Virgilio.
  select id into v_ubic_destino from ubicacion
   where tipo = 'sector' and ref_id = v_sector_id limit 1;
  if v_ubic_destino is null then
    select id into v_ubic_destino from ubicacion where tipo = 'virgilio' limit 1;
  end if;
  if v_ubic_destino is null then
    raise exception 'No hay ubicacion destino para el componente "%" (sector %). Falta la ubicacion del sector o la de Virgilio.',
      coalesce(v_cod, '?'), coalesce(v_sector_nom, v_sector_id::text, 'sin sector');
  end if;
  select nombre into v_destino_nom from ubicacion where id = v_ubic_destino;

  -- Es armado si tiene partes en componente_bom y se pidio descontarlas.
  if p_descontar_bom then
    select exists(select 1 from componente_bom where componente_padre_id = p_comp_id)
      into v_es_armado;
  end if;

  -- Transformacion: tallerista recibio p_comp_entrada_id y entrega p_comp_id (distinto).
  -- Solo aplica para no-armados; los armados manejan sus insumos via BOM.
  v_es_transformacion := (p_comp_entrada_id is not null and not v_es_armado);

  -- Origen del movimiento principal:
  --   armado/transformacion -> null (el producto nace en la entrega)
  --   pass-through simple   -> tallerista (sale de su stock)
  v_ubic_origen := case
    when v_es_armado or v_es_transformacion then null
    else v_ubic_tall
  end;

  insert into movimiento(fecha, tipo_mov, comp_id, ubic_origen_id, ubic_destino_id,
                         cantidad, unidad_origen, unidad_destino)
  values (coalesce(p_fecha, now()), 'entrega_tallerista', p_comp_id,
          v_ubic_origen, v_ubic_destino, p_cantidad, v_unidad, v_unidad)
  returning id into v_mov_id;

  -- Para transformacion: registrar consumo del componente de entrada desde el tallerista.
  if v_es_transformacion then
    select codigo into v_comp_entrada_cod from componente where id = p_comp_entrada_id;
    if not found then
      raise exception 'Componente entrada inexistente (p_comp_entrada_id=%).', p_comp_entrada_id;
    end if;
    insert into movimiento(fecha, tipo_mov, comp_id, ubic_origen_id, ubic_destino_id,
                           cantidad, unidad_origen, unidad_destino)
    values (coalesce(p_fecha, now()), 'consumo_transformacion', p_comp_entrada_id,
            v_ubic_tall, null, p_cantidad, v_unidad, v_unidad)
    returning id into v_consumo_mov;
    v_hijos := jsonb_build_array(jsonb_build_object(
      'movimiento_id', v_consumo_mov,
      'componente_id', p_comp_entrada_id,
      'codigo',        v_comp_entrada_cod,
      'cantidad',      p_cantidad,
      'unidad',        v_unidad
    ));
  end if;

  -- Para armados: descontar cada componente del BOM desde el tallerista.
  if v_es_armado then
    v_qty_canon := to_canonical(p_comp_id, p_cantidad, v_unidad);
    for r in
      select b.componente_hijo_id as hijo_id, b.cantidad as por_unidad,
             c.codigo as hijo_cod, c.unidad_medida as hijo_um
        from componente_bom b join componente c on c.id = b.componente_hijo_id
       where b.componente_padre_id = p_comp_id
    loop
      v_hijo_um  := case when lower(coalesce(r.hijo_um, 'unidad')) = 'kg' then 'kg' else 'uni' end;
      v_hijo_qty := v_qty_canon * coalesce(r.por_unidad, 0);
      if v_hijo_qty > 0 then
        insert into movimiento(fecha, tipo_mov, comp_id, ubic_origen_id, ubic_destino_id,
                               cantidad, unidad_origen, unidad_destino)
        values (coalesce(p_fecha, now()), 'consumo_armado', r.hijo_id, v_ubic_tall, null,
                v_hijo_qty, v_hijo_um, v_hijo_um)
        returning id into v_hijo_mov;
        v_hijos := v_hijos || jsonb_build_object(
          'movimiento_id', v_hijo_mov,
          'componente_id', r.hijo_id,
          'codigo',        r.hijo_cod,
          'cantidad',      v_hijo_qty,
          'unidad',        v_hijo_um);
      end if;
    end loop;
  end if;

  return jsonb_build_object(
    'ok',                    true,
    'id',                    v_mov_id,
    'tallerista',            v_tall_nombre,
    'codigo',                v_cod,
    'es_armado',             v_es_armado,
    'es_transformacion',     v_es_transformacion,
    'comp_entrada_id',       p_comp_entrada_id,
    'destino',               v_destino_nom,
    'ubic_origen_id',        v_ubic_origen,
    'ubic_destino_id',       v_ubic_destino,
    'cantidad',              p_cantidad,
    'unidad',                v_unidad,
    'componentes_descontados', v_hijos
  );
end;
$function$;

-- ---------- crear_envio_prov_at ----------
CREATE OR REPLACE FUNCTION "GP2".crear_envio_prov_at(p_prov_at_id bigint, p_comp_id bigint, p_cantidad numeric, p_unidad text, p_fecha timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare v_ubic_o bigint; v_ubic_d bigint; v_sector int; v_mov bigint;
begin
  if coalesce(p_cantidad,0) <= 0 then raise exception 'Cantidad invalida'; end if;
  select sector_id into v_sector from componente where id = p_comp_id;
  if v_sector is null then raise exception 'Componente % no existe', p_comp_id; end if;
  if v_sector not in (10, 11) then
    raise exception 'Solo se envia carton (sector 10) o cajas (sector 11) a los Prov AT';
  end if;
  select id into v_ubic_o from ubicacion where tipo='sector' and ref_id = v_sector;
  select id into v_ubic_d from ubicacion where tipo='proveedor_at' and ref_id = p_prov_at_id;
  if v_ubic_d is null then raise exception 'El Prov AT % no tiene ubicacion', p_prov_at_id; end if;

  insert into movimiento (fecha, tipo_mov, comp_id, ubic_origen_id, ubic_destino_id, cantidad, unidad_origen, unidad_destino)
  values (coalesce(p_fecha, now()), 'envio_prov_at', p_comp_id, v_ubic_o, v_ubic_d, p_cantidad,
          coalesce(p_unidad,'uni'), coalesce(p_unidad,'uni'))
  returning id into v_mov;
  return jsonb_build_object('ok', true, 'movimiento_id', v_mov);
end $function$;

-- ---------- crear_envio_ps ----------
CREATE OR REPLACE FUNCTION "GP2".crear_envio_ps(p_ps_id bigint, p_comp_sc_id bigint, p_cantidad numeric, p_unidad text, p_fecha timestamp with time zone DEFAULT now(), p_cajones numeric DEFAULT NULL::numeric, p_faltante boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
declare v_orig bigint; v_dest bigint; v_sec_id bigint; v_sec text; v_cod text; v_id bigint;
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a 0';
  end if;
  if lower(coalesce(p_unidad,'')) not in ('kg','uni') then
    raise exception 'Unidad inválida (kg o uni)';
  end if;
  select c.sector_id, s.nombre, c.codigo into v_sec_id, v_sec, v_cod
    from componente c join sector s on s.id=c.sector_id where c.id=p_comp_sc_id;
  if v_sec is null then raise exception 'Componente % inexistente o sin sector', p_comp_sc_id; end if;
  select id into v_orig from ubicacion where tipo='sector' and ref_id=v_sec_id limit 1;
  select id into v_dest from ubicacion where tipo='proveedor_servicio' and ref_id=p_ps_id limit 1;
  if v_orig is null then raise exception 'No hay ubicación para el sector % (id=%)', v_sec, v_sec_id; end if;
  if v_dest is null then raise exception 'No hay ubicación para el proveedor de servicio %', p_ps_id; end if;
  insert into movimiento(fecha,tipo_mov,comp_id,ubic_origen_id,ubic_destino_id,cantidad,unidad_origen,cajones,faltante)
  values (coalesce(p_fecha,now()),'envio_ps',p_comp_sc_id,v_orig,v_dest,p_cantidad,lower(p_unidad),p_cajones,coalesce(p_faltante,false))
  returning id into v_id;
  return jsonb_build_object('ok',true,'id',v_id,'parte',v_cod,'sector',v_sec,
    'origen',v_orig,'destino',v_dest,'cantidad',p_cantidad,'unidad',lower(p_unidad),
    'cajones',p_cajones,'faltante',coalesce(p_faltante,false));
end $function$;

-- ---------- crear_envio_tallerista ----------
CREATE OR REPLACE FUNCTION "GP2".crear_envio_tallerista(p_tallerista_id bigint, p_comp_id bigint, p_cantidad numeric, p_unidad text, p_fecha timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
declare
  v_tall_nombre   text;
  v_sector_nombre text;
  v_sector_id     bigint;
  v_cod           text;
  v_ubic_origen   bigint;
  v_ubic_destino  bigint;
  v_new_id        bigint;
  v_unidad        text := lower(trim(coalesce(p_unidad,'')));
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a 0 (recibido: %).', coalesce(p_cantidad::text,'null');
  end if;
  if v_unidad not in ('kg','uni') then
    raise exception 'Unidad invalida: "%". Debe ser "kg" o "uni".', coalesce(p_unidad,'null');
  end if;

  select nombre into v_tall_nombre from tallerista where id = p_tallerista_id;
  if v_tall_nombre is null then
    raise exception 'Tallerista inexistente (id=%).', p_tallerista_id;
  end if;

  select id into v_ubic_destino from ubicacion
   where tipo = 'tallerista' and ref_id = p_tallerista_id limit 1;
  if v_ubic_destino is null then
    raise exception 'El tallerista "%" (id=%) no tiene ubicacion asociada (tipo=tallerista).', v_tall_nombre, p_tallerista_id;
  end if;

  select c.codigo, c.sector_id, s.nombre into v_cod, v_sector_id, v_sector_nombre
    from componente c left join sector s on s.id = c.sector_id
   where c.id = p_comp_id;
  if not found then
    raise exception 'Componente inexistente (id=%).', p_comp_id;
  end if;
  if v_sector_id is null then
    raise exception 'El componente "%" (id=%) no tiene sector asignado; no se puede resolver el origen.', coalesce(v_cod,'?'), p_comp_id;
  end if;

  select id into v_ubic_origen from ubicacion
   where tipo = 'sector' and ref_id = v_sector_id limit 1;
  if v_ubic_origen is null then
    raise exception 'No existe ubicacion de sector para "%" (componente % / id=%).', coalesce(v_sector_nombre, v_sector_id::text), coalesce(v_cod,'?'), p_comp_id;
  end if;

  insert into movimiento(
    fecha, tipo_mov, comp_id, ubic_origen_id, ubic_destino_id, cantidad, unidad_origen, unidad_destino
  ) values (
    coalesce(p_fecha, now()), 'envio_tallerista', p_comp_id, v_ubic_origen, v_ubic_destino, p_cantidad, v_unidad, v_unidad
  ) returning id into v_new_id;

  return jsonb_build_object(
    'ok', true, 'id', v_new_id, 'tallerista', v_tall_nombre, 'codigo', v_cod,
    'sector', v_sector_nombre, 'ubic_origen_id', v_ubic_origen, 'ubic_destino_id', v_ubic_destino,
    'cantidad', p_cantidad, 'unidad', v_unidad
  );
end;
$function$;

-- ---------- crear_oc ----------
CREATE OR REPLACE FUNCTION "GP2".crear_oc(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare v_oc bigint; v_num int; it jsonb; v_n int := 0;
begin
  select coalesce(max(numero),0)+1 into v_num from orden_compra;
  insert into orden_compra (numero, proveedor, rubro, nota, creado_por)
  values (v_num, nullif(p->>'proveedor',''), nullif(p->>'rubro',''), nullif(p->>'nota',''), nullif(p->>'usuario',''))
  returning id into v_oc;
  for it in select * from jsonb_array_elements(coalesce(p->'items','[]'::jsonb)) loop
    if coalesce((it->>'cantidad')::numeric,0) > 0 then
      insert into orden_compra_item (oc_id, componente_id, cantidad, unidad)
      values (v_oc, (it->>'comp_id')::bigint, (it->>'cantidad')::numeric, coalesce(nullif(it->>'unidad',''),'uni'));
      v_n := v_n + 1;
    end if;
  end loop;
  if v_n = 0 then raise exception 'La OC no tiene items'; end if;
  return jsonb_build_object('ok', true, 'oc_id', v_oc, 'numero', v_num, 'items', v_n);
end $function$;

-- ---------- crear_recepcion_insumo ----------
CREATE OR REPLACE FUNCTION "GP2".crear_recepcion_insumo(p_comp_id bigint, p_proveedor text, p_cantidad numeric, p_unidad text, p_remito text DEFAULT NULL::text, p_fecha timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare v_sec bigint; v_um text; v_ubic bigint; v_u text; v_movid bigint; v_recid bigint; v_f timestamptz; v_oc jsonb;
begin
  if p_cantidad is null or p_cantidad<=0 then raise exception 'La cantidad debe ser mayor a 0'; end if;
  select sector_id, unidad_medida into v_sec, v_um from "GP2".componente where id=p_comp_id;
  if v_sec is null then raise exception 'El insumo no existe'; end if;
  if not "GP2"._es_sector_insumo(v_sec) then raise exception 'El componente % no es un insumo (sector no comprable)', p_comp_id; end if;
  select id into v_ubic from "GP2".ubicacion where tipo='sector' and ref_id=v_sec limit 1;
  if v_ubic is null then raise exception 'No hay ubicacion para el sector del insumo'; end if;
  v_u := case when lower(coalesce(nullif(p_unidad,''), v_um, 'uni'))='kg' then 'kg' else 'uni' end;
  v_f := coalesce(p_fecha, now());
  insert into "GP2".movimiento(fecha,tipo_mov,comp_id,ubic_origen_id,ubic_destino_id,cantidad,unidad_origen,unidad_destino)
  values(v_f,'compra',p_comp_id,null,v_ubic,p_cantidad,v_u,v_u) returning id into v_movid;
  insert into "GP2".recepcion_insumo(fecha,componente_id,proveedor,remito,cantidad,unidad,movimiento_id)
  values(v_f,p_comp_id,nullif(btrim(coalesce(p_proveedor,'')),''),nullif(btrim(coalesce(p_remito,'')),''),p_cantidad,v_u,v_movid)
  returning id into v_recid;
  v_oc := "GP2"._aplicar_recepcion_a_oc(p_comp_id, p_cantidad, v_u);
  return jsonb_build_object('ok',true,'recepcion_id',v_recid,'movimiento_id',v_movid,'unidad',v_u,'oc_cruzada',v_oc);
end $function$;

-- ---------- despiece_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".despiece_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
select jsonb_build_object(
  'sect', (select jsonb_object_agg(id::text, jsonb_build_object('tipo',tipo,'nom',nombre)) from "GP2".sector),
  'art', (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id',  a.id,
        'cod', a.codigo,
        'fam', a.familia,
        'por', a.articulos_por_caja,
        'caja',a.componente_caja_id,
        'est', a.estadistica_madre_uni_mes,
        'comp', coalesce((
          select jsonb_agg(jsonb_build_object(
            'cod', c.codigo,
            'd',   c.descripcion,
            's',   c.sector_id,
            'um',  c.unidad_medida,
            'q',   ac.cantidad,
            'kg',  c.kg_x_uni,
            'uxc', c.uni_x_cajon
          ) order by c.sector_id nulls last, c.codigo)
          from "GP2".articulo_componente ac
          join "GP2".componente c on c.id = ac.componente_id
          where ac.articulo_id = a.id
        ), '[]'::jsonb)
      ) order by a.codigo
    ), '[]'::jsonb)
    from "GP2".articulo a
  )
);
$function$;

-- ---------- devoluciones_tallerista_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".devoluciones_tallerista_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
select jsonb_build_object(
  'talleristas', (select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'nombre',t.nombre) order by t.nombre),'[]'::jsonb)
    from tallerista t),
  -- lo que cada tallerista tiene online (posiciones <> 0): de ahi elige que devolver
  'online', (select coalesce(jsonb_agg(jsonb_build_object(
      'tall_id',u.ref_id,'comp_id',c.id,'codigo',c.codigo,'descripcion',c.descripcion,
      'sector',s.nombre,'cantidad',i.cantidad,'um',c.unidad_medida,
      'kg_x_uni',c.kg_x_uni,'uni_x_cajon',c.uni_x_cajon) order by c.codigo),'[]'::jsonb)
    from inventario i
    join ubicacion u on u.id=i.ubicacion_id and u.tipo='tallerista'
    join componente c on c.id=i.componente_id
    left join sector s on s.id=c.sector_id
    where i.cantidad <> 0),
  -- stock apartado en "Para Analizar"
  'analizar', (select coalesce(jsonb_agg(jsonb_build_object(
      'comp_id',c.id,'codigo',c.codigo,'descripcion',c.descripcion,'cantidad',i.cantidad,
      'um',c.unidad_medida) order by c.codigo),'[]'::jsonb)
    from inventario i
    join ubicacion u on u.id=i.ubicacion_id and u.tipo='analisis'
    join componente c on c.id=i.componente_id
    where i.cantidad <> 0),
  'ultimas', (select coalesce(jsonb_agg(jsonb_build_object(
      'fecha',m.fecha,'tallerista',t.nombre,'codigo',c.codigo,'cantidad',m.cantidad,
      'unidad',m.unidad_origen,'destino',d.destino,'motivo',d.motivo) order by m.fecha desc),'[]'::jsonb)
    from (select * from devolucion_tallerista order by id desc limit 30) d
    join movimiento m on m.id=d.movimiento_id
    join tallerista t on t.id=d.tallerista_id
    join componente c on c.id=m.comp_id)
);
$function$;

-- ---------- disruptivas_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".disruptivas_bundle(p_desde date DEFAULT NULL::date, p_hasta date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
select jsonb_build_object(
  'empleados', coalesce((
    select jsonb_object_agg(legajo, nom)
    from (
      select legajo,
             (array_agg(nombre_empleado) filter (where nombre_empleado is not null and nombre_empleado <> ''))[1] nom
      from "GP2".produccion
      where legajo is not null and legajo <> ''
      group by legajo
    ) e
  ), '{}'::jsonb),
  'rows', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', id,
      'Fecha', to_char(fecha, 'YYYY-MM-DD'),
      'Legajo', legajo,
      'Nombre_Empleado', nombre_empleado,
      'Matriz', matriz_raw,
      'Nombre_Matriz', nombre_matriz,
      'Uni', uni,
      'Segundos_Trabajados', segundos_trabajados,
      'Segundos_Historico', segundos_historico,
      'Segundos_Tiempo_Muerto', segundos_tiempo_muerto,
      'Tiempo_Historico', tiempo_historico,
      'Hora_Inicio', to_char(hora_inicio,'HH24:MI:SS'),
      'Hora_Fin', to_char(hora_fin,'HH24:MI:SS'),
      'Premio', premio,
      'Anular_Tiempo', anular_tiempo,
      'Revisado', revisado
    ) order by matriz_raw, fecha desc)
    from "GP2".produccion
    where (eliminar is null or eliminar <> 'S')
      and (revisado is null or revisado = false)
      and (anular_tiempo is null or anular_tiempo = false)
      and matriz_raw ~ '^\d+\w*$'
      and coalesce(legajo,'') <> '1'
      and matriz_raw not in ('501','502','252')
      and coalesce(tiempo_historico,0) > 0
      and ((premio > 5 and premio < 9.5) or premio < -5)
      and (p_desde is null or fecha >= p_desde)
      and (p_hasta is null or fecha < (p_hasta + 1))
  ), '[]'::jsonb)
);
$function$;

-- ---------- entregas_tallerista_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".entregas_tallerista_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
with ent as (
  select
    m.id,
    m.fecha,
    uo.ref_id        as tall_id,
    m.comp_id,
    c.codigo         as cod,
    c.descripcion    as descripcion,
    s.nombre         as sector,
    m.cantidad       as cantidad,
    m.unidad_origen  as unidad,
    c.kg_x_uni       as kg_x_uni,
    case
      when m.unidad_origen = 'uni' then m.cantidad
      when m.unidad_origen = 'kg' and coalesce(c.kg_x_uni,0) > 0 then round((m.cantidad / c.kg_x_uni)::numeric, 2)
      else null
    end              as uni
  from movimiento m
  join componente c on c.id = m.comp_id
  left join sector s on s.id = c.sector_id
  left join ubicacion uo on uo.id = m.ubic_origen_id and uo.tipo = 'tallerista'
  where m.tipo_mov = 'entrega_tallerista'
),
filas as (
  select jsonb_build_object(
    'id', e.id,
    'fecha', e.fecha,
    'tall_id', e.tall_id,
    'tallerista', t.nombre,
    'cod_prov', t.cod_prov,
    'comp_id', e.comp_id,
    'cod', e.cod,
    'desc', e.descripcion,
    'sector', e.sector,
    'cantidad', e.cantidad,
    'unidad', e.unidad,
    'uni', e.uni
  ) as fila,
  e.fecha as fsort,
  e.id as isort
  from ent e
  left join tallerista t on t.id = e.tall_id
),
talls as (
  select jsonb_agg(jsonb_build_object('id', t.id, 'nombre', t.nombre, 'cod_prov', t.cod_prov) order by t.nombre) as arr
  from tallerista t
  where t.id in (select distinct tall_id from ent where tall_id is not null)
)
select jsonb_build_object(
  'generado_en', now(),
  'total', (select count(*) from ent),
  'talleristas', coalesce((select arr from talls), '[]'::jsonb),
  'entregas', coalesce((select jsonb_agg(f.fila order by f.fsort desc nulls last, f.isort desc) from filas f), '[]'::jsonb)
);
$function$;

-- ---------- envios_prov_at_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".envios_prov_at_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
select jsonb_build_object(
  'provs', (select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nombre',p.nombre) order by p.nombre),'[]'::jsonb)
    from proveedor_at p where coalesce(p.activo,true)),
  'insumos', (select coalesce(jsonb_agg(jsonb_build_object(
      'comp_id',c.id,'codigo',c.codigo,'descripcion',c.descripcion,'sector_id',c.sector_id,
      'sector',s.nombre,'um',c.unidad_medida,
      'online',(select i.cantidad from inventario i join ubicacion u on u.id=i.ubicacion_id
                 where i.componente_id=c.id and u.tipo='sector' and u.ref_id=c.sector_id limit 1)
    ) order by c.sector_id, c.codigo),'[]'::jsonb)
    from componente c join sector s on s.id=c.sector_id where c.sector_id in (10,11)),
  'online_prov', (select coalesce(jsonb_agg(jsonb_build_object(
      'prov_id',u.ref_id,'comp_id',i.componente_id,'cantidad',i.cantidad)),'[]'::jsonb)
    from inventario i join ubicacion u on u.id=i.ubicacion_id
    where u.tipo='proveedor_at' and i.cantidad <> 0),
  'ultimos', (select coalesce(jsonb_agg(jsonb_build_object(
      'fecha',m.fecha,'comp',c.codigo,'cantidad',m.cantidad,'prov',p.nombre) order by m.id desc),'[]'::jsonb)
    from (select * from movimiento where tipo_mov='envio_prov_at' order by id desc limit 30) m
    join componente c on c.id=m.comp_id
    join ubicacion u on u.id=m.ubic_destino_id
    join proveedor_at p on p.id=u.ref_id),
  'paq', (select valor from parametro where clave='carton_uni_x_paquete'));
$function$;

-- ---------- envios_ps_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".envios_ps_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
with pares as (
  select distinct rp.proveedor_id, rp.comp_entrada_id sc_id, rp.comp_salida_id sp_id
  from ruta_paso rp
  where rp.tipo_paso='proveedor_servicio' and rp.proveedor_id is not null
    and rp.comp_entrada_id is not null
),
ubic_ps as (select ref_id ps_id, id ubic_id from ubicacion where tipo='proveedor_servicio'),
fila as (
  select p.proveedor_id, ps.proceso,
         sc.id sc_id, sc.codigo sc_cod, sc.descripcion sc_desc,
         sc.unidad_medida sc_um, sc.kg_x_uni sc_kgxuni, sc.uni_x_cajon sc_unixcaj,
         ssc.nombre sc_sector,
         sp.id sp_id, sp.codigo sp_cod, sp.descripcion sp_desc, sp.uni_x_cajon sp_unixcaj,
         (select i.cantidad from inventario i join ubicacion u on u.id=i.ubicacion_id
           where i.componente_id=sc.id and u.tipo='sector' and u.ref_id=sc.sector_id limit 1) online_sc,
         (select i.cantidad from inventario i where i.componente_id=sc.id
            and i.ubicacion_id=(select ubic_id from ubic_ps where ps_id=p.proveedor_id) limit 1) online_ps,
         (select i.maximo from inventario i where i.componente_id=sc.id
            and i.ubicacion_id=(select ubic_id from ubic_ps where ps_id=p.proveedor_id) limit 1) maximo,
         (select i.cantidad from inventario i join ubicacion u on u.id=i.ubicacion_id
           where i.componente_id=sp.id and u.tipo='sector' and u.ref_id=sp.sector_id limit 1) online_sp,
         -- maximo FISICO del SP en el Sector Procesado: la base del "sugerido a enviar"
         -- (enviar = maximo_sp - online_sp - online_ps, regla del usuario 2026-08-29)
         (select i.maximo from inventario i join ubicacion u on u.id=i.ubicacion_id
           where i.componente_id=sp.id and u.tipo='sector' and u.ref_id=sp.sector_id limit 1) maximo_sp
  from pares p
  join proveedor_servicio ps on ps.id=p.proveedor_id
  join componente sc on sc.id=p.sc_id
  join sector ssc on ssc.id=sc.sector_id
  left join componente sp on sp.id=p.sp_id
)
select jsonb_build_object(
  'ps', (select coalesce(jsonb_agg(jsonb_build_object(
            'id',ps.id,'nombre',ps.nombre,'cod_prov',ps.cod_prov,'proceso',ps.proceso
          ) order by ps.nombre),'[]'::jsonb)
        from proveedor_servicio ps
        where exists (select 1 from pares p where p.proveedor_id=ps.id)),
  'partes', (select coalesce(jsonb_object_agg(proveedor_id::text, arr),'{}'::jsonb) from (
        select proveedor_id, jsonb_agg(jsonb_build_object(
          'sc_id',sc_id,'sc_cod',sc_cod,'sc_desc',sc_desc,'sc_sector',sc_sector,
          'sc_um',sc_um,'sc_kgxuni',sc_kgxuni,'sc_unixcaj',sc_unixcaj,
          'sp_id',sp_id,'sp_cod',sp_cod,'sp_desc',sp_desc,'sp_unixcaj',sp_unixcaj,
          'proceso',proceso,
          'online_sc',coalesce(online_sc,0),'online_ps',coalesce(online_ps,0),
          'online_sp',coalesce(online_sp,0),'maximo',maximo,'maximo_sp',maximo_sp
        ) order by sc_cod) arr
        from fila group by proveedor_id) z)
);
$function$;

-- ---------- envios_tallerista_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".envios_tallerista_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
with env as (
  select
    m.id,
    m.fecha,
    ud.ref_id                 as tall_id,
    m.comp_id,
    c.codigo                  as cod,
    c.descripcion             as descripcion,
    s.nombre                  as sector,
    m.cantidad                as cantidad,
    m.unidad_origen           as unidad,
    c.kg_x_uni                as kg_x_uni,
    case
      when m.unidad_origen = 'uni' then m.cantidad
      when m.unidad_origen = 'kg' and coalesce(c.kg_x_uni,0) > 0 then round((m.cantidad / c.kg_x_uni)::numeric, 2)
      else null
    end                       as uni
  from movimiento m
  join componente c on c.id = m.comp_id
  left join sector s on s.id = c.sector_id
  left join ubicacion ud on ud.id = m.ubic_destino_id and ud.tipo = 'tallerista'
  where m.tipo_mov = 'envio_tallerista'
),
filas as (
  select jsonb_build_object(
    'id', e.id,
    'fecha', e.fecha,
    'tall_id', e.tall_id,
    'tallerista', t.nombre,
    'cod_prov', t.cod_prov,
    'comp_id', e.comp_id,
    'cod', e.cod,
    'desc', e.descripcion,
    'sector', e.sector,
    'cantidad', e.cantidad,
    'unidad', e.unidad,
    'uni', e.uni
  ) as fila,
  e.fecha as fsort,
  e.id as isort
  from env e
  left join tallerista t on t.id = e.tall_id
),
talls as (
  select jsonb_agg(jsonb_build_object('id', t.id, 'nombre', t.nombre, 'cod_prov', t.cod_prov) order by t.nombre) as arr
  from tallerista t
  where t.id in (select distinct tall_id from env where tall_id is not null)
),
-- ==== opciones para el formulario "Nuevo envio" ====
-- talleristas que tienen ubicacion (pueden recibir un envio)
talls_todos as (
  select jsonb_agg(jsonb_build_object(
           'id', t.id, 'nombre', t.nombre, 'clase', t.clase, 'cod_prov', t.cod_prov
         ) order by t.nombre) as arr
  from tallerista t
  where exists (select 1 from ubicacion u where u.tipo='tallerista' and u.ref_id = t.id)
),
-- catalogo completo de partes (componentes) usado como fallback del selector
partes_all as (
  select jsonb_agg(jsonb_build_object(
           'comp_id', c.id, 'cod', c.codigo, 'desc', c.descripcion,
           'sector', s.nombre, 'unidad_medida', c.unidad_medida
         ) order by c.codigo, c.id) as arr
  from componente c
  left join sector s on s.id = c.sector_id
  where c.sector_id is not null
),
-- partes por tallerista: comp de ENTRADA de los pasos tipo tallerista en ruta_paso
ppt_pairs as (
  select distinct rp.tallerista_id as tall_id, rp.comp_entrada_id as comp_id
  from ruta_paso rp
  where rp.tallerista_id is not null
    and rp.tipo_paso = 'tallerista'
    and rp.comp_entrada_id is not null
),
ppt as (
  select p.tall_id,
         jsonb_agg(jsonb_build_object(
           'comp_id', c.id, 'cod', c.codigo, 'desc', c.descripcion,
           'sector', s.nombre, 'unidad_medida', c.unidad_medida
         ) order by c.codigo, c.id) as partes
  from ppt_pairs p
  join componente c on c.id = p.comp_id
  left join sector s on s.id = c.sector_id
  where c.sector_id is not null
  group by p.tall_id
),
ppt_obj as (
  select coalesce(jsonb_object_agg(tall_id::text, partes), '{}'::jsonb) as obj from ppt
)
select jsonb_build_object(
  'generado_en', now(),
  'total', (select count(*) from env),
  'talleristas', coalesce((select arr from talls), '[]'::jsonb),
  'talleristas_todos', coalesce((select arr from talls_todos), '[]'::jsonb),
  'partes', coalesce((select arr from partes_all), '[]'::jsonb),
  'partes_por_tallerista', (select obj from ppt_obj),
  'envios', coalesce((select jsonb_agg(f.fila order by f.fsort desc nulls last, f.isort desc) from filas f), '[]'::jsonb)
);
$function$;

-- ---------- faltante_partes_tallerista_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".faltante_partes_tallerista_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
with mov as (
  -- normaliza cada movimiento a: tallerista, componente, enviado/entregado en unidades + kg crudo
  select
    case when m.tipo_mov = 'envio_tallerista' then ud.ref_id else uo.ref_id end as tall_id,
    m.comp_id,
    m.tipo_mov,
    case
      when m.unidad_origen = 'uni' then m.cantidad
      when m.unidad_origen = 'kg' and coalesce(c.kg_x_uni,0) > 0 then m.cantidad / c.kg_x_uni
      else 0
    end as uni,
    case when m.unidad_origen = 'kg' then m.cantidad else 0 end as kg_raw,
    case when m.unidad_origen = 'kg' and coalesce(c.kg_x_uni,0) = 0 then 1 else 0 end as kg_sin_factor
  from movimiento m
  join componente c on c.id = m.comp_id
  left join ubicacion uo on uo.id = m.ubic_origen_id
  left join ubicacion ud on ud.id = m.ubic_destino_id
  where m.tipo_mov in ('envio_tallerista','entrega_tallerista','consumo_tall','devolucion_tallerista')
),
agg as (
  select
    mov.tall_id,
    mov.comp_id,
    sum(case when mov.tipo_mov = 'envio_tallerista'   then mov.uni else 0 end) as enviado,
    sum(case when mov.tipo_mov in ('entrega_tallerista','consumo_tall') then mov.uni else 0 end) as entregado,
    sum(case when mov.tipo_mov = 'devolucion_tallerista' then mov.uni else 0 end) as devuelto,
    sum(case when mov.tipo_mov = 'envio_tallerista'   then mov.kg_raw else 0 end) as enviado_kg,
    max(mov.kg_sin_factor) as kg_sin_factor
  from mov
  group by mov.tall_id, mov.comp_id
),
saldos as (
  -- saldo = enviado - entregado - devuelto = lo que el tallerista todavia tiene en su poder
  -- se excluye saldo exacto = 0 (nada pendiente). saldos negativos se muestran tal cual (ledger parcial).
  select
    a.*,
    round((a.enviado - a.entregado - a.devuelto)::numeric, 2) as saldo
  from agg a
),
partes as (
  select
    s.tall_id,
    jsonb_build_object(
      'comp_id', s.comp_id,
      'cod', c.codigo,
      'desc', c.descripcion,
      'sector', sec.nombre,
      'kg_x_uni', c.kg_x_uni,
      'enviado', round(s.enviado::numeric, 2),
      'entregado', round(s.entregado::numeric, 2),
      'devuelto', round(s.devuelto::numeric, 2),
      'saldo', s.saldo,
      'enviado_kg', round(s.enviado_kg::numeric, 3),
      'kg_sin_factor', (s.kg_sin_factor = 1)
    ) as parte,
    s.saldo as saldo_sort
  from saldos s
  join componente c on c.id = s.comp_id
  left join sector sec on sec.id = c.sector_id
  where s.saldo <> 0
),
por_tall as (
  select
    p.tall_id,
    -- ordenadas por saldo DESC: mayor pendiente en poder del tallerista primero
    jsonb_agg(p.parte order by p.saldo_sort desc) as partes,
    count(*) as n_partes,
    count(*) filter (where p.saldo_sort > 0) as n_saldo_pos,
    count(*) filter (where p.saldo_sort < 0) as n_saldo_neg,
    round(sum(p.saldo_sort),2)                              as tot_saldo,
    round(sum(p.saldo_sort) filter (where p.saldo_sort > 0),2) as tot_pendiente,
    round(sum(p.saldo_sort) filter (where p.saldo_sort < 0),2) as tot_negativo
  from partes p
  group by p.tall_id
)
select jsonb_build_object(
  'generado_en', now(),
  'talleristas', coalesce(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'nombre', t.nombre,
      'cod_prov', t.cod_prov,
      'n_partes', pt.n_partes,
      'n_saldo_pos', pt.n_saldo_pos,
      'n_saldo_neg', pt.n_saldo_neg,
      'tot_saldo', pt.tot_saldo,
      'tot_pendiente', coalesce(pt.tot_pendiente,0),
      'tot_negativo', coalesce(pt.tot_negativo,0),
      'partes', pt.partes
    ) order by pt.tot_pendiente desc nulls last
  ), '[]'::jsonb)
)
from por_tall pt
join tallerista t on t.id = pt.tall_id;
$function$;

-- ---------- faltantes_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".faltantes_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
select jsonb_build_object(
  'sect', (select jsonb_object_agg(id::text, jsonb_build_object('tipo',tipo,'nom',nombre)) from "GP2".sector),
  'ubic', (select jsonb_object_agg(id::text, jsonb_build_object('tipo',tipo,'ref',ref_id,'nom',nombre,'meses',meses_minimo)) from "GP2".ubicacion),
  'art', (select jsonb_agg(jsonb_build_object('id',id,'cod',codigo,'fam',familia,'cja',componente_caja_id,'por',articulos_por_caja,'est',estadistica_madre_uni_mes) order by id) from "GP2".articulo),
  'comp', (select jsonb_object_agg(id::text, jsonb_build_object('cod',codigo,'d',descripcion,'s',sector_id,'um',unidad_medida,'kg_x_uni',kg_x_uni)) from "GP2".componente),
  'prov_serv', (select jsonb_object_agg(id::text, jsonb_build_object('nom',nombre)) from "GP2".proveedor_servicio),
  'tall', (select jsonb_object_agg(id::text, jsonb_build_object('nom',nombre)) from "GP2".tallerista),
  'mat', (select jsonb_object_agg(id::text, jsonb_build_object('n',n_matriz,'d',descripcion,'tipo',tipo,'ppk',partes_por_kilo_de_fleje,'primera',coalesce(primera_del_fleje='SI',false))) from "GP2".matriz),
  'bom_art', (select jsonb_object_agg(articulo_id::text, arr) from (
        select articulo_id, jsonb_agg(jsonb_build_object('c',componente_id,'q',cantidad)) arr
        from "GP2".articulo_componente where articulo_id is not null group by articulo_id) x),
  'bom_comp', (select jsonb_object_agg(componente_padre_id::text, arr) from (
        select componente_padre_id, jsonb_agg(jsonb_build_object('c',componente_hijo_id,'q',cantidad)) arr
        from "GP2".componente_bom where componente_padre_id is not null group by componente_padre_id) x),
  'rp', (select jsonb_object_agg(ruta_id::text, arr) from (
        select ruta_id, jsonb_agg(jsonb_build_object('o',orden,'tipo',tipo_paso,'flje',componente_fleje_id,'mat',matriz_id,'prov',proveedor_id,'tall',tallerista_id,'ce',comp_entrada_id,'cs',comp_salida_id,'art',articulo_id) order by orden) arr
        from "GP2".ruta_paso where ruta_id is not null group by ruta_id) x),
  'inv', (select jsonb_object_agg(componente_id::text||':'||ubicacion_id::text, jsonb_build_object('cant',cantidad,'min',minimo)) from "GP2".inventario),
  'c2a', '{}'::jsonb
);
$function$;

-- ---------- fleje_detalle_upsert ----------
CREATE OR REPLACE FUNCTION "GP2".fleje_detalle_upsert(p_comp_id bigint, p_proveedor text, p_medida text, p_cons numeric, p_kgcaj numeric, p_cod_isis text, p_kg_uni_desp numeric DEFAULT NULL::numeric, p_parte text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
begin
  if not exists(select 1 from "GP2".componente where id=p_comp_id and sector_id=5) then
    raise exception 'El componente % no es un fleje (Sector Fleje)', p_comp_id;
  end if;
  insert into "GP2".fleje_detalle(componente_id, proveedor, medida_mm, cons_mensual, kg_x_cajon, cod_isis, kg_uni_desp, descripcion_parte, actualizado_en)
  values(p_comp_id, nullif(p_proveedor,''), nullif(p_medida,''), p_cons, p_kgcaj, nullif(p_cod_isis,''), p_kg_uni_desp, nullif(p_parte,''), now())
  on conflict (componente_id) do update set
    proveedor=nullif(p_proveedor,''), medida_mm=nullif(p_medida,''), cons_mensual=p_cons,
    kg_x_cajon=p_kgcaj, cod_isis=nullif(p_cod_isis,''), kg_uni_desp=p_kg_uni_desp,
    descripcion_parte=nullif(p_parte,''), actualizado_en=now();
  return jsonb_build_object('ok',true,'comp_id',p_comp_id);
end $function$;

-- ---------- flejes_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".flejes_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
  with ubf as (select id from "GP2".ubicacion where tipo='sector' and ref_id=5 limit 1)
  select coalesce(jsonb_agg(jsonb_build_object(
      'comp_id', c.id, 'codigo', c.codigo, 'descripcion', c.descripcion,
      'n_fleje', coalesce(d.n_fleje, (regexp_match(c.descripcion,'(\d+)'))[1]),
      'parte', d.descripcion_parte,
      'medida', d.medida_mm, 'proveedor', d.proveedor,
      'cons_mensual', d.cons_mensual, 'kg_x_cajon', d.kg_x_cajon,
      'kg_uni_desp', d.kg_uni_desp, 'cod_isis', d.cod_isis,
      'stock', coalesce(i.cantidad,0), 'minimo', coalesce(i.minimo,0)
    ) order by (regexp_match(c.descripcion,'(\d+)'))[1]::int nulls last, c.codigo),'[]'::jsonb)
  from "GP2".componente c
  left join "GP2".fleje_detalle d on d.componente_id=c.id
  left join ubf on true
  left join "GP2".inventario i on i.componente_id=c.id and i.ubicacion_id=ubf.id
  where c.sector_id=5;
$function$;

-- ---------- fn_entregas_virgilio_espejo ----------
CREATE OR REPLACE FUNCTION "GP2".fn_entregas_virgilio_espejo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
declare
  v_nom  text := upper(btrim(coalesce(NEW."Nombre_Tall",'')));
  v_tipo text; v_ref bigint;
  v_art record; v_uni numeric; v_fecha timestamptz;
begin
  begin
    if coalesce(btrim(NEW."Cod"),'') = '' then return NEW; end if;

    begin v_fecha := nullif(btrim(coalesce(NEW."Fecha",'')),'')::timestamptz;
    exception when others then v_fecha := null; end;
    v_fecha := coalesce(v_fecha, now());

    select a.tipo, a.ref_id into v_tipo, v_ref from contraparte_alias a where a.alias = v_nom;
    if v_tipo is null then
      select 'tallerista', t.id into v_tipo, v_ref from tallerista t
       where upper(t.nombre)=v_nom or upper(t.nombre) ~ ('(^|\s)'||v_nom||'($|\s)') limit 1;
    end if;
    if v_tipo is null then
      select 'proveedor_at', p.id into v_tipo, v_ref from proveedor_at p where upper(p.nombre)=v_nom limit 1;
    end if;
    if v_tipo is null then
      insert into virgilio_espejo_pend(entrega_id,fecha,nombre_tall,cod,cajas,motivo)
      values (NEW.id, NEW."Fecha", NEW."Nombre_Tall", NEW."Cod", NEW."Cajas", 'contraparte sin resolver');
      return NEW;
    end if;

    -- articulo: exacto primero, despues sin ceros de adelante en ambos lados
    select a.id, a.articulos_por_caja into v_art from articulo a
     where a.codigo = btrim(NEW."Cod")
        or regexp_replace(a.codigo,'^0+','') = regexp_replace(btrim(NEW."Cod"),'^0+','')
     order by (a.codigo = btrim(NEW."Cod")) desc limit 1;
    if v_art.id is null then
      insert into virgilio_espejo_pend(entrega_id,fecha,nombre_tall,cod,cajas,motivo)
      values (NEW.id, NEW."Fecha", NEW."Nombre_Tall", NEW."Cod", NEW."Cajas", 'articulo sin equivalente en GP2');
      return NEW;
    end if;

    v_uni := coalesce(NEW."Cajas",0) * coalesce(v_art.articulos_por_caja,0);
    if v_uni <= 0 then
      insert into virgilio_espejo_pend(entrega_id,fecha,nombre_tall,cod,cajas,motivo)
      values (NEW.id, NEW."Fecha", NEW."Nombre_Tall", NEW."Cod", NEW."Cajas", 'cantidad en cero');
      return NEW;
    end if;

    perform "GP2".recepcion_virgilio(jsonb_build_object(
      'fecha', v_fecha, 'origen_tipo', v_tipo, 'origen_id', v_ref,
      'remito', NEW."Remito",
      'items', jsonb_build_array(jsonb_build_object('articulo_id', v_art.id, 'cantidad', v_uni))));
  exception when others then
    insert into virgilio_espejo_pend(entrega_id,fecha,nombre_tall,cod,cajas,motivo)
    values (NEW.id, NEW."Fecha", NEW."Nombre_Tall", NEW."Cod", NEW."Cajas", 'error: '||sqlerrm);
  end;
  return NEW;
end $function$;

-- ---------- fn_espejo_entrega_tallerista ----------
CREATE OR REPLACE FUNCTION "GP2".fn_espejo_entrega_tallerista()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
declare v_tid bigint; v_orig bigint; v_art bigint; v_uxc numeric; v_uni numeric; v_virg bigint;
begin
  begin
    if new."Cod_GRJ" is not null then return null; end if;
    select ta.tallerista_id into v_tid from "GP2".tallerista_alias ta where ta.alias = trim(new."Nombre_Tall");
    if v_tid is null then return null; end if;
    select u.id into v_orig from "GP2".ubicacion u where u.tipo='tallerista' and u.ref_id=v_tid;
    select a.id, coalesce(a.articulos_por_caja,1) into v_art, v_uxc from "GP2".articulo a
      where regexp_replace(upper(trim(a.codigo)),'^0+','') = regexp_replace(upper(trim(new."Cod"::text)),'^0+','');
    if v_art is null then return null; end if;
    select id into v_virg from "GP2".ubicacion where tipo='virgilio' limit 1;
    v_uni := coalesce(new."Cajas",0) * v_uxc;
    if v_uni <= 0 then return null; end if;
    insert into "GP2".movimiento (fecha, tipo_mov, comp_id, ubic_origen_id, ubic_destino_id, cantidad, unidad_origen, unidad_destino)
    select new.created_at, 'entrega_tallerista', ac.componente_id, v_orig, v_virg, v_uni*ac.cantidad, 'uni','uni'
    from "GP2".articulo_componente ac
    join "GP2".componente c on c.id=ac.componente_id
    join "GP2".sector s on s.id=c.sector_id
    where ac.articulo_id=v_art and s.tipo not in ('caja','cartón') and v_uni*ac.cantidad > 0;
  exception when others then
    raise warning 'GP2.fn_espejo_entrega_tallerista fallo (id %): %', new.id, sqlerrm;
  end;
  return null;
end $function$;

-- ---------- fn_espejo_produccion ----------
CREATE OR REPLACE FUNCTION "GP2".fn_espejo_produccion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
begin
  begin
    insert into "GP2".produccion (
      espejo_id, fecha, legajo, nombre_empleado, matriz_raw, nombre_matriz, matriz_id,
      uni, premio, tiempo_toma, tiempo_historico, hora_inicio, hora_fin, anular_tiempo,
      segundos_historico, segundos_trabajados, segundos_tiempo_muerto,
      dia, mes, quincena, id_ejecucion, eliminar, revisado, fecha_inicio, fecha_fin, origen_created_at
    )
    values (
      new.id, new."Fecha", new."Legajo", new."Nombre_Empleado", new."Matriz", new."Nombre_Matriz",
      (select m.id from "GP2".matriz m where m.n_matriz::text = new."Matriz" limit 1),
      new."Uni", new."Premio", new."Tiempo_Toma", new."Tiempo_Historico", new."Hora_Inicio", new."Hora_Fin", new."Anular_Tiempo",
      new."Segundos_Historico", new."Segundos_Trabajados", new."Segundos_Tiempo_Muerto",
      new."Dia", new."Mes", new."Quincena", new."ID_Ejecucion", new."Eliminar", new."Revisado", new."Fecha_Inicio", new."Fecha_Fin", new."created_at"
    )
    on conflict (espejo_id) do update set
      fecha=excluded.fecha, legajo=excluded.legajo, nombre_empleado=excluded.nombre_empleado,
      matriz_raw=excluded.matriz_raw, nombre_matriz=excluded.nombre_matriz, matriz_id=excluded.matriz_id,
      uni=excluded.uni, premio=excluded.premio, tiempo_toma=excluded.tiempo_toma, tiempo_historico=excluded.tiempo_historico,
      hora_inicio=excluded.hora_inicio, hora_fin=excluded.hora_fin, anular_tiempo=excluded.anular_tiempo,
      segundos_historico=excluded.segundos_historico, segundos_trabajados=excluded.segundos_trabajados,
      segundos_tiempo_muerto=excluded.segundos_tiempo_muerto, dia=excluded.dia, mes=excluded.mes, quincena=excluded.quincena,
      id_ejecucion=excluded.id_ejecucion, eliminar=excluded.eliminar, revisado=excluded.revisado,
      fecha_inicio=excluded.fecha_inicio, fecha_fin=excluded.fecha_fin, origen_created_at=excluded.origen_created_at,
      espejado_en=now();
  exception when others then
    raise warning 'GP2.fn_espejo_produccion fallo para espejo_id %: %', new.id, sqlerrm;
  end;
  return null;  -- AFTER trigger
end;
$function$;

-- ---------- fn_est_madre_sync ----------
CREATE OR REPLACE FUNCTION "GP2".fn_est_madre_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
begin
  if TG_OP = 'DELETE' then
    delete from "GP2".est_madre where cod = OLD.cod;
    return OLD;
  end if;
  if TG_OP = 'UPDATE' and NEW.cod is distinct from OLD.cod then
    delete from "GP2".est_madre where cod = OLD.cod;
  end if;
  insert into "GP2".est_madre (cod, proy_cajas_mes, uxb, proy_uni_mes, actualizado)
  values (NEW.cod, NEW.proy_cajas_mes, NEW.uxb, NEW.proy_uni_mes, NEW.actualizado)
  on conflict (cod) do update
    set proy_cajas_mes = EXCLUDED.proy_cajas_mes,
        uxb            = EXCLUDED.uxb,
        proy_uni_mes   = EXCLUDED.proy_uni_mes,
        actualizado    = EXCLUDED.actualizado,
        copiado_en     = now();
  return NEW;
end $function$;

-- ---------- fn_movimiento_aplicar ----------
CREATE OR REPLACE FUNCTION "GP2".fn_movimiento_aplicar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
begin
  if tg_op in ('UPDATE','DELETE') then
    perform "GP2".inv_delta(coalesce(old.comp_transformado_id, old.comp_id),
                            old.ubic_destino_id, - old._delta_dest);
    perform "GP2".inv_delta(old.comp_id, old.ubic_origen_id, + old._delta_orig);
  end if;
  if tg_op in ('INSERT','UPDATE') then
    perform "GP2".inv_delta(coalesce(new.comp_transformado_id, new.comp_id),
                            new.ubic_destino_id, + new._delta_dest);
    perform "GP2".inv_delta(new.comp_id, new.ubic_origen_id, - new._delta_orig);
  end if;
  return null;
end;
$function$;

-- ---------- fn_movimiento_calc ----------
CREATE OR REPLACE FUNCTION "GP2".fn_movimiento_calc()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
begin
  if new.comp_transformado_id is null then
    new._delta_orig := "GP2".to_canonical(new.comp_id, new.cantidad,
                                          coalesce(new.unidad_origen, new.unidad_destino));
    new._delta_dest := new._delta_orig;
  else
    new._delta_orig := "GP2".to_canonical(new.comp_id, new.cantidad, new.unidad_origen);
    new._delta_dest := "GP2".to_canonical(new.comp_transformado_id, new.cantidad_transformada, new.unidad_destino);
  end if;
  return new;
end;
$function$;

-- ---------- fn_recalc_maximos_insumos ----------
CREATE OR REPLACE FUNCTION "GP2".fn_recalc_maximos_insumos()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
begin
  perform "GP2".recalcular_maximos_insumos();
  return null;
end $function$;

-- ---------- fn_rollo_desde_control ----------
CREATE OR REPLACE FUNCTION "GP2".fn_rollo_desde_control()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare v_comp bigint;
begin
  select ri.componente_id into v_comp
  from recepcion_control ctl join recepcion_insumo ri on ri.id = ctl.recepcion_id
  where ctl.id = coalesce(new.control_id, old.control_id);
  if v_comp is null then return null; end if;
  if tg_op in ('DELETE','UPDATE') then
    insert into rollo_evento(componente_id, kg_por_rollo, delta, motivo, control_rollo_id, nota)
    values (v_comp, old.kg_por_rollo, -old.cantidad, 'recepcion', null, 'reversa control '||old.id);
  end if;
  if tg_op in ('INSERT','UPDATE') then
    insert into rollo_evento(componente_id, kg_por_rollo, delta, motivo, control_rollo_id)
    values (v_comp, new.kg_por_rollo, new.cantidad, 'recepcion', new.id);
  end if;
  return null;
end $function$;

-- ---------- informes_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".informes_bundle(p_desde date DEFAULT NULL::date, p_hasta date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
with base as (
  select
    legajo,
    nombre_empleado,
    trim(matriz_raw) as mat,
    coalesce(uni,0)::numeric              as uni,
    coalesce(segundos_trabajados,0)::numeric as seg,
    coalesce(segundos_historico,0)::numeric  as segh,
    coalesce(anular_tiempo,false)         as anul
  from "GP2".produccion
  where (eliminar is null or eliminar <> 'S')
    and coalesce(legajo,'') <> '1'
    and coalesce(legajo,'') <> ''
    and (p_desde is null or (fecha at time zone 'America/Argentina/Buenos_Aires')::date >= p_desde)
    and (p_hasta is null or (fecha at time zone 'America/Argentina/Buenos_Aires')::date <= p_hasta)
),
cat as (
  select *,
    (mat ~ '^\d+\w*$')                                             as es_matriz,
    (mat like 'RM%')                                              as es_rm,
    ((mat ~ '^\d+\w*$') and uni > 0)                              as is_prod,
    ((mat !~ '^\d+\w*$') and mat <> 'E' and mat <> 'LT' and mat not like 'RM%') as is_tm
  from base
),
agg as (
  select
    legajo,
    (array_agg(nombre_empleado) filter (where nombre_empleado is not null and nombre_empleado <> ''))[1] as nombre,
    coalesce(sum(seg)  filter (where is_prod and not anul), 0) as seg_trab,
    coalesce(sum(segh) filter (where is_prod and not anul), 0) as seg_hist,
    coalesce(sum(uni)  filter (where is_prod and not anul), 0) as uni,
    coalesce(sum(seg)  filter (where is_prod and anul), 0)     as seg_anulados,
    count(*)           filter (where es_rm)                    as roturas,
    coalesce(sum(seg)  filter (where is_prod or es_rm or is_tm), 0) as seg_total
  from cat
  group by legajo
),
tm as (
  select legajo, split_part(mat, ' ', 1) as code, sum(seg) as seg
  from cat
  where is_tm
  group by legajo, split_part(mat, ' ', 1)
),
tm_by_leg as (
  select legajo, jsonb_object_agg(code, seg) as tmjson
  from tm group by legajo
)
select jsonb_build_object(
  'desde', p_desde,
  'hasta', p_hasta,
  'personas', coalesce((
    select jsonb_agg(jsonb_build_object(
      'legajo',      a.legajo,
      'nombre',      coalesce(a.nombre, ''),
      'segTrab',     a.seg_trab,
      'segHist',     a.seg_hist,
      'uni',         a.uni,
      'segAnulados', a.seg_anulados,
      'segTotal',    a.seg_total,
      'roturas',     a.roturas,
      'puntaje',     case when a.seg_hist > 0 then (-((a.seg_trab / a.seg_hist) - 1)) * 10 else 0 end,
      'tm',          coalesce(t.tmjson, '{}'::jsonb)
    ) order by (case when a.seg_hist > 0 then (-((a.seg_trab / a.seg_hist) - 1)) * 10 else 0 end) desc)
    from agg a
    left join tm_by_leg t on t.legajo = a.legajo
    where a.seg_total > 0
  ), '[]'::jsonb)
);
$function$;

-- ---------- informes_matriz_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".informes_matriz_bundle(p_desde date DEFAULT NULL::date, p_hasta date DEFAULT NULL::date, p_incluir_piedra boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
with base as (
  select
    trim(matriz_raw)                          as mat,
    legajo,
    nombre_empleado,
    nombre_matriz,
    coalesce(uni,0)::numeric                   as uni,
    coalesce(segundos_trabajados,0)::numeric   as seg,
    coalesce(segundos_historico,0)::numeric    as segh,
    tiempo_historico::numeric                  as thist
  from "GP2".produccion
  where (eliminar is null or eliminar <> 'S')
    and coalesce(legajo,'') not in ('','1')
    and coalesce(anular_tiempo,false) = false
    and trim(matriz_raw) ~ '^\d+\w*$'
    and coalesce(uni,0) > 0
    and (p_incluir_piedra or trim(matriz_raw) <> '501')
    and (p_desde is null or (fecha at time zone 'America/Argentina/Buenos_Aires')::date >= p_desde)
    and (p_hasta is null or (fecha at time zone 'America/Argentina/Buenos_Aires')::date <= p_hasta)
),
cell as (
  select mat, legajo, sum(seg) as seg_trab, sum(uni) as uni
  from base group by mat, legajo
),
mat_meta as (
  select mat,
         mode() within group (order by nombre_matriz) as nombre,
         max(nullif(thist,0))                          as thist,
         sum(seg)                                      as seg_total,
         sum(uni)                                      as uni_total
  from base group by mat
),
emp as (
  select legajo,
         mode() within group (order by nombre_empleado) as nombre,
         sum(seg)                                        as seg_emp
  from base group by legajo
),
cell_by_mat as (
  select mat, jsonb_object_agg(legajo, jsonb_build_object('segTrab', seg_trab, 'uni', uni)) as celdas
  from cell group by mat
)
select jsonb_build_object(
  'desde', p_desde,
  'hasta', p_hasta,
  'empleados', coalesce((
    select jsonb_agg(jsonb_build_object('legajo', legajo, 'nombre', coalesce(nombre, legajo))
                     order by lower(coalesce(nombre, legajo)))
    from emp), '[]'::jsonb),
  'hsTotalByEmp', coalesce((select jsonb_object_agg(legajo, seg_emp) from emp), '{}'::jsonb),
  'matrices', coalesce((
    select jsonb_agg(jsonb_build_object(
      'mat',      m.mat,
      'nombre',   coalesce(m.nombre, ''),
      'tHist',    m.thist,
      'uniTotal', m.uni_total,
      'segTotal', m.seg_total,
      'segXUni',  case when m.uni_total > 0 then m.seg_total / m.uni_total else 0 end,
      'premio',   case when m.thist > 0 and m.uni_total > 0
                       then (-(((m.seg_total / m.uni_total) / m.thist) - 1)) * 10 else 0 end,
      'celdas',   coalesce(c.celdas, '{}'::jsonb)
    ) order by (substring(m.mat from '^\d+'))::bigint, m.mat)
    from mat_meta m
    left join cell_by_mat c on c.mat = m.mat
  ), '[]'::jsonb)
);
$function$;

-- ---------- inicio_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".inicio_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
with base as (
  select *
  from "GP2".produccion
  where (eliminar is null or eliminar <> 'S')
    and coalesce(legajo,'') <> '1'
    and coalesce(uni,0) > 0
),
hoy_rows as (
  select * from base where fecha::date = current_date
),
mes_rows as (
  select * from base
  where extract(year from fecha) = extract(year from current_date)
    and extract(month from fecha) = extract(month from current_date)
),
disruptivas as (
  select count(*) c
  from "GP2".produccion
  where (eliminar is null or eliminar <> 'S')
    and coalesce(legajo,'') <> '1'
    and revisado is not true
    and matriz_raw ~ '^\d+\w*$'
    and (coalesce(premio,0) > 5 or coalesce(premio,0) < -5)
    and extract(year from fecha) = extract(year from current_date)
    and extract(month from fecha) = extract(month from current_date)
),
sin_tiempo as (
  select count(*) c
  from (
    select matriz_raw
    from "GP2".produccion
    where matriz_raw ~ '^\d+\w*$'
      and (eliminar is null or eliminar <> 'S')
    group by matriz_raw
    having coalesce(max(tiempo_historico),0) = 0
  ) q
)
select jsonb_build_object(
  'generado_en', now(),
  'hoy', to_char(current_date,'YYYY-MM-DD'),
  'dia', jsonb_build_object(
    'uni', coalesce((select sum(uni) from hoy_rows),0),
    'registros', (select count(*) from hoy_rows),
    'empleados', (select count(distinct legajo) from hoy_rows),
    'matrices', (select count(distinct matriz_raw) from hoy_rows)
  ),
  'mes', jsonb_build_object(
    'anio', extract(year from current_date)::int,
    'mes', extract(month from current_date)::int,
    'uni', coalesce((select sum(uni) from mes_rows),0),
    'registros', (select count(*) from mes_rows),
    'empleados', (select count(distinct legajo) from mes_rows),
    'matrices', (select count(distinct matriz_raw) from mes_rows)
  ),
  'alertas', jsonb_build_object(
    'disruptivas_mes', (select c from disruptivas),
    'matrices_sin_tiempo', (select c from sin_tiempo),
    'espejo_pend', (select count(*) from "GP2".virgilio_espejo_pend),
    'espejo_pend_detalle', (select coalesce(jsonb_agg(jsonb_build_object(
        'id',p.id,'motivo',p.motivo) order by p.id desc), '[]'::jsonb)
      from (select id, motivo from "GP2".virgilio_espejo_pend order by id desc limit 5) p)
  )
);
$function$;

-- ---------- inyectores_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".inyectores_bundle(p_sector_id bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
with sec_sel as (
  select coalesce(p_sector_id,
                  (select id from sector where nombre='Sector Plástico' limit 1)) sid
),
sec_nom as (select s.id, s.nombre from sector s, sec_sel where s.id=sec_sel.sid)
select jsonb_build_object(
  'generado_en', now(),
  'sector', (select jsonb_build_object('id',id,'nombre',nombre) from sec_nom),
  -- rubros disponibles: los sectores de insumo, con cuantas partes tiene cada uno
  'sectores', (select coalesce(jsonb_agg(jsonb_build_object(
                  'id', s.id, 'nombre', s.nombre,
                  'n', (select count(*) from componente c where c.sector_id=s.id),
                  'sin_prov', (select count(*) from componente c
                                where c.sector_id=s.id
                                  and nullif(btrim(coalesce(c.proveedor,'')),'') is null)
                ) order by s.nombre), '[]'::jsonb)
              from sector s where "GP2"._es_sector_insumo(s.id)),
  -- botonera: proveedores marcados para este rubro + los que ya proveen algo del sector
  'proveedores', (select coalesce(jsonb_agg(jsonb_build_object(
                     'nombre', pi.nombre, 'modo_control', pi.modo_control,
                     'n', (select count(*) from componente c, sec_sel
                            where c.sector_id=sec_sel.sid and btrim(coalesce(c.proveedor,''))=pi.nombre)
                   ) order by pi.nombre), '[]'::jsonb)
                  from proveedor_insumo pi
                  where pi.activo
                    and (pi.rubro = (select nombre from sec_nom)
                         or exists (select 1 from componente c, sec_sel
                                     where c.sector_id=sec_sel.sid
                                       and btrim(coalesce(c.proveedor,''))=pi.nombre))),
  'partes', (select coalesce(jsonb_agg(jsonb_build_object(
                'comp_id', c.id, 'codigo', c.codigo, 'descripcion', c.descripcion,
                'proveedor', nullif(btrim(coalesce(c.proveedor,'')),''),
                'um', c.unidad_medida, 'kg_x_uni', c.kg_x_uni, 'uni_x_cajon', c.uni_x_cajon,
                -- lo produce un tallerista? entonces no se compra como insumo
                'lo_produce', (select t.nombre from ruta_paso rp
                                join tallerista t on t.id=rp.tallerista_id
                               where rp.comp_salida_id=c.id limit 1),
                'stock', coalesce((select sum(i.cantidad) from inventario i where i.componente_id=c.id),0),
                'en_recetas', (select count(*) from articulo_componente ac where ac.componente_id=c.id)
              ) order by c.codigo), '[]'::jsonb)
             from componente c, sec_sel where c.sector_id=sec_sel.sid)
);
$function$;

-- ---------- inv_delta ----------
CREATE OR REPLACE FUNCTION "GP2".inv_delta(p_comp bigint, p_ubic bigint, p_delta numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
begin
  if p_comp is null or p_ubic is null or p_delta is null or p_delta = 0 then
    return;
  end if;
  insert into "GP2".inventario (componente_id, ubicacion_id, cantidad, actualizado_en)
  values (p_comp, p_ubic, p_delta, now())
  on conflict (componente_id, ubicacion_id) do update
     set cantidad       = inventario.cantidad + excluded.cantidad,
         actualizado_en = now();
end;
$function$;

-- ---------- marcar_revisado ----------
CREATE OR REPLACE FUNCTION "GP2".marcar_revisado(row_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
begin
  update produccion set revisado = true where id = row_id;
  if not found then
    raise exception 'Registro id=% no encontrado', row_id;
  end if;
end;
$function$;

-- ---------- movimientos_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".movimientos_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
  select jsonb_build_object(
    'sect', (select coalesce(jsonb_object_agg(id::text, jsonb_build_object('tipo',tipo,'nom',nombre)),'{}'::jsonb) from sector),
    'ubic', (select coalesce(jsonb_object_agg(id::text, jsonb_build_object('tipo',tipo,'ref',ref_id,'nom',nombre,'meses',meses_minimo)),'{}'::jsonb) from ubicacion),
    'art', (select coalesce(jsonb_object_agg(id::text, jsonb_build_object('id',id,'cod',codigo,'fam',familia,'cja',componente_caja_id,'por',articulos_por_caja,'est',estadistica_madre_uni_mes)),'{}'::jsonb) from articulo),
    'comp', (select coalesce(jsonb_object_agg(id::text, jsonb_build_object('cod',codigo,'d',descripcion,'s',sector_id,'um',unidad_medida,'kg_x_uni',kg_x_uni,'uxc',uni_x_cajon)),'{}'::jsonb) from componente),
    'prov_serv', (select coalesce(jsonb_object_agg(id::text, jsonb_build_object('nom',nombre,'proceso',proceso)),'{}'::jsonb) from proveedor_servicio),
    'tall', (select coalesce(jsonb_object_agg(id::text, jsonb_build_object('nom',nombre)),'{}'::jsonb) from tallerista),
    'mat', (select coalesce(jsonb_object_agg(id::text, jsonb_build_object('n',n_matriz,'d',descripcion,'tipo',tipo,'ppk',partes_por_kilo_de_fleje,'primera',(primera_del_fleje='SI'))),'{}'::jsonb) from matriz),
    'bom_art', (select coalesce(jsonb_object_agg(articulo_id::text, arr),'{}'::jsonb) from (
        select articulo_id, jsonb_agg(jsonb_build_object('c',componente_id,'q',cantidad)) arr
        from articulo_componente group by articulo_id) x),
    'bom_comp', (select coalesce(jsonb_object_agg(componente_padre_id::text, arr),'{}'::jsonb) from (
        select componente_padre_id, jsonb_agg(jsonb_build_object('c',componente_hijo_id,'q',cantidad)) arr
        from componente_bom group by componente_padre_id) x),
    'rp', (select coalesce(jsonb_object_agg(ruta_id::text, arr),'{}'::jsonb) from (
        select ruta_id, jsonb_agg(jsonb_build_object('o',orden,'tipo',tipo_paso,'flje',componente_fleje_id,'mat',matriz_id,'prov',proveedor_id,'tall',tallerista_id,'ce',comp_entrada_id,'cs',comp_salida_id,'art',articulo_id) order by orden) arr
        from ruta_paso group by ruta_id) x),
    'inv', (select coalesce(jsonb_object_agg(componente_id::text||':'||ubicacion_id::text, jsonb_build_object('cant',cantidad,'min',minimo,'max',maximo)),'{}'::jsonb) from inventario),
    'c2a', (select coalesce(jsonb_object_agg(comp_entrada_id::text, articulo_id),'{}'::jsonb) from (
        select distinct on (comp_entrada_id) comp_entrada_id, articulo_id
        from ruta_paso where tipo_paso='virgilio' and comp_entrada_id is not null and articulo_id is not null
        order by comp_entrada_id, ruta_id) x)
  );
$function$;

-- ---------- movimientos_componente ----------
CREATE OR REPLACE FUNCTION "GP2".movimientos_componente(p_comp_id bigint, p_ubic_id bigint, p_limit integer DEFAULT 200)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
  with todos as (
    select m.id, m.fecha, m.tipo_mov as tipo, 'ent'::text as signo,
           coalesce(m._delta_dest,0) as cantidad, m.cajones, m.faltante,
           coalesce(uo.nombre,'—') as contraparte,
           case when m.comp_transformado_id is not null and m.comp_id <> p_comp_id
                then (select codigo from componente where id = m.comp_id) end as via
    from movimiento m
    left join ubicacion uo on uo.id = m.ubic_origen_id
    where m.ubic_destino_id = p_ubic_id
      and coalesce(m.comp_transformado_id, m.comp_id) = p_comp_id
    union all
    select m.id, m.fecha, m.tipo_mov, 'sal',
           coalesce(m._delta_orig,0), m.cajones, m.faltante,
           coalesce(ud.nombre,'—'),
           case when m.comp_transformado_id is not null
                then (select codigo from componente where id = m.comp_transformado_id) end
    from movimiento m
    left join ubicacion ud on ud.id = m.ubic_destino_id
    where m.ubic_origen_id = p_ubic_id and m.comp_id = p_comp_id
  ),
  pagina as (select * from todos order by fecha desc, id desc limit greatest(p_limit, 1))
  select coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', p.id, 'fecha', p.fecha, 'tipo', p.tipo, 'signo', p.signo,
             'cantidad', p.cantidad, 'cajones', p.cajones, 'faltante', p.faltante,
             'contraparte', p.contraparte, 'via', p.via
           ) order by p.fecha desc, p.id desc)
    from pagina p), '[]'::jsonb);
$function$;

-- ---------- oc_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".oc_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
with pend as (
  select oi.componente_id, sum(oi.cantidad - oi.recibido) pendiente
  from orden_compra_item oi join orden_compra o on o.id = oi.oc_id
  where o.estado in ('borrador','enviada')
  group by oi.componente_id
), ins as (
  select c.id comp_id, c.codigo, c.descripcion, c.sector_id, s.nombre sector,
         c.unidad_medida um, c.kg_x_uni,
         coalesce(nullif(trim(fd.proveedor),''), nullif(trim(c.proveedor),'')) proveedor,
         u.meses_stock,
         case when c.sector_id = 5 then fk.consumo_kg_mes else cp.consumo_uni_mes end consumo,
         case when c.sector_id = 5 then 'kg' else 'uni' end unidad,
         (select i.cantidad from inventario i join ubicacion iu on iu.id=i.ubicacion_id
           where i.componente_id=c.id and iu.tipo='sector' and iu.ref_id=c.sector_id limit 1) online,
         coalesce(pd.pendiente, 0) pendiente_oc,
         c.carton_formato,
         cf.pliegos_multiplo, cf.codigo_multiplo, cf.min_codigo_x_multiplo
  from componente c
  join sector s on s.id = c.sector_id
  join ubicacion u on u.tipo='sector' and u.ref_id = c.sector_id
  left join fleje_detalle fd on fd.componente_id = c.id
  left join v_consumo_parte cp on cp.componente_id = c.id and c.sector_id <> 5
  left join v_consumo_fleje_kg fk on fk.componente_id = c.id and c.sector_id = 5
  left join pend pd on pd.componente_id = c.id
  left join carton_formato cf on cf.nombre = c.carton_formato
  where "GP2"._es_sector_insumo(c.sector_id)
)
select jsonb_build_object(
  'insumos', (select coalesce(jsonb_agg(jsonb_build_object(
      'comp_id',comp_id,'codigo',codigo,'descripcion',descripcion,'sector',sector,'sector_id',sector_id,
      'proveedor',proveedor,'um',um,'unidad',unidad,'kg_x_uni',kg_x_uni,
      'consumo',consumo,'meses',meses_stock,'online',coalesce(online,0),'pendiente_oc',pendiente_oc,
      'sugerido', greatest(0, round(coalesce(consumo,0)*coalesce(meses_stock,0) - coalesce(online,0) - pendiente_oc)),
      'carton_formato',carton_formato,'pliegos_multiplo',pliegos_multiplo,
      'codigo_multiplo',codigo_multiplo,'min_codigo_x_multiplo',min_codigo_x_multiplo
    ) order by sector_id, codigo),'[]'::jsonb) from ins),
  'ocs', (select coalesce(jsonb_agg(jsonb_build_object(
      'id',o.id,'numero',o.numero,'proveedor',o.proveedor,'rubro',o.rubro,'estado',o.estado,
      'nota',o.nota,'creado_en',o.creado_en,
      'items',(select jsonb_agg(jsonb_build_object('codigo',c.codigo,'descripcion',c.descripcion,
               'cantidad',oi.cantidad,'unidad',oi.unidad,'recibido',oi.recibido) order by c.codigo)
               from orden_compra_item oi join componente c on c.id=oi.componente_id where oi.oc_id=o.id)
    ) order by o.numero desc),'[]'::jsonb)
    from orden_compra o),
  'paq', (select valor from parametro where clave='carton_uni_x_paquete'),
  'generado_en', now());
$function$;

-- ---------- oc_marcar ----------
CREATE OR REPLACE FUNCTION "GP2".oc_marcar(p_oc_id bigint, p_estado text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
begin
  if p_estado not in ('borrador','enviada','recibida','anulada') then
    raise exception 'Estado invalido: %', p_estado;
  end if;
  update orden_compra set estado = p_estado where id = p_oc_id;
  if not found then raise exception 'OC % no existe', p_oc_id; end if;
  return jsonb_build_object('ok', true);
end $function$;

-- ---------- partes_por_ps ----------
CREATE OR REPLACE FUNCTION "GP2".partes_por_ps()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
  select coalesce(jsonb_object_agg(prov_id::text, jsonb_build_object('sc', coalesce(sc,'[]'::jsonb), 'sp', coalesce(sp,'[]'::jsonb))), '{}'::jsonb)
  from (
    select rp.proveedor_id prov_id,
      (select jsonb_agg(distinct jsonb_build_object('id',c.id,'codigo',c.codigo,'descripcion',c.descripcion,'sector',s.nombre))
         from "GP2".ruta_paso r2 join "GP2".componente c on c.id=r2.comp_entrada_id join "GP2".sector s on s.id=c.sector_id
         where r2.tipo_paso='proveedor_servicio' and r2.proveedor_id=rp.proveedor_id) sc,
      (select jsonb_agg(distinct jsonb_build_object('id',c.id,'codigo',c.codigo,'descripcion',c.descripcion,'sector',s.nombre))
         from "GP2".ruta_paso r2 join "GP2".componente c on c.id=r2.comp_salida_id join "GP2".sector s on s.id=c.sector_id
         where r2.tipo_paso='proveedor_servicio' and r2.proveedor_id=rp.proveedor_id) sp
    from "GP2".ruta_paso rp where rp.tipo_paso='proveedor_servicio' and rp.proveedor_id is not null
    group by rp.proveedor_id
  ) x;
$function$;

-- ---------- partes_por_tallerista ----------
CREATE OR REPLACE FUNCTION "GP2".partes_por_tallerista()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
  select coalesce(jsonb_object_agg(tall_id::text, coalesce(sc,'[]'::jsonb)), '{}'::jsonb)
  from (
    select rp.tallerista_id tall_id,
      (select jsonb_agg(distinct jsonb_build_object('id',c.id,'codigo',c.codigo,'descripcion',c.descripcion,'sector',s.nombre))
         from "GP2".ruta_paso r2 join "GP2".componente c on c.id=r2.comp_entrada_id join "GP2".sector s on s.id=c.sector_id
         where r2.tipo_paso='tallerista' and r2.tallerista_id=rp.tallerista_id) sc
    from "GP2".ruta_paso rp where rp.tipo_paso='tallerista' and rp.tallerista_id is not null
    group by rp.tallerista_id
  ) x;
$function$;

-- ---------- pesar_pallet ----------
CREATE OR REPLACE FUNCTION "GP2".pesar_pallet(p_recepcion_id bigint, p_nro_pallet integer, p_peso_balanza numeric, p_rollos jsonb, p_usuario text DEFAULT NULL::text, p_nota text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare v_ctl bigint; r jsonb; v_n int := 0;
begin
  if p_peso_balanza is null or p_peso_balanza <= 0 then
    raise exception 'El peso de balanza debe ser mayor a 0';
  end if;
  if p_nro_pallet is null or p_nro_pallet <= 0 then
    raise exception 'El numero de pallet debe ser mayor a 0';
  end if;
  if jsonb_typeof(coalesce(p_rollos,'[]'::jsonb)) <> 'array' then
    raise exception 'p_rollos debe ser un array JSON';
  end if;
  if not exists(select 1 from "GP2".recepcion_insumo where id = p_recepcion_id) then
    raise exception 'La recepcion % no existe', p_recepcion_id;
  end if;

  insert into "GP2".recepcion_control(recepcion_id, nro_pallet, peso_balanza, controlado_por, nota)
  values (p_recepcion_id, p_nro_pallet, p_peso_balanza,
          nullif(btrim(coalesce(p_usuario,'')),''), nullif(btrim(coalesce(p_nota,'')),''))
  on conflict (recepcion_id, nro_pallet) do update set
    peso_balanza = excluded.peso_balanza, controlado_por = excluded.controlado_por,
    nota = excluded.nota, controlado_en = now()
  returning id into v_ctl;

  delete from "GP2".recepcion_control_rollo where control_id = v_ctl;
  for r in select * from jsonb_array_elements(coalesce(p_rollos,'[]'::jsonb)) loop
    if coalesce((r->>'cantidad')::int,0) > 0 and coalesce((r->>'kg_por_rollo')::numeric,0) > 0 then
      insert into "GP2".recepcion_control_rollo(control_id, cantidad, kg_por_rollo)
      values (v_ctl, (r->>'cantidad')::int, (r->>'kg_por_rollo')::numeric);
      v_n := v_n + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true, 'lineas', v_n,
    'pallet', (select to_jsonb(vp) from "GP2".v_control_pallet vp where vp.control_id = v_ctl),
    'recepcion', (select to_jsonb(vr) from "GP2".v_recepcion_control vr where vr.recepcion_id = p_recepcion_id));
end $function$;

-- ---------- problemas_matrices_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".problemas_matrices_bundle(p_desde date, p_hasta date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
with base as (
  select p.id, btrim(coalesce(p.matriz_raw,'')) as m, p.fecha, p.hora_inicio, p.hora_fin,
         p.legajo, p.nombre_empleado, p.uni, p.segundos_tiempo_muerto,
         case when p.nombre_matriz = 'Rotura Matriz' then 'RM'
              when p.nombre_matriz = 'Pare Matriz'   then 'PM' end as tipo
  from produccion p
  where (p.eliminar is null or p.eliminar <> 'S')
    and (p.fecha at time zone 'America/Argentina/Buenos_Aires')::date between p_desde and p_hasta
), ord as (
  select b.*,
         count(*) filter (where b.tipo = 'RM')
           over (partition by b.m order by b.fecha, b.id
                 rows between unbounded preceding and 1 preceding) as grp
  from base b where b.m <> ''
), acum as (
  select o.*,
         sum(case when o.uni > 0 then o.uni else 0 end)
           over (partition by o.m, coalesce(o.grp,0) order by o.fecha, o.id
                 rows between unbounded preceding and 1 preceding) as uni_acum
  from ord o
)
select jsonb_build_object(
  'eventos', (select coalesce(jsonb_agg(jsonb_build_object(
      'fecha', to_char(a.fecha at time zone 'America/Argentina/Buenos_Aires','YYYY-MM-DD'),
      'hora_inicio', a.hora_inicio, 'hora_fin', a.hora_fin,
      'tipo', a.tipo, 'legajo', a.legajo,
      'empleado', coalesce(a.nombre_empleado, e.nombre),
      'matriz', a.m, 'nombre_matriz', mt.descripcion,
      'segundos', a.segundos_tiempo_muerto,
      'uni_acum', coalesce(a.uni_acum, 0),
      'uni_x_golpe', mt.uni_x_golpe,
      'golpes', case when mt.uni_x_golpe > 0 then round(coalesce(a.uni_acum,0) / mt.uni_x_golpe) end
      ) order by a.fecha desc, a.id desc),'[]'::jsonb)
    from acum a
    left join empleado e on e.legajo = a.legajo
    left join matriz mt on btrim(mt.n_matriz) = a.m
    where a.tipo is not null),
  'empleados', (select coalesce(jsonb_agg(jsonb_build_object('legajo',legajo,'nombre',nombre) order by nombre),'[]'::jsonb)
    from empleado where activo),
  'desde', p_desde, 'hasta', p_hasta);
$function$;

-- ---------- produccion_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".produccion_bundle(p_matriz text DEFAULT NULL::text, p_anio integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
select jsonb_build_object(
  'matrices', coalesce((
    select jsonb_agg(jsonb_build_object('N_Matriz', m, 'Matriz', nm, 'Tiempo_Historico', th))
    from (
      select matriz_raw m,
             (array_agg(nombre_matriz) filter (where nombre_matriz is not null and nombre_matriz <> ''))[1] nm,
             max(tiempo_historico) th
      from "GP2".produccion
      where matriz_raw is not null and matriz_raw <> ''
        and (eliminar is null or eliminar <> 'S')
      group by matriz_raw
    ) q
  ), '[]'::jsonb),
  'empleados', coalesce((
    select jsonb_object_agg(legajo, nom)
    from (
      select legajo,
             (array_agg(nombre_empleado) filter (where nombre_empleado is not null and nombre_empleado <> ''))[1] nom
      from "GP2".produccion
      where legajo is not null and legajo <> ''
      group by legajo
    ) e
  ), '{}'::jsonb),
  'rows', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', id,
      'Matriz', matriz_raw,
      'Nombre_Matriz', nombre_matriz,
      'Legajo', legajo,
      'Uni', uni,
      'Fecha', to_char(fecha, 'YYYY-MM-DD'),
      'Hora_Inicio', to_char(hora_inicio, 'HH24:MI:SS'),
      'Hora_Fin', to_char(hora_fin, 'HH24:MI:SS'),
      'Segundos_Trabajados', segundos_trabajados,
      'Tiempo_Toma', tiempo_toma,
      'Premio', premio,
      'Eliminar', eliminar
    ) order by fecha, hora_inicio)
    from "GP2".produccion
    where p_matriz is not null
      and matriz_raw = p_matriz
      and (eliminar is null or eliminar <> 'S')
      and coalesce(legajo, '') <> '1'
      and coalesce(uni, 0) > 0
      and coalesce(tiempo_toma, 0) > 0
      and (p_anio is null or extract(year from fecha) = p_anio)
  ), '[]'::jsonb)
);
$function$;

-- ---------- produccion_maestro_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".produccion_maestro_bundle(p_desde date DEFAULT NULL::date, p_hasta date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
with lims as (
  select coalesce(p_desde, p_hasta, current_date) as d0,
         coalesce(p_hasta, p_desde, current_date) as d1
)
select jsonb_build_object(
  'desde', (select to_char(d0,'YYYY-MM-DD') from lims),
  'hasta', (select to_char(d1,'YYYY-MM-DD') from lims),
  -- lista de matrices (solo cajones, uni>0) para el filtro
  'matrices', coalesce((
    select jsonb_agg(jsonb_build_object('n_matriz', m, 'nombre', nm) order by m)
    from (
      select matriz_raw m,
             (array_agg(nombre_matriz) filter (where nombre_matriz is not null and nombre_matriz <> ''))[1] nm
      from "GP2".produccion
      where matriz_raw is not null and matriz_raw <> '' and coalesce(uni,0) > 0
      group by matriz_raw
    ) q
  ), '[]'::jsonb),
  -- mapa legajo -> nombre para el filtro operario (no existe tabla Empleados en GP2)
  'empleados', coalesce((
    select jsonb_object_agg(legajo, nom)
    from (
      select legajo,
             (array_agg(nombre_empleado) filter (where nombre_empleado is not null and nombre_empleado <> ''))[1] nom
      from "GP2".produccion
      where legajo is not null and legajo <> ''
      group by legajo
    ) e
  ), '{}'::jsonb),
  -- filas del periodo (cajones + tiempos muertos), excluye soft-deletes
  'rows', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', id,
      'fecha', to_char((fecha at time zone 'America/Argentina/Buenos_Aires'), 'YYYY-MM-DD'),
      'legajo', legajo,
      'nombre_empleado', nombre_empleado,
      'matriz', matriz_raw,
      'nombre_matriz', nombre_matriz,
      'uni', uni,
      'hora_inicio', to_char(hora_inicio, 'HH24:MI:SS'),
      'hora_fin', to_char(hora_fin, 'HH24:MI:SS'),
      'segundos_trabajados', segundos_trabajados,
      'segundos_tiempo_muerto', segundos_tiempo_muerto,
      'premio', premio,
      'tiempo_toma', tiempo_toma,
      'tiempo_historico', tiempo_historico,
      'dia', dia,
      'mes', mes,
      'revisado', revisado
    ) order by fecha desc, hora_inicio desc)
    from "GP2".produccion, lims
    where (eliminar is null or eliminar <> 'S')
      and (fecha at time zone 'America/Argentina/Buenos_Aires')::date between lims.d0 and lims.d1
  ), '[]'::jsonb)
);
$function$;

-- ---------- programa_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".programa_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
with ruta_fleje as (
  select distinct on (ruta_id) ruta_id, componente_fleje_id fl
  from "GP2".ruta_paso where componente_fleje_id is not null
  order by ruta_id, orden
),
rutas_full as (
  select r.id, r.nombre nom, rf.fl f, r.articulo_id a
  from "GP2".ruta r left join ruta_fleje rf on rf.ruta_id = r.id
)
select jsonb_build_object(
  'art', (select jsonb_agg(jsonb_build_object('id',id,'cod',codigo,'fam',familia) order by id) from "GP2".articulo),
  'comp', (select jsonb_object_agg(id::text, jsonb_build_object('cod',codigo,'d',descripcion,'s',sector_id)) from "GP2".componente),
  'fl', '{}'::jsonb,
  'mat', (select jsonb_object_agg(id::text, jsonb_build_object('n',n_matriz,'d',descripcion,'t',tipo,'r',partes_por_kilo_de_fleje,'p',coalesce(primera_del_fleje='SI',false))) from "GP2".matriz),
  'prov', (select jsonb_object_agg(id::text, jsonb_build_object('n',nombre,'p',proceso)) from "GP2".proveedor_servicio),
  'tall', (select jsonb_object_agg(id::text, nombre) from "GP2".tallerista),
  'bom', (select jsonb_agg(jsonb_build_object('a',articulo_id,'c',componente_id,'q',cantidad)) from "GP2".articulo_componente),
  'children', (select jsonb_object_agg(componente_padre_id::text, arr) from (
       select componente_padre_id, jsonb_agg(jsonb_build_object('c',componente_hijo_id,'q',cantidad)) arr
       from "GP2".componente_bom where componente_padre_id is not null group by componente_padre_id) x),
  'rutas', (select jsonb_agg(jsonb_build_object('id',id,'nom',nom,'f',f,'a',a) order by id) from rutas_full),
  'rp', (select jsonb_object_agg(ruta_id::text, arr) from (
       select ruta_id, jsonb_agg(jsonb_build_object('o',orden,'tp',tipo_paso,'m',matriz_id,'pr',proveedor_id,'ta',tallerista_id,'ce',comp_entrada_id,'cs',comp_salida_id,'fl',componente_fleje_id,'a',articulo_id) order by orden) arr
       from "GP2".ruta_paso where ruta_id is not null group by ruta_id) x),
  'tall_art', (select jsonb_object_agg(a::text, arr) from (
       select r.articulo_id a, jsonb_agg(distinct t.nombre) arr
       from "GP2".ruta_paso rp join "GP2".ruta r on r.id = rp.ruta_id join "GP2".tallerista t on t.id = rp.tallerista_id
       where rp.tallerista_id is not null and r.articulo_id is not null group by r.articulo_id) x),
  'sect', (select jsonb_object_agg(id::text, jsonb_build_object('t',tipo)) from "GP2".sector),
  'rutas_by_art', (select jsonb_object_agg(a::text, arr) from (
       select a, jsonb_agg(jsonb_build_object('id',id,'nom',nom,'f',f,'a',a) order by id) arr
       from rutas_full where a is not null group by a) x)
);
$function$;

-- ---------- proporciones_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".proporciones_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
WITH pares AS (
  SELECT DISTINCT
    t.id AS tall_id, t.nombre AS tall_nombre, t.cod_prov,
    a.id AS art_id, a.codigo AS art_codigo, a.familia,
    cs.codigo AS parte_cod, cs.descripcion AS parte_desc
  FROM ruta_paso rp
  JOIN ruta r      ON r.id = rp.ruta_id
  JOIN tallerista t ON t.id = rp.tallerista_id
  JOIN articulo a  ON a.id = r.articulo_id
  LEFT JOIN componente cs ON cs.id = rp.comp_salida_id
  WHERE rp.tallerista_id IS NOT NULL AND r.articulo_id IS NOT NULL
),
art_tall AS (
  SELECT art_id, count(DISTINCT tall_id) AS num_tall
  FROM pares GROUP BY art_id
),
tap AS (
  SELECT tall_id, tall_nombre, cod_prov, art_id, art_codigo, familia,
         jsonb_agg(DISTINCT jsonb_build_object('cod', parte_cod, 'desc', parte_desc))
           FILTER (WHERE parte_cod IS NOT NULL) AS partes
  FROM pares
  GROUP BY tall_id, tall_nombre, cod_prov, art_id, art_codigo, familia
),
por_tallerista AS (
  SELECT tap.tall_id, tap.tall_nombre, tap.cod_prov,
    jsonb_agg(
      jsonb_build_object(
        'art_id', tap.art_id, 'art_codigo', tap.art_codigo, 'familia', tap.familia,
        'partes', COALESCE(tap.partes, '[]'::jsonb),
        'num_talleristas', at.num_tall,
        'compartido', (at.num_tall >= 2),
        'proporcion_pct', NULL
      ) ORDER BY tap.art_codigo
    ) AS articulos,
    count(*) FILTER (WHERE at.num_tall >= 2) AS n_compartidos
  FROM tap JOIN art_tall at USING (art_id)
  GROUP BY tap.tall_id, tap.tall_nombre, tap.cod_prov
),
compartidos AS (
  SELECT tap.art_id, tap.art_codigo, tap.familia, at.num_tall,
    jsonb_agg(
      jsonb_build_object(
        'tall_id', tap.tall_id, 'tallerista', tap.tall_nombre,
        'partes', COALESCE(tap.partes, '[]'::jsonb),
        'proporcion_pct', NULL
      ) ORDER BY tap.tall_nombre
    ) AS talleristas
  FROM tap JOIN art_tall at USING (art_id)
  WHERE at.num_tall >= 2
  GROUP BY tap.art_id, tap.art_codigo, tap.familia, at.num_tall
)
SELECT jsonb_build_object(
  'generado_en', now(),
  'proporcion_disponible', false,
  'nota', 'La proporcion exacta (% de volumen por tallerista) no existe en GP2: la tabla vieja Proporcion_Articulo_Tallerista estaba vacia y ruta_paso no registra reparto de volumen. Se muestra la relacion tallerista -> articulos/partes derivada de ruta_paso; la proporcion queda PENDIENTE.',
  'talleristas', COALESCE((
     SELECT jsonb_agg(jsonb_build_object(
        'id', tall_id, 'nombre', tall_nombre, 'cod_prov', cod_prov,
        'n_compartidos', n_compartidos, 'articulos', articulos
     ) ORDER BY tall_nombre) FROM por_tallerista), '[]'::jsonb),
  'articulos_compartidos', COALESCE((
     SELECT jsonb_agg(jsonb_build_object(
        'art_id', art_id, 'art_codigo', art_codigo, 'familia', familia,
        'num_talleristas', num_tall, 'talleristas', talleristas
     ) ORDER BY art_codigo) FROM compartidos), '[]'::jsonb)
);
$function$;

-- ---------- punto_stock_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".punto_stock_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
  select jsonb_build_object(
    'filas', (select coalesce(jsonb_agg(to_jsonb(v) order by v.ubicacion_tipo, v.ubicacion, v.codigo),'[]'::jsonb)
              from "GP2".v_punto_stock v),
    'generado_en', now()
  );
$function$;

-- ---------- recalcular_maximos_insumos ----------
CREATE OR REPLACE FUNCTION "GP2".recalcular_maximos_insumos()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare v_set int := 0; v_clr int := 0;
begin
  -- setear/actualizar: consumo mensual (kg para flejes, uni para el resto) x meses del rubro
  with objetivo as (
    select i.id as inv_id,
           round(coalesce(case when c.sector_id = 5 then fk.consumo_kg_mes else cp.consumo_uni_mes end, 0)
                 * u.meses_stock) as max_nuevo
    from inventario i
    join ubicacion u on u.id = i.ubicacion_id and u.tipo = 'sector'
    join componente c on c.id = i.componente_id and c.sector_id = u.ref_id
    left join v_consumo_fleje_kg fk on fk.componente_id = c.id and c.sector_id = 5
    left join v_consumo_parte cp on cp.componente_id = c.id and c.sector_id <> 5
    where "GP2"._es_sector_insumo(u.ref_id)
      and u.meses_stock is not null
      and coalesce(i.maximo_origen,'') <> 'fisico'
  ), upd as (
    update inventario i
    set maximo = o.max_nuevo, maximo_origen = 'est_madre'
    from objetivo o
    where i.id = o.inv_id and o.max_nuevo > 0
      and (i.maximo is distinct from o.max_nuevo or i.maximo_origen is distinct from 'est_madre')
    returning 1
  ), clr as (
    -- si el consumo desaparecio, el maximo derivado se limpia (no aplica a 'fisico')
    update inventario i
    set maximo = null, maximo_origen = null
    from objetivo o
    where i.id = o.inv_id and o.max_nuevo <= 0 and i.maximo_origen = 'est_madre'
    returning 1
  )
  select (select count(*) from upd), (select count(*) from clr) into v_set, v_clr;
  return jsonb_build_object('ok', true, 'actualizados', v_set, 'limpiados', v_clr);
end $function$;

-- ---------- recepcion_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".recepcion_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
  select jsonb_build_object(
    'insumos', (select coalesce(jsonb_agg(jsonb_build_object(
        'comp_id',c.id,'codigo',c.codigo,'descripcion',c.descripcion,'sector',s.nombre,
        'sector_id',c.sector_id,'um',c.unidad_medida,'uni_x_cajon',c.uni_x_cajon,
        'proveedor',coalesce(nullif(trim(fd.proveedor),''), nullif(trim(c.proveedor),'')),
        'n_fleje',fd.n_fleje,'medida',fd.medida_mm,
        'ultima', (select jsonb_build_object(
                     'fecha', r.fecha, 'cantidad', r.cantidad, 'unidad', r.unidad,
                     'rollos', r.rollos, 'pallets', r.pallets,
                     'remito', r.remito, 'proveedor', r.proveedor)
                     from "GP2".recepcion_insumo r
                    where r.componente_id = c.id
                    order by r.id desc limit 1),
        -- OC abiertas esperando este insumo: lo que todavia no se recibio
        'oc_pend', (select case when count(*) = 0 then null else jsonb_build_object(
                       'ocs', string_agg(distinct o.numero::text, ', '),
                       'n_ocs', count(distinct o.id),
                       'pendiente', sum(i.cantidad - coalesce(i.recibido,0)),
                       'unidad', min(i.unidad),
                       'unidades_mezcladas', (count(distinct i.unidad) > 1)) end
                     from "GP2".orden_compra o
                     join "GP2".orden_compra_item i on i.oc_id = o.id
                    where i.componente_id = c.id
                      and o.estado in ('borrador','enviada')
                      and i.cantidad > coalesce(i.recibido,0))
      ) order by s.nombre, c.codigo),'[]'::jsonb)
      from "GP2".componente c
      join "GP2".sector s on s.id=c.sector_id
      left join "GP2".fleje_detalle fd on fd.componente_id=c.id
      where "GP2"._es_sector_insumo(c.sector_id)),
    'proveedores', (select coalesce(jsonb_agg(jsonb_build_object(
        'nombre',p.nombre,'modo_control',p.modo_control,
        'informa_rollos',(p.modo_control='rollos_remito'),
        'factura_uni',p.factura_uni) order by p.nombre),'[]'::jsonb)
      from "GP2".proveedor_insumo p where p.activo),
    'sectores', (select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'nombre',s.nombre) order by s.nombre),'[]'::jsonb)
      from "GP2".sector s where "GP2"._es_sector_insumo(s.id)),
    'recepciones', (select coalesce(jsonb_agg(to_jsonb(v) order by v.recepcion_id desc),'[]'::jsonb)
      from (select * from "GP2".v_recepcion_control order by recepcion_id desc limit 200) v),
    'pallets', (select coalesce(jsonb_agg(to_jsonb(vp) order by vp.recepcion_id desc, vp.nro_pallet),'[]'::jsonb)
      from "GP2".v_control_pallet vp),
    'rollos', (select coalesce(jsonb_agg(jsonb_build_object(
        'control_id',cr.control_id,'cantidad',cr.cantidad,'kg_por_rollo',cr.kg_por_rollo) order by cr.id),'[]'::jsonb)
      from "GP2".recepcion_control_rollo cr),
    'tara', (select jsonb_object_agg(clave, valor) from "GP2".parametro
             where clave like 'tara_pallet%' or clave in ('tol_ctrl_peso_pct','carton_uni_x_paquete'))
  );
$function$;

-- ---------- recepcion_insumos_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".recepcion_insumos_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
  select jsonb_build_object(
    'insumos', (select coalesce(jsonb_agg(jsonb_build_object(
        'comp_id',c.id,'codigo',c.codigo,'descripcion',c.descripcion,'sector',s.nombre,
        'sector_id',c.sector_id,'um',c.unidad_medida,
        'proveedor',nullif(trim(fd.proveedor),''),'n_fleje',fd.n_fleje,'medida',fd.medida_mm,
        'ultima', (select jsonb_build_object(
                     'fecha', r.fecha, 'cantidad', r.cantidad, 'unidad', r.unidad,
                     'rollos', r.rollos, 'pallets', r.pallets,
                     'remito', r.remito, 'proveedor', r.proveedor)
                     from "GP2".recepcion_insumo r
                    where r.componente_id = c.id
                    order by r.id desc limit 1)
      ) order by s.nombre, c.codigo),'[]'::jsonb)
      from "GP2".componente c
      join "GP2".sector s on s.id=c.sector_id
      left join "GP2".fleje_detalle fd on fd.componente_id=c.id
      where "GP2"._es_sector_insumo(c.sector_id)),
    'recientes', (select coalesce(jsonb_agg(x.j order by x.ord desc),'[]'::jsonb) from (
        select r.id ord, jsonb_build_object('id',r.id,'fecha',r.fecha,'comp_id',r.componente_id,
          'codigo',c.codigo,'descripcion',c.descripcion,
          'proveedor',r.proveedor,'remito',r.remito,'cantidad',r.cantidad,'unidad',r.unidad,
          'rollos',r.rollos,'pallets',r.pallets) j
        from "GP2".recepcion_insumo r join "GP2".componente c on c.id=r.componente_id
        order by r.id desc limit 60) x)
  );
$function$;

-- ---------- recepcion_virgilio ----------
CREATE OR REPLACE FUNCTION "GP2".recepcion_virgilio(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare
  v_fecha   timestamptz := coalesce(nullif(p->>'fecha','')::timestamptz, now());
  v_tipo    text := lower(coalesce(p->>'origen_tipo',''));
  v_oid     bigint := nullif(p->>'origen_id','')::bigint;
  v_dry     boolean := coalesce((p->>'dry_run')::boolean, false);
  v_uvirg   bigint; v_uorig bigint;
  it jsonb; v_art record; v_compfin bigint; v_qty numeric; v_prin record; r record;
  v_movs jsonb := '[]'::jsonb; v_n int := 0;
begin
  select id into v_uvirg from ubicacion where tipo='virgilio' limit 1;
  if v_uvirg is null then raise exception 'No existe la ubicacion de Virgilio'; end if;
  if v_tipo not in ('tallerista','proveedor_at','proveedor_servicio','interno') then
    raise exception 'origen_tipo invalido: %', v_tipo;
  end if;
  if v_tipo <> 'interno' then
    select id into v_uorig from ubicacion where tipo=v_tipo and ref_id=v_oid limit 1;
    if v_uorig is null then raise exception 'El origen % % no tiene ubicacion', v_tipo, v_oid; end if;
  end if;

  for it in select * from jsonb_array_elements(coalesce(p->'items','[]'::jsonb)) loop
    v_qty := coalesce((it->>'cantidad')::numeric, 0);
    if v_qty <= 0 then continue; end if;
    select a.id, a.codigo into v_art from articulo a
     where a.id = nullif(it->>'articulo_id','')::bigint or a.codigo = nullif(it->>'codigo','') limit 1;
    if v_art.id is null then raise exception 'Articulo no encontrado: %', coalesce(it->>'codigo', it->>'articulo_id'); end if;
    select c.id into v_compfin from componente c where c.sector_id=12 and c.codigo=v_art.codigo limit 1;
    if v_compfin is null then raise exception 'El articulo % no tiene componente terminado', v_art.codigo; end if;
    select ac.componente_id, ac.cantidad, c.sector_id into v_prin
      from articulo_componente ac join componente c on c.id=ac.componente_id
     where ac.articulo_id=v_art.id
     order by (c.sector_id=2) desc, ac.cantidad desc, ac.componente_id limit 1;
    if v_prin.componente_id is null then raise exception 'El articulo % no tiene receta', v_art.codigo; end if;

    for r in select ac.componente_id, ac.cantidad, c.sector_id
               from articulo_componente ac join componente c on c.id=ac.componente_id
              where ac.articulo_id=v_art.id and ac.componente_id<>v_prin.componente_id loop
      v_movs := v_movs || jsonb_build_object(
        'tipo_mov','consumo_virgilio','comp_id',r.componente_id,
        'ubic_origen_id', case when v_tipo='interno'
          then (select id from ubicacion where tipo='sector' and ref_id=r.sector_id limit 1)
          else v_uorig end,
        'ubic_destino_id',null,'cantidad',v_qty*r.cantidad);
    end loop;

    v_movs := v_movs || jsonb_build_object(
      'tipo_mov','recepcion_virgilio','comp_id',v_prin.componente_id,
      'ubic_origen_id', case when v_tipo='interno'
        then (select id from ubicacion where tipo='sector' and ref_id=v_prin.sector_id limit 1)
        else v_uorig end,
      'ubic_destino_id',v_uvirg,'cantidad',v_qty*v_prin.cantidad,
      'comp_transformado_id',v_compfin,'cantidad_transformada',v_qty);
    v_n := v_n+1;
  end loop;

  if v_dry then return jsonb_build_object('ok',true,'dry_run',true,'articulos',v_n,'movimientos',v_movs); end if;

  insert into movimiento(fecha,tipo_mov,comp_id,ubic_origen_id,ubic_destino_id,cantidad,unidad_origen,
                         comp_transformado_id,cantidad_transformada,unidad_destino)
  select v_fecha, m->>'tipo_mov', (m->>'comp_id')::bigint,
         nullif(m->>'ubic_origen_id','')::bigint, nullif(m->>'ubic_destino_id','')::bigint,
         (m->>'cantidad')::numeric,'uni',
         nullif(m->>'comp_transformado_id','')::bigint, nullif(m->>'cantidad_transformada','')::numeric,'uni'
  from jsonb_array_elements(v_movs) m;

  return jsonb_build_object('ok',true,'articulos',v_n,'movimientos',jsonb_array_length(v_movs));
end $function$;

-- ---------- recepcion_virgilio_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".recepcion_virgilio_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
  with hist as (
    select btrim(e."Nombre_Tall") nom, btrim(e."Cod") cod, count(*) n, max(e."Fecha") ultima
    from public."Entregas Tallerista Virgilio" e
    where e."Cod" is not null and btrim(e."Cod") <> ''
    group by 1,2
  ),
  hist_boca as (select nom, sum(n) n, max(ultima) ultima from hist group by 1),
  bocas as (
    select 'tallerista' tipo, t.id, t.nombre,
           (select u.id from ubicacion u where u.tipo='tallerista' and u.ref_id=t.id) ubic_id
      from tallerista t where t.id <> 3
    union all
    select 'proveedor_at', p.id, p.nombre,
           (select u.id from ubicacion u where u.tipo='proveedor_at' and u.ref_id=p.id)
      from proveedor_at p where p.activo
    union all
    select 'interno', null::bigint, 'Log/Fabr', null::bigint
  ),
  cruce as (
    select b.*, h.nom hist_nom, h.n, h.ultima
    from bocas b
    left join hist_boca h on
      (b.tipo='interno' and lower(btrim(h.nom)) in ('log/ fabr','log/fabr'))
      or (b.tipo<>'interno' and (
            lower(btrim(h.nom)) = lower(btrim(b.nombre))
         or lower(btrim(b.nombre)) ~ ('(^|\s)'||lower(btrim(h.nom))||'($|\s)')
         or lower(btrim(h.nom))   ~ ('(^|\s)'||lower(btrim(b.nombre))||'($|\s)')))
  )
  select jsonb_build_object(
    'generado_en', now(),
    'ubicacion_virgilio', (select jsonb_build_object('id',u.id,'nombre',u.nombre)
                             from ubicacion u where u.tipo='virgilio' limit 1),
    'bocas', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'tipo',tipo,'id',id,'nombre',nombre,'ubic_id',ubic_id,
               'hist_nom',hist_nom,'entregas_hist',coalesce(n,0),'ultima_hist',ultima
             ) order by coalesce(n,0) desc, nombre), '[]'::jsonb) from cruce),
    'articulos', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id',a.id,'codigo',a.codigo,'familia',a.familia,
               'comp_fin',cf.id,'desc',cf.descripcion,
               'partes',(select count(*) from articulo_componente ac where ac.articulo_id=a.id)
             ) order by a.codigo), '[]'::jsonb)
      from articulo a left join componente cf on cf.sector_id=12 and cf.codigo=a.codigo),
    'sugeridos', (
      select coalesce(jsonb_object_agg(nom, cods), '{}'::jsonb)
      from (select h.nom, jsonb_agg(h.cod order by h.n desc) cods
              from (select nom, cod, n, row_number() over (partition by nom order by n desc) rn
                      from hist) h
             where h.rn <= 25 group by h.nom) z),
    -- quien entrega en la app vieja y no tiene equivalente en GP2
    'sin_cruzar', (
      select coalesce(jsonb_agg(jsonb_build_object('nombre',hb.nom,'entregas',hb.n)
                                order by hb.n desc), '[]'::jsonb)
      from hist_boca hb
      where not exists (select 1 from cruce c where c.hist_nom = hb.nom))
  );
$function$;

-- ---------- registrar_evento_prod ----------
CREATE OR REPLACE FUNCTION "GP2".registrar_evento_prod(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare
  v_id bigint; v_f timestamptz; v_f_ar timestamp; v_leg text; v_mat text; v_uni numeric;
  v_mid bigint; v_mname text; v_partes numeric; v_nombre text;
  v_nsal int; v_salida bigint; v_entrada bigint;
  v_ent_um text; v_sal_um text; v_sec_ent int; v_sec_sal int;
  v_uent bigint; v_usal bigint; v_cant numeric; v_uo text; v_ud text;
  v_movid bigint; v_aviso text;
  v_th numeric; v_tt numeric; v_premio numeric; v_segs numeric;
begin
  v_f   := coalesce(nullif(p->>'fecha','')::timestamptz, now());
  v_f_ar := v_f at time zone 'America/Argentina/Buenos_Aires';
  v_leg := nullif(btrim(coalesce(p->>'legajo','')),'');
  v_mat := nullif(btrim(coalesce(p->>'matriz','')),'');
  v_uni := coalesce(nullif(p->>'uni','')::numeric, 0);
  if v_leg is null then raise exception 'Falta el legajo'; end if;
  if v_mat is null then raise exception 'Falta la matriz/codigo del evento'; end if;

  select nombre into v_nombre from empleado where legajo = v_leg;
  select id, descripcion, partes_por_kilo_de_fleje, tiempo_historico
    into v_mid, v_mname, v_partes, v_th
    from matriz where btrim(n_matriz) = v_mat limit 1;

  -- premio nativo: tiempo_toma = segundos trabajados / uni; premio contra el historico
  if v_uni > 0 then
    v_segs := nullif(p->>'segundos_trabajados','')::numeric;
    v_tt := coalesce(nullif(p->>'tiempo_toma','')::numeric,
                     case when v_segs > 0 then round((v_segs / v_uni)::numeric, 4) end);
    if v_tt is not null and v_th is not null and v_th > 0 then
      v_premio := round(((-(v_tt / v_th) + 1) * 10)::numeric, 2);
    end if;
  end if;

  insert into produccion(
    fecha, legajo, nombre_empleado, matriz_raw, matriz_id, nombre_matriz, uni,
    hora_inicio, hora_fin, tiempo_toma, tiempo_historico, premio,
    segundos_trabajados, segundos_tiempo_muerto,
    dia, mes, quincena, id_ejecucion, origen_created_at
  ) values (
    v_f, v_leg, coalesce(nullif(p->>'nombre_empleado',''), v_nombre), v_mat, v_mid,
    coalesce(nullif(p->>'nombre_matriz',''), v_mname), v_uni,
    nullif(p->>'hora_inicio','')::time, nullif(p->>'hora_fin','')::time,
    v_tt, case when v_uni > 0 then v_th end, v_premio,
    nullif(p->>'segundos_trabajados','')::numeric,
    nullif(p->>'segundos_tiempo_muerto','')::numeric,
    extract(day from v_f_ar)::int, extract(month from v_f_ar)::int,
    case when extract(day from v_f_ar)::int <= 15 then 1 else 2 end,
    nullif(p->>'id_ejecucion',''), now()
  )
  on conflict (id_ejecucion) where id_ejecucion is not null do nothing
  returning id into v_id;

  -- reintento del mismo evento (id_ejecucion ya registrado): devolver el existente sin tocar stock
  if v_id is null then
    select id into v_id from produccion where id_ejecucion = nullif(p->>'id_ejecucion','');
    return jsonb_build_object('ok',true,'id',v_id,'dup',true);
  end if;

  if v_uni > 0 and v_mid is not null and coalesce(p->>'mover_stock','true') <> 'false' then
    v_salida := nullif(p->>'comp_salida_id','')::bigint;
    if v_salida is not null then
      if not exists(select 1 from ruta_paso where matriz_id=v_mid and comp_salida_id=v_salida) then
        v_aviso := 'Sin stock: la pieza elegida no corresponde a la matriz'; v_salida := null;
      end if;
    else
      select count(distinct comp_salida_id) into v_nsal
        from ruta_paso where matriz_id=v_mid and tipo_paso='matriz' and comp_salida_id is not null;
      if v_nsal = 1 then
        select distinct comp_salida_id into v_salida from ruta_paso
         where matriz_id=v_mid and tipo_paso='matriz' and comp_salida_id is not null;
      elsif v_nsal > 1 then v_aviso := 'Sin stock: la matriz produce varias piezas (falta comp_salida_id)';
      end if;
    end if;
    if v_salida is not null then
      select comp_entrada_id into v_entrada from ruta_paso
       where matriz_id=v_mid and comp_salida_id=v_salida and comp_entrada_id is not null limit 1;
      if v_entrada is not null then
        select unidad_medida, sector_id into v_ent_um, v_sec_ent from componente where id=v_entrada;
        select unidad_medida, sector_id into v_sal_um, v_sec_sal from componente where id=v_salida;
        select id into v_uent from ubicacion where tipo='sector' and ref_id=v_sec_ent limit 1;
        select id into v_usal from ubicacion where tipo='sector' and ref_id=v_sec_sal limit 1;
        if lower(coalesce(v_ent_um,''))='kg' then
          if v_partes is null or v_partes<=0 then
            v_aviso := 'Sin stock: la matriz no tiene piezas/kg cargadas';
          else v_cant := v_uni / v_partes; v_uo := 'kg'; end if;
        else v_cant := v_uni; v_uo := 'uni'; end if;
        v_ud := case when lower(coalesce(v_sal_um,''))='kg' then 'kg' else 'uni' end;
        if v_cant is not null and v_uent is not null and v_usal is not null then
          insert into movimiento(fecha,tipo_mov,comp_id,ubic_origen_id,ubic_destino_id,cantidad,unidad_origen,
                                 comp_transformado_id,cantidad_transformada,unidad_destino)
          values (v_f,'fabricacion', v_entrada, v_uent, v_usal, v_cant, v_uo, v_salida, v_uni, v_ud)
          returning id into v_movid;
        end if;
      else v_aviso := 'Sin stock: la matriz no tiene entrada en las rutas';
      end if;
    end if;
  end if;

  return jsonb_build_object('ok',true,'id',v_id,'movimiento_id',v_movid,'aviso',v_aviso,'premio',v_premio);
end $function$;

-- ---------- registrar_movimientos ----------
CREATE OR REPLACE FUNCTION "GP2".registrar_movimientos(p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare r jsonb; ids bigint[]:='{}'; new_id bigint;
begin
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'p_rows debe ser un array JSON'; end if;
  if jsonb_array_length(p_rows)=0 then raise exception 'No hay movimientos para registrar'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    insert into "GP2".movimiento(
      fecha, tipo_mov, comp_id, ubic_origen_id, ubic_destino_id, cantidad,
      unidad_origen, comp_transformado_id, cantidad_transformada, unidad_destino,
      cajones, faltante
    ) values (
      coalesce(nullif(r->>'fecha','')::timestamptz, now()),
      r->>'tipo_mov',
      nullif(r->>'comp_id','')::bigint,
      nullif(r->>'ubic_origen_id','')::bigint,
      nullif(r->>'ubic_destino_id','')::bigint,
      coalesce(nullif(r->>'cantidad','')::numeric, 0),
      coalesce(nullif(r->>'unidad_origen',''),'uni'),
      nullif(r->>'comp_transformado_id','')::bigint,
      nullif(r->>'cantidad_transformada','')::numeric,
      coalesce(nullif(r->>'unidad_destino',''),'uni'),
      nullif(r->>'cajones','')::numeric,
      coalesce(nullif(r->>'faltante','')::boolean, false)
    ) returning id into new_id;
    ids := ids || new_id;
  end loop;
  return jsonb_build_object('ok', true, 'ids', to_jsonb(ids), 'n', coalesce(array_length(ids,1),0));
end $function$;

-- ---------- registrar_produccion ----------
CREATE OR REPLACE FUNCTION "GP2".registrar_produccion(p_legajo text, p_matriz text, p_uni numeric, p_fecha timestamp with time zone DEFAULT now(), p_nombre text DEFAULT NULL::text, p_comp_salida_id bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
declare
  v_mid bigint; v_mname text; v_partes numeric; v_id bigint; v_f timestamptz;
  v_nsal int; v_salida bigint; v_entrada bigint;
  v_ent_um text; v_sal_um text; v_sec_ent int; v_sec_sal int;
  v_uent bigint; v_usal bigint; v_cant numeric; v_uo text; v_ud text;
  v_movid bigint; v_aviso text := null;
begin
  if p_matriz is null or btrim(p_matriz)='' then raise exception 'La matriz es obligatoria'; end if;
  if p_uni is null or p_uni<=0 then raise exception 'Las unidades deben ser mayores a 0'; end if;
  v_f := coalesce(p_fecha, now());
  select id, descripcion, partes_por_kilo_de_fleje into v_mid, v_mname, v_partes
    from matriz where btrim(n_matriz)=btrim(p_matriz) limit 1;
  if v_mid is null then raise exception 'La matriz "%" no existe en GP2', p_matriz; end if;

  select count(distinct comp_salida_id) into v_nsal
    from ruta_paso where matriz_id=v_mid and tipo_paso='matriz' and comp_salida_id is not null;
  if p_comp_salida_id is not null then
    if exists(select 1 from ruta_paso where matriz_id=v_mid and comp_salida_id=p_comp_salida_id)
      then v_salida := p_comp_salida_id;
      else raise exception 'La pieza elegida no corresponde a la matriz %', p_matriz; end if;
  elsif v_nsal=1 then
    select distinct comp_salida_id into v_salida from ruta_paso where matriz_id=v_mid and tipo_paso='matriz' and comp_salida_id is not null;
  elsif v_nsal>1 then
    raise exception 'La matriz % produce varias piezas: elegi cual (p_comp_salida_id)', p_matriz;
  end if;
  if v_salida is not null then
    select comp_entrada_id into v_entrada from ruta_paso
      where matriz_id=v_mid and comp_salida_id=v_salida and comp_entrada_id is not null limit 1;
  end if;

  insert into produccion(fecha, legajo, nombre_empleado, matriz_raw, matriz_id, nombre_matriz, uni,
                         dia, mes, quincena, origen_created_at)
  values (v_f, nullif(btrim(coalesce(p_legajo,'')),''), nullif(btrim(coalesce(p_nombre,'')),''),
          btrim(p_matriz), v_mid, v_mname, p_uni,
          extract(day from v_f)::int, extract(month from v_f)::int,
          case when extract(day from v_f)::int <= 15 then 1 else 2 end, now())
  returning id into v_id;

  if v_salida is not null and v_entrada is not null then
    select unidad_medida, sector_id into v_ent_um, v_sec_ent from componente where id=v_entrada;
    select unidad_medida, sector_id into v_sal_um, v_sec_sal from componente where id=v_salida;
    select id into v_uent from ubicacion where tipo='sector' and ref_id=v_sec_ent limit 1;
    select id into v_usal from ubicacion where tipo='sector' and ref_id=v_sec_sal limit 1;
    if lower(coalesce(v_ent_um,''))='kg' then
      if v_partes is null or v_partes<=0 then v_aviso := 'Registrado, pero NO se movio stock: la matriz no tiene rendimiento (ppk) para pasar uni->kg de fleje';
      else v_cant := p_uni / v_partes; v_uo := 'kg'; end if;
    else
      v_cant := p_uni; v_uo := 'uni';   -- pieza->pieza: consume p_uni de la entrada
    end if;
    v_ud := case when lower(coalesce(v_sal_um,''))='kg' then 'kg' else 'uni' end;
    if v_cant is not null and v_uent is not null and v_usal is not null then
      insert into movimiento(fecha,tipo_mov,comp_id,ubic_origen_id,ubic_destino_id,cantidad,unidad_origen,
                             comp_transformado_id,cantidad_transformada,unidad_destino)
      values (v_f,'fabricacion', v_entrada, v_uent, v_usal, v_cant, v_uo, v_salida, p_uni, v_ud)
      returning id into v_movid;
    elsif v_aviso is null then v_aviso := 'Registrado, pero NO se movio stock: falta ubicacion de sector';
    end if;
  else
    v_aviso := 'Registrado (solo produccion): la matriz no tiene entrada/salida resuelta en las rutas';
  end if;

  return jsonb_build_object('ok',true,'id',v_id,'matriz',btrim(p_matriz),'nombre_matriz',v_mname,
    'uni',p_uni,'salida_id',v_salida,'movimiento_id',v_movid,'aviso',v_aviso);
end $function$;

-- ---------- registro_operarios_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".registro_operarios_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
  select jsonb_build_object(
    'empleados', (select coalesce(jsonb_object_agg(e.legajo, jsonb_build_object(
        'nombre',e.nombre,'activo',e.activo,'hora_entrada',e.hora_entrada)),'{}'::jsonb)
      from "GP2".empleado e),
    'matrices', (select coalesce(jsonb_agg(jsonb_build_object(
        'n',m.n_matriz,'d',m.descripcion,'ppk',m.partes_por_kilo_de_fleje) order by m.n_matriz),'[]'::jsonb)
      from "GP2".matriz m),
    'matriz_fleje', (select coalesce(jsonb_object_agg(q.n_matriz, jsonb_build_object(
        'comp_id',q.comp_id,'codigo',q.codigo,'descripcion',q.descripcion)),'{}'::jsonb)
      from (
        select distinct on (m.n_matriz) m.n_matriz, c.id comp_id, c.codigo, c.descripcion
        from "GP2".matriz m
        join "GP2".ruta_paso rp on rp.matriz_id=m.id and rp.tipo_paso='matriz' and rp.comp_entrada_id is not null
        join "GP2".componente c on c.id=rp.comp_entrada_id and c.sector_id=5
        order by m.n_matriz, c.id
      ) q),
    -- Matrices que producen MAS de una pieza: la app pregunta cual se fabrica
    -- y manda comp_salida_id en el evento C para que el stock vaya al lugar correcto.
    'matriz_salidas', (select coalesce(jsonb_object_agg(t.n_matriz, t.salidas),'{}'::jsonb)
      from (
        select m.n_matriz,
               jsonb_agg(jsonb_build_object('comp_id',q.comp_salida_id,'codigo',q.codigo,'descripcion',q.descripcion)
                         order by q.codigo) salidas
        from (
          select distinct rp.matriz_id, rp.comp_salida_id, c.codigo, c.descripcion
          from "GP2".ruta_paso rp
          join "GP2".componente c on c.id=rp.comp_salida_id
          where rp.tipo_paso='matriz' and rp.comp_salida_id is not null
        ) q
        join "GP2".matriz m on m.id=q.matriz_id
        group by m.n_matriz
        having count(*) > 1
      ) t),
    'rollos_saldo', (select coalesce(jsonb_agg(jsonb_build_object(
        'comp_id',v.componente_id,'codigo',v.codigo,'kg_por_rollo',v.kg_por_rollo,'rollos',v.rollos)
        order by v.codigo, v.kg_por_rollo),'[]'::jsonb)
      from "GP2".v_rollo_saldo v where v.rollos <> 0),
    -- Usos de rollo ABIERTOS (ts_fin null): kg usados calculados con lo YA registrado
    -- en produccion; la app suma encima solo lo que tiene en cola sin sincronizar.
    'rollos_abiertos', (select coalesce(jsonb_object_agg(u.legajo, jsonb_build_object(
        'uso_id',u.id,'comp_id',u.componente_id,'codigo',c.codigo,
        'kg_por_rollo',u.kg_por_rollo,'matriz',u.matriz_raw,'ts_inicio',u.ts_inicio,
        'kg_usados', case when m.partes_por_kilo_de_fleje > 0 then round(
            (coalesce((select sum(p.uni) from "GP2".produccion p
                       where p.legajo=u.legajo and p.fecha >= u.ts_inicio and p.uni > 0),0)
            / m.partes_por_kilo_de_fleje)::numeric, 2) else 0 end)),'{}'::jsonb)
      from "GP2".rollo_uso u
      join "GP2".componente c on c.id=u.componente_id
      left join "GP2".matriz m on btrim(m.n_matriz)=btrim(coalesce(u.matriz_raw,''))
      where u.ts_fin is null)
  );
$function$;

-- ---------- rollos_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".rollos_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
  select jsonb_build_object(
    'saldos', (select coalesce(jsonb_agg(to_jsonb(v) order by v.codigo, v.kg_por_rollo),'[]'::jsonb) from "GP2".v_rollo_saldo v),
    'eventos', (select coalesce(jsonb_agg(to_jsonb(x) order by x.id desc),'[]'::jsonb)
                from (select * from "GP2".v_rollo_evolucion order by id desc limit 300) x),
    'usos', (select coalesce(jsonb_agg(to_jsonb(u) order by u.id desc),'[]'::jsonb)
             from (select ru.*, c.codigo from "GP2".rollo_uso ru join "GP2".componente c on c.id=ru.componente_id
                   order by ru.id desc limit 100) u),
    'flejes', (select coalesce(jsonb_agg(jsonb_build_object('comp_id',c.id,'codigo',c.codigo,
                 'descripcion',c.descripcion,'n_fleje',fd.n_fleje,'medida',fd.medida_mm) order by c.codigo),'[]'::jsonb)
               from "GP2".componente c left join "GP2".fleje_detalle fd on fd.componente_id=c.id
               where c.sector_id=5)
  );
$function$;

-- ---------- ruta_confirmar ----------
CREATE OR REPLACE FUNCTION "GP2".ruta_confirmar(p_firma text, p_articulo text, p_fleje text, p_usuario text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
declare v_id bigint;
begin
  insert into "GP2".ruta_confirmada(firma,articulo,fleje,confirmado_por)
  values(p_firma,p_articulo,p_fleje,p_usuario)
  on conflict(firma) do update
    set confirmado_por=excluded.confirmado_por, confirmado_en=now()
  returning id into v_id;
  -- al confirmar, cerrar los problemas pendientes de esa ruta
  update "GP2".ruta_problema set estado='resuelto', resuelto_en=now()
  where firma=p_firma and estado='pendiente';
  return v_id;
end;
$function$;

-- ---------- ruta_reportar ----------
CREATE OR REPLACE FUNCTION "GP2".ruta_reportar(p_firma text, p_articulo text, p_fleje text, p_problema text, p_usuario text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
declare v_id bigint;
begin
  -- reportar un problema quita la confirmacion previa de esa firma
  delete from "GP2".ruta_confirmada where firma=p_firma;
  -- dedupe: si ya hay un problema pendiente de esa firma, actualizarlo en vez de apilar filas
  select id into v_id from "GP2".ruta_problema
   where firma=p_firma and estado='pendiente'
   order by reportado_en desc limit 1;
  if v_id is not null then
    update "GP2".ruta_problema
       set problema=p_problema, reportado_por=p_usuario, reportado_en=now(),
           articulo=coalesce(nullif(p_articulo,''),articulo), fleje=coalesce(nullif(p_fleje,''),fleje)
     where id=v_id;
    return v_id;
  end if;
  insert into "GP2".ruta_problema(firma,articulo,fleje,problema,reportado_por)
  values(p_firma,p_articulo,p_fleje,p_problema,p_usuario)
  returning id into v_id;
  return v_id;
end;
$function$;

-- ---------- ruta_resolver ----------
CREATE OR REPLACE FUNCTION "GP2".ruta_resolver(p_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
begin
  update "GP2".ruta_problema
  set estado='resuelto', resuelto_en=now()
  where id=p_id;
end;
$function$;

-- ---------- stock_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".stock_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
  select jsonb_build_object(
    'generado_en', now(),
    'rows', coalesce((
      select jsonb_agg(r order by r->>'cod', r->>'ubi')
      from (
        select jsonb_build_object(
          'cod',   c.codigo,
          'desc',  c.descripcion,
          'um',    c.unidad_medida,
          'st',    s.tipo,
          'sec',   s.nombre,
          'ut',    u.tipo,
          'ubi',   u.nombre,
          'qty',   i.cantidad,
          'min',   i.minimo,
          'kg',    case when c.kg_x_uni   is not null then i.cantidad * c.kg_x_uni end,
          'caj',   case when c.uni_x_cajon is not null and c.uni_x_cajon <> 0
                        then i.cantidad / c.uni_x_cajon end
        ) as r
        from "GP2".inventario i
        join "GP2".componente c on c.id = i.componente_id
        left join "GP2".sector  s on s.id = c.sector_id
        join "GP2".ubicacion u on u.id = i.ubicacion_id
      ) q
    ), '[]'::jsonb),
    'ubicaciones', coalesce((
      select jsonb_agg(jsonb_build_object('tipo',u.tipo,'nombre',u.nombre) order by u.tipo, u.nombre)
      from "GP2".ubicacion u
      where exists (select 1 from "GP2".inventario i where i.ubicacion_id = u.id)
    ), '[]'::jsonb),
    'sectores', coalesce((
      select jsonb_agg(jsonb_build_object('tipo',s.tipo,'nombre',s.nombre) order by s.tipo, s.nombre)
      from "GP2".sector s
    ), '[]'::jsonb)
  );
$function$;

-- ---------- stock_sector_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".stock_sector_bundle(p_sector_id bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
with ubic as (
  select id from ubicacion where tipo='sector' and ref_id=p_sector_id limit 1
),
comps as (
  select c.* from componente c where c.sector_id = p_sector_id
),
-- entradas al sector: el componente que llega es el transformado si existe
ent as (
  select coalesce(m.comp_transformado_id, m.comp_id) comp_id,
         m.tipo_mov,
         sum(coalesce(m._delta_dest,0)) qty,
         count(*) n
    from movimiento m
   where m.ubic_destino_id = (select id from ubic)
   group by 1,2
),
-- salidas del sector
sal as (
  select m.comp_id, m.tipo_mov,
         sum(coalesce(m._delta_orig,0)) qty,
         count(*) n
    from movimiento m
   where m.ubic_origen_id = (select id from ubic)
   group by 1,2
),
mov as (
  select comp_id,
         jsonb_object_agg(tipo_mov, jsonb_build_object('ent',ent_q,'sal',sal_q,'n',n_tot)) obj
    from (
      select coalesce(e.comp_id, s.comp_id) comp_id,
             coalesce(e.tipo_mov, s.tipo_mov) tipo_mov,
             coalesce(e.qty,0) ent_q, coalesce(s.qty,0) sal_q,
             coalesce(e.n,0)+coalesce(s.n,0) n_tot
        from ent e
        full join sal s on s.comp_id=e.comp_id and s.tipo_mov=e.tipo_mov
    ) z
   group by comp_id
)
select jsonb_build_object(
  'generado_en', now(),
  'sector', (select jsonb_build_object('id',s.id,'nombre',s.nombre) from sector s where s.id=p_sector_id),
  'ubicacion_id', (select id from ubic),
  'filas', coalesce((select jsonb_agg(jsonb_build_object(
      'comp_id', c.id,
      'cod', c.codigo,
      'desc', c.descripcion,
      'um', c.unidad_medida,
      'kg_x_uni', c.kg_x_uni,
      'uni_x_cajon', c.uni_x_cajon,
      'online', coalesce(i.cantidad,0),
      'minimo', i.minimo,
      'maximo', i.maximo,
      'n_fleje', fd.n_fleje,
      'mov', coalesce(mv.obj, '{}'::jsonb)
    ) order by c.codigo)
    from comps c
    left join inventario i on i.componente_id=c.id and i.ubicacion_id=(select id from ubic)
    left join fleje_detalle fd on fd.componente_id=c.id
    left join mov mv on mv.comp_id=c.id), '[]'::jsonb)
);
$function$;

-- ---------- stock_transito_ps_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".stock_transito_ps_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
with pares as (
  select distinct
    p1.comp_salida_id comp_id,
    p1.proveedor_id ps1_id,
    p2.proveedor_id ps2_id,
    p1.comp_entrada_id sc_id
  from ruta_paso p1
  join ruta_paso p2 on p2.ruta_id = p1.ruta_id and p2.orden = p1.orden + 1
  where p1.tipo_paso='proveedor_servicio' and p2.tipo_paso='proveedor_servicio'
    and p1.comp_salida_id is not null and p2.comp_entrada_id = p1.comp_salida_id
), fila as (
  select pr.comp_id, c.codigo, c.descripcion, c.sector_id, c.unidad_medida um, c.kg_x_uni, c.uni_x_cajon,
         s.nombre sector,
         sc.codigo sc_cod,
         ps1.id ps1_id, ps1.nombre ps1_nombre, ps1.proceso ps1_proceso,
         ps2.id ps2_id, ps2.nombre ps2_nombre, ps2.proceso ps2_proceso,
         (select i.cantidad from inventario i join ubicacion u on u.id=i.ubicacion_id
           where i.componente_id=pr.comp_id and u.tipo='sector' and u.ref_id=c.sector_id limit 1) online,
         (select coalesce(sum(m._delta_dest),0) from movimiento m
           where m.tipo_mov='entrega_ps'
             and coalesce(m.comp_transformado_id, m.comp_id)=pr.comp_id
             and m.ubic_origen_id=(select id from ubicacion where tipo='proveedor_servicio' and ref_id=ps1.id)) entregado_origen,
         (select coalesce(sum(m._delta_orig),0) from movimiento m
           where m.tipo_mov='envio_ps' and m.comp_id=pr.comp_id
             and m.ubic_destino_id=(select id from ubicacion where tipo='proveedor_servicio' and ref_id=ps2.id)) enviado_siguiente
  from pares pr
  join componente c on c.id=pr.comp_id
  join sector s on s.id=c.sector_id
  left join componente sc on sc.id=pr.sc_id
  join proveedor_servicio ps1 on ps1.id=pr.ps1_id
  join proveedor_servicio ps2 on ps2.id=pr.ps2_id
)
select jsonb_build_object(
  'filas', (select coalesce(jsonb_agg(to_jsonb(f) order by f.codigo),'[]'::jsonb) from fila f),
  'generado_en', now());
$function$;

-- ---------- talleristas_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".talleristas_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
with ub as (
  select ref_id tall_id, id ubic_id from ubicacion where tipo='tallerista'
),
cfg as (
  select distinct rp.tallerista_id, rp.comp_entrada_id comp_id, 'entrada'::text lado
    from ruta_paso rp
   where rp.tipo_paso='tallerista' and rp.tallerista_id is not null and rp.comp_entrada_id is not null
  union
  select distinct rp.tallerista_id, rp.comp_salida_id, 'salida'
    from ruta_paso rp
   where rp.tipo_paso='tallerista' and rp.tallerista_id is not null and rp.comp_salida_id is not null
),
mov as (
  select u.tall_id, m.comp_id,
         sum(case when m.tipo_mov='envio_tallerista' then coalesce(m._delta_dest,0) else 0 end) enviado,
         -- _delta_orig se guarda POSITIVO (fn_movimiento_aplicar lo niega al aplicar):
         -- lo que salio del tallerista es +_delta_orig, no -_delta_orig
         sum(case when m.tipo_mov in ('entrega_tallerista','consumo_tall')
                  then coalesce(m._delta_orig,0) else 0 end) entregado,
         sum(case when m.tipo_mov='devolucion_tallerista'
                  then coalesce(m._delta_orig,0) else 0 end) devuelto
    from movimiento m
    join ub u on u.ubic_id in (m.ubic_origen_id, m.ubic_destino_id)
   group by u.tall_id, m.comp_id
),
fila as (
  select cfg.tallerista_id, cfg.lado,
         c.id comp_id, c.codigo cod, c.descripcion desc_, s.nombre sector,
         c.unidad_medida um, c.kg_x_uni, c.uni_x_cajon,
         coalesce((select i.cantidad from inventario i
                    where i.componente_id=c.id
                      and i.ubicacion_id=(select ubic_id from ub where tall_id=cfg.tallerista_id)),0) online_tall,
         (select i.maximo from inventario i
           where i.componente_id=c.id
             and i.ubicacion_id=(select ubic_id from ub where tall_id=cfg.tallerista_id)) maximo,
         coalesce((select i.cantidad from inventario i join ubicacion u2 on u2.id=i.ubicacion_id
                    where i.componente_id=c.id and u2.tipo='sector' and u2.ref_id=c.sector_id),0) online_sector,
         coalesce((select mv.enviado   from mov mv where mv.tall_id=cfg.tallerista_id and mv.comp_id=c.id),0) enviado,
         coalesce((select mv.entregado from mov mv where mv.tall_id=cfg.tallerista_id and mv.comp_id=c.id),0) entregado,
         coalesce((select mv.devuelto  from mov mv where mv.tall_id=cfg.tallerista_id and mv.comp_id=c.id),0) devuelto
    from cfg
    join componente c on c.id=cfg.comp_id
    left join sector s on s.id=c.sector_id
)
select jsonb_build_object(
  'generado_en', now(),
  'tall', (select coalesce(jsonb_agg(jsonb_build_object(
              'id',t.id,'nombre',t.nombre,'cod_prov',t.cod_prov,
              'n_entrada',(select count(*) from cfg where cfg.tallerista_id=t.id and cfg.lado='entrada'),
              'n_salida', (select count(*) from cfg where cfg.tallerista_id=t.id and cfg.lado='salida')
            ) order by t.nombre),'[]'::jsonb) from tallerista t),
  'bom', (select coalesce(jsonb_object_agg(padre::text, arr),'{}'::jsonb) from (
       select b.componente_padre_id padre,
              jsonb_agg(jsonb_build_object('comp_id',h.id,'cod',h.codigo,'desc',h.descripcion,'cantidad',b.cantidad)
                        order by h.codigo) arr
         from componente_bom b join componente h on h.id=b.componente_hijo_id
        group by b.componente_padre_id) z),
  'partes', (select coalesce(jsonb_object_agg(tallerista_id::text, obj),'{}'::jsonb) from (
       select tallerista_id,
              jsonb_build_object(
                'entrada', coalesce(jsonb_agg(j order by cod) filter (where lado='entrada'),'[]'::jsonb),
                'salida',  coalesce(jsonb_agg(j order by cod) filter (where lado='salida'), '[]'::jsonb)
              ) obj
         from (select tallerista_id, lado, cod,
                      jsonb_build_object(
                        'comp_id',comp_id,'cod',cod,'desc',desc_,'sector',sector,'um',um,
                        'kg_x_uni',kg_x_uni,'uni_x_cajon',uni_x_cajon,
                        'online_tall',online_tall,'online_sector',online_sector,'maximo',maximo,
                        'enviado',enviado,'entregado',entregado,'devuelto',devuelto,
                        'saldo',(enviado-entregado-devuelto)
                      ) j
                 from fila) z2
        group by tallerista_id) y)
);
$function$;

-- ---------- to_canonical ----------
CREATE OR REPLACE FUNCTION "GP2".to_canonical(p_comp bigint, p_qty numeric, p_unit text)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
declare
  v_canon   text;
  v_kgxuni  numeric;
  v_found   boolean := false;
  v_dim_mov text;
  v_dim_can text;
begin
  if p_qty is null then
    return 0;
  end if;
  if p_unit is null then
    return p_qty;
  end if;

  select unidad_medida, kg_x_uni, true
    into v_canon, v_kgxuni, v_found
    from "GP2".componente
   where id = p_comp;
  if not v_found then
    raise exception 'to_canonical: componente % inexistente', p_comp;
  end if;

  v_dim_mov := case when lower(p_unit) = 'kg' then 'kg' else 'uni' end;
  v_dim_can := case when lower(coalesce(v_canon,'unidad')) = 'kg' then 'kg' else 'uni' end;

  if v_dim_mov = v_dim_can then
    return p_qty;
  elsif v_dim_mov = 'kg' then
    if v_kgxuni is null or v_kgxuni = 0 then
      raise exception 'to_canonical: componente % sin kg_x_uni valido para kg->uni (qty=%)', p_comp, p_qty;
    end if;
    return p_qty / v_kgxuni;
  else
    if v_kgxuni is null or v_kgxuni = 0 then
      raise exception 'to_canonical: componente % sin kg_x_uni valido para uni->kg (qty=%)', p_comp, p_qty;
    end if;
    return p_qty * v_kgxuni;
  end if;
end;
$function$;

-- ---------- tomar_rollo ----------
CREATE OR REPLACE FUNCTION "GP2".tomar_rollo(p_legajo text, p_comp_id bigint, p_kg_por_rollo numeric, p_matriz text DEFAULT NULL::text, p_fecha timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare v_ev bigint; v_uso bigint; v_saldo numeric;
begin
  if p_kg_por_rollo is null or p_kg_por_rollo <= 0 then
    raise exception 'Elegi el peso del rollo';
  end if;
  select coalesce(sum(delta),0) into v_saldo from rollo_evento
   where componente_id=p_comp_id and kg_por_rollo=p_kg_por_rollo;
  insert into rollo_evento(fecha, componente_id, kg_por_rollo, delta, motivo, legajo)
  values (coalesce(p_fecha,now()), p_comp_id, p_kg_por_rollo, -1, 'toma_operario', p_legajo)
  returning id into v_ev;
  -- cerrar un uso abierto anterior sin datos (tomo otro rollo sin cerrar el previo)
  update rollo_uso set ts_fin = coalesce(p_fecha,now())
   where legajo=p_legajo and ts_fin is null;
  insert into rollo_uso(legajo, componente_id, kg_por_rollo, matriz_raw, ts_inicio, rollo_evento_id)
  values (p_legajo, p_comp_id, p_kg_por_rollo, p_matriz, coalesce(p_fecha,now()), v_ev)
  returning id into v_uso;
  return jsonb_build_object('ok',true,'uso_id',v_uso,'evento_id',v_ev,
    'saldo_anterior',v_saldo,'saldo_nuevo',v_saldo-1,
    'aviso', case when v_saldo<=0 then 'OJO: el stock de ese rollo ya estaba en '||v_saldo else null end);
end $function$;

-- ---------- verificacion_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".verificacion_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
with pasos as (
  select rp.ruta_id, rp.orden o, rp.tipo_paso tp,
    case rp.tipo_paso
      when 'matriz' then m.n_matriz
      when 'proveedor_servicio' then pv.nombre
      when 'tallerista' then t.nombre
      else null end as actor,
    case rp.tipo_paso
      when 'matriz' then m.descripcion
      when 'proveedor_servicio' then pv.proceso
      when 'tallerista' then t.clase
      else null end as actor_desc,
    ce.codigo ce, ce.descripcion ce_d, se.tipo ce_sect,
    cs.codigo cs, cs.descripcion cs_d, sc.tipo cs_sect,
    ra.codigo paso_art
  from ruta_paso rp
  left join matriz m on m.id = rp.matriz_id
  left join proveedor_servicio pv on pv.id = rp.proveedor_id
  left join tallerista t on t.id = rp.tallerista_id
  left join componente ce on ce.id = rp.comp_entrada_id
  left join sector se on se.id = ce.sector_id
  left join componente cs on cs.id = rp.comp_salida_id
  left join sector sc on sc.id = cs.sector_id
  left join articulo ra on ra.id = rp.articulo_id
),
ruta_fleje as (
  select distinct on (ruta_id) ruta_id, componente_fleje_id fl
  from ruta_paso where componente_fleje_id is not null
  order by ruta_id, orden
),
rutas_full as (
  select r.id, r.nombre nom, a.codigo art, a.familia fam,
    cf.codigo fleje, cf.descripcion fleje_desc,
    (select jsonb_agg(jsonb_build_object(
        'o',p.o,'tp',p.tp,'actor',p.actor,'actor_desc',p.actor_desc,
        'ce',p.ce,'ce_d',p.ce_d,'ce_sect',p.ce_sect,
        'cs',p.cs,'cs_d',p.cs_d,'cs_sect',p.cs_sect,'art',p.paso_art) order by p.o)
     from pasos p where p.ruta_id = r.id) pasos
  from ruta r
  left join articulo a on a.id = r.articulo_id
  left join ruta_fleje rf on rf.ruta_id = r.id
  left join componente cf on cf.id = rf.fl
)
select jsonb_build_object(
  'rutas', (select jsonb_agg(jsonb_build_object(
       'id',id,'nom',nom,'art',art,'fam',fam,'fleje',fleje,'fleje_desc',fleje_desc,'pasos',pasos)
       order by art nulls last, id) from rutas_full),
  'counts', jsonb_build_object(
     'rutas', (select count(*) from ruta),
     'pasos', (select count(*) from ruta_paso),
     'arts',  (select count(distinct articulo_id) from ruta)
  ),
  'confirmadas', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'firma',firma,'articulo',articulo,'fleje',fleje,
      'por',confirmado_por,'en',confirmado_en)),
    '[]'::jsonb) from ruta_confirmada
  ),
  'problemas', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',id,'firma',firma,'articulo',articulo,'fleje',fleje,
      'problema',problema,'estado',estado,
      'por',reportado_por,'en',reportado_en,'resuelto_en',resuelto_en)
      order by reportado_en desc),
    '[]'::jsonb) from ruta_problema
  )
);
$function$;

-- ---------- verifmadres_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".verifmadres_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2', 'public'
AS $function$
  with comp as (
    select
      c.id,
      c.codigo,
      c.descripcion,
      c.sector_id,
      c.unidad_medida,
      c.kg_x_uni,
      c.uni_x_cajon,
      (c.kg_x_uni is null or c.kg_x_uni = 0)       as falta_kg,
      (c.uni_x_cajon is null or c.uni_x_cajon = 0) as falta_uxc
    from componente c
  ),
  sec as (
    select
      s.id, s.tipo, s.nombre,
      count(c.id)                                   as total,
      count(*) filter (where c.falta_kg)            as sin_kg,
      count(*) filter (where c.falta_uxc)           as sin_uxc,
      count(*) filter (where not c.falta_kg)        as con_kg,
      -- relevante para verificar peso: sector con al menos un componente que SI tiene peso
      (count(*) filter (where not c.falta_kg) > 0)  as relevante_peso
    from sector s
    left join comp c on c.sector_id = s.id
    group by s.id, s.tipo, s.nombre
  ),
  mat as (
    select
      m.id, m.n_matriz, m.descripcion, m.tipo,
      m.partes_por_kilo_de_fleje as ppk,
      (m.partes_por_kilo_de_fleje is null or m.partes_por_kilo_de_fleje = 0) as falta_ppk
    from matriz m
  )
  select jsonb_build_object(
    'generado', now(),
    'sectores', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'tipo', tipo, 'nombre', nombre,
        'total', total, 'sin_kg', sin_kg, 'sin_uxc', sin_uxc,
        'relevante_peso', relevante_peso
      ) order by id), '[]'::jsonb) from sec
    ),
    'comp', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'cod', codigo, 'd', descripcion, 's', sector_id,
        'um', unidad_medida, 'kg', kg_x_uni, 'uxc', uni_x_cajon,
        'fkg', falta_kg, 'fuxc', falta_uxc
      ) order by sector_id, codigo), '[]'::jsonb) from comp
    ),
    'matriz', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'n', n_matriz, 'd', descripcion, 'tipo', tipo,
        'ppk', ppk, 'fppk', falta_ppk
      ) order by n_matriz), '[]'::jsonb) from mat
    ),
    'resumen', (
      select jsonb_build_object(
        'total_comp', (select count(*) from comp),
        'total_sin_kg', (select count(*) from comp where falta_kg),
        'total_sin_uxc', (select count(*) from comp where falta_uxc),
        'total_matriz', (select count(*) from mat),
        'matriz_sin_ppk', (select count(*) from mat where falta_ppk),
        'sectores_relevantes', (select count(*) from sec where relevante_peso)
      )
    )
  );
$function$;
