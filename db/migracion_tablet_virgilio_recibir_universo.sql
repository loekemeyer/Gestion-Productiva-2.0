-- Thomas, 2026-10-01: "en recibir Virgilio no aparecen ni las cajas, ni los flejes, ni los
-- plasticos, ni sc, ni sp". Causa: la rama "virgilio" de la CTE `rec` de tablet_bundle() solo
-- listaba un componente si YA tenia stock != 0 en virgilio_sector (having sum(i.cantidad)<>0).
-- Como nunca se mando nada todavia, la lista salia vacia salvo los importados (que tienen su
-- propia rama, sin esa condicion). Se cambia a listar TODO el universo de SC/SP/Fleje/Plastico/
-- Caja (mismos sector_id que la rama "virgilio" de la CTE `env`, que ya es incondicional), con
-- `esperado` = stock actual en Virgilio (0 si todavia no se mando nada).
--
-- Se agrega ademas `grupo` a rec_x/'recibir' (SC/SP/Insumos), espejo exacto de env_x, para que
-- el front pueda agrupar por rubro en Recibir igual que ya hace en Enviar.
--
-- Idempotente: si el texto esperado no esta en la definicion viva, no se aplica nada.
do $patch$
declare
  v_def  text := pg_get_functiondef('"GP2".tablet_bundle()'::regprocedure);
  v_old1 text := $old1$union all
  select 'virgilio', 'virgilio', i.componente_id, null::bigint, 0, false, null::text,
         sum(i.cantidad), 'online_virgilio'
    from inventario i
    join ubicacion u on u.id = i.ubicacion_id and u.tipo in ('virgilio','virgilio_sector')
    join componente c on c.id = i.componente_id
   where c.sector_id <> 12 and not coalesce(c.discontinuado,false)
   group by i.componente_id
  having sum(i.cantidad) <> 0
  union all
  select 'virgilio', 'virgilio', c.id, null::bigint, 0, false, null::text, null::numeric, null::text
    from componente c
   where c.estado_compra = 'importado' and not coalesce(c.discontinuado,false)
),$old1$;
  v_new1 text := $new1$union all
  select 'virgilio', 'virgilio', c.id, null::bigint, 0, false, null::text,
         coalesce((select sum(i.cantidad) from inventario i
                    join ubicacion u on u.id = i.ubicacion_id
                   where i.componente_id = c.id and u.tipo in ('virgilio','virgilio_sector')), 0),
         'online_virgilio'
    from componente c
   where c.sector_id in (1, 2, 5, 6, 11) and not coalesce(c.discontinuado, false)
     and coalesce(c.estado_compra, '') <> 'importado'
  union all
  select 'virgilio', 'virgilio', c.id, null::bigint, 0, false, null::text, null::numeric, null::text
    from componente c
   where c.estado_compra = 'importado' and not coalesce(c.discontinuado,false)
),$new1$;
  v_old2 text := $old2$         (select a.articulos_por_caja from articulo a where a.codigo = r.cod_art) por_caja,
         (c.estado_compra = 'importado') importado, c.sector_id sec_id, c.proveedor prov$old2$;
  v_new2 text := $new2$         (select a.articulos_por_caja from articulo a where a.codigo = r.cod_art) por_caja,
         (c.estado_compra = 'importado') importado, c.sector_id sec_id, c.proveedor prov,
         case when r.tipo = 'virgilio' then case c.sector_id when 1 then 'SC' when 2 then 'SP' else 'Insumos' end end grupo$new2$;
  v_old3 text := $old3$             'importado', coalesce(importado, false), 'sector_id', sec_id, 'proveedor', prov$old3$;
  v_new3 text := $new3$             'importado', coalesce(importado, false), 'sector_id', sec_id, 'proveedor', prov,
             'grupo', grupo$new3$;
begin
  if position(v_old1 in v_def) = 0 then
    raise exception 'tablet_bundle: no matchea el bloque 1 (rec virgilio) — definicion cambio, traer la viva de nuevo';
  end if;
  if position(v_old2 in v_def) = 0 then
    raise exception 'tablet_bundle: no matchea el bloque 2 (rec_x select list) — definicion cambio, traer la viva de nuevo';
  end if;
  if position(v_old3 in v_def) = 0 then
    raise exception 'tablet_bundle: no matchea el bloque 3 (jsonb recibir) — definicion cambio, traer la viva de nuevo';
  end if;
  v_def := replace(v_def, v_old1, v_new1);
  v_def := replace(v_def, v_old2, v_new2);
  v_def := replace(v_def, v_old3, v_new3);
  execute v_def;
end $patch$;
