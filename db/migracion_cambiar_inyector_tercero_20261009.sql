-- Cambiar Inyector: las familias con MATRIZ DE TERCERO no se cambian (2026-10-09) [Thomas: «Hay tres matrices que son
-- de terceros que no tendrían que aparecer en este módulo porque no se pueden cambiar (las matrices no son nuestras)»
-- — «La de base afila, cierra bolsa y cuchillo untar molde 3ero»]. Siguen en la O.C. con su mínimo por familia; sólo
-- salen de Cambiar Inyector y la base rechaza cambiarles el inyector.

alter table "GP2".familia_pedido add column if not exists matriz_tercero boolean not null default false;
comment on column "GP2".familia_pedido.matriz_tercero is 'La matriz es del inyector (un tercero), no nuestra: no se puede llevar a otro inyector. Sale de Cambiar Inyector y cambiar_inyector_familia la rechaza. Thomas 2026-10-09: Base Afila, Cierra Bolsa, Cuchillo Untar Blanco.';

update "GP2".familia_pedido set matriz_tercero = true
 where nombre in ('Base Afila', 'Cierra Bolsa', 'Cuchillo Untar Molde 3ros');

-- [Thomas, 09/10: «la familia de cuchillo untar molde 3ero renombra a Cuchillo Untar Blanco»]. componente.familia_pedido
-- sigue sola (FK on update cascade); ninguna función ni vista nombra la familia por texto.
update "GP2".familia_pedido set nombre = 'Cuchillo Untar Blanco',
  nota = nota || ' Renombrada 2026-10-09 (antes "Cuchillo Untar Molde 3ros") [Thomas].'
 where nombre = 'Cuchillo Untar Molde 3ros';

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
  ), oc as (
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
             where not f.matriz_tercero
               and exists (select 1 from pz where pz.familia_pedido = f.nombre))
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
  if exists (select 1 from familia_pedido where nombre = v_fam and matriz_tercero) then
    raise exception 'La matriz de % es de un tercero: no se cambia de inyector.', v_fam;
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

