-- Cambiar Inyector por familia (2026-10-09) [Thomas: "Quiero que agregues el módulo de Cambiar Inyectores
-- que está oculto con la finalidad de poder cambiar las partes que produce cada uno. Los inyectores se llevan
-- las matrices. Hay una matriz por familia. Estas familias están modeladas en órdenes de compra de plásticos.
-- La única familia que no va en este módulo es la familia Otros. Entonces la idea es que pueda cambiar quién
-- posee la matriz de la familia. Que me deje cambiar por cada familia"].
--
-- Modelo (sin tablas nuevas): la familia es GP2.familia_pedido (una matriz del inyector) y el inyector de
-- cada pieza es componente.proveedor. Cambiar quién tiene la matriz = pasar el proveedor de TODAS las piezas
-- de la familia de una vez. "Otros" = piezas con familia_pedido NULL: no son familia y no entran.
-- Inyector = proveedor_insumo activo con ubicacion tipo 'inyector' (el mismo criterio que inyectores_bundle).
-- Piezas que no se compran (discontinuado o estado_compra fabricacion/discontinuo/importado) no se tocan.

-- ---------- cambiar_inyector_bundle ----------
CREATE OR REPLACE FUNCTION "GP2".cambiar_inyector_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
  with iny as (
    select p.id, p.nombre
      from proveedor_insumo p
     where p.activo
       and exists (select 1 from ubicacion u where u.tipo = 'inyector' and u.ref_id = p.id)
  ), pz as (
    select c.id, c.codigo, c.descripcion, c.familia_pedido,
           nullif(btrim(coalesce(c.proveedor,'')),'') as prov
      from componente c
     where c.familia_pedido is not null
       and not c.discontinuado
       and coalesce(c.estado_compra,'compra') = 'compra'
  ), oc as (   -- O.C. abiertas con algo pendiente de piezas de la familia
    select c.familia_pedido, o.numero, o.proveedor,
           sum(greatest(coalesce(i.cantidad,0) - coalesce(i.recibido,0), 0)) as pendiente
      from orden_compra o
      join orden_compra_item i on i.oc_id = o.id
      join componente c on c.id = i.componente_id
     where o.estado in ('borrador','enviada')
       and c.familia_pedido is not null
     group by 1, 2, 3
    having sum(greatest(coalesce(i.cantidad,0) - coalesce(i.recibido,0), 0)) > 0
  )
  select jsonb_build_object(
    'iny', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'n', nombre) order by nombre), '[]'::jsonb) from iny),
    'fam', (select coalesce(jsonb_agg(jsonb_build_object(
              'n',     f.nombre,
              'min',   f.pedido_minimo_uni,
              'prov',  (select case when count(distinct pz.prov) = 1 and count(*) = count(pz.prov)
                                    then min(pz.prov) end
                          from pz where pz.familia_pedido = f.nombre),
              'partes',(select coalesce(jsonb_agg(jsonb_build_object('id', pz.id, 'cod', pz.codigo,
                                                                     'd', pz.descripcion, 'prov', pz.prov)
                                                  order by pz.codigo), '[]'::jsonb)
                          from pz where pz.familia_pedido = f.nombre),
              'oc',    (select coalesce(jsonb_agg(jsonb_build_object('numero', oc.numero, 'prov', oc.proveedor,
                                                                     'pend', oc.pendiente)
                                                  order by oc.numero), '[]'::jsonb)
                          from oc where oc.familia_pedido = f.nombre)
            ) order by f.nombre), '[]'::jsonb)
              from familia_pedido f
             where exists (select 1 from pz where pz.familia_pedido = f.nombre))
  );
$function$;

-- ---------- cambiar_inyector_familia ----------
CREATE OR REPLACE FUNCTION "GP2".cambiar_inyector_familia(p_familia text, p_proveedor text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare
  v_fam  text := nullif(btrim(coalesce(p_familia,'')),'');
  v_prov text := nullif(btrim(coalesce(p_proveedor,'')),'');
  v_antes jsonb; v_partes jsonb; v_n int;
begin
  perform "GP2"._exigir_autorizado();

  if v_fam is null or not exists (select 1 from familia_pedido where nombre = v_fam) then
    raise exception 'La familia "%" no existe.', coalesce(v_fam, '');
  end if;
  if v_prov is null then
    raise exception 'Elegí el inyector que se lleva la matriz de %.', v_fam;
  end if;
  if not exists (select 1 from proveedor_insumo p
                  where p.nombre = v_prov and p.activo
                    and exists (select 1 from ubicacion u where u.tipo = 'inyector' and u.ref_id = p.id)) then
    raise exception '"%" no es un inyector activo.', v_prov;
  end if;

  select coalesce(jsonb_agg(distinct nullif(btrim(coalesce(c.proveedor,'')),''))
                    filter (where nullif(btrim(coalesce(c.proveedor,'')),'') is not null), '[]'::jsonb)
    into v_antes
    from componente c
   where c.familia_pedido = v_fam and not c.discontinuado
     and coalesce(c.estado_compra,'compra') = 'compra';

  with u as (
    update componente c
       set proveedor = v_prov
     where c.familia_pedido = v_fam
       and not c.discontinuado
       and coalesce(c.estado_compra,'compra') = 'compra'
    returning c.codigo
  )
  select count(*), coalesce(jsonb_agg(codigo order by codigo), '[]'::jsonb) into v_n, v_partes from u;

  if v_n = 0 then
    raise exception 'La familia % no tiene piezas que se compren.', v_fam;
  end if;

  return jsonb_build_object('ok', true, 'familia', v_fam, 'antes', v_antes,
                            'proveedor', v_prov, 'n', v_n, 'partes', v_partes);
end $function$;

revoke all on function "GP2".cambiar_inyector_familia(text, text) from public, anon;
grant execute on function "GP2".cambiar_inyector_familia(text, text) to authenticated, service_role;
grant execute on function "GP2".cambiar_inyector_bundle() to anon, authenticated, service_role;
