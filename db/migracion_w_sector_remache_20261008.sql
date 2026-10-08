-- =====================================================================
-- LOS W (bujes, engranajes y arandelas) PASAN A SECTOR REMACHE — y por eso dejan de ir a Virgilio (2026-10-08)
-- =====================================================================
-- Pedido [usuario, 08/10, con captura del Stock General filtrado por «W» (Stock SC / Stock SP)]: «Todos estos componentes que
-- arrancan con W son Sector Remaches, cambialo y por lo tanto esos sectores no estarían en Virgilio.»
--
-- Antes: W1, W2, W3, W7, W9 en Sector Crudo (SC) y W1P, W2P, W3P, W4, W5, W6, W7P, W9P en Sector Procesado (SP). W8 (Vástago
--   Sacafuente Pizzero, comprado a Bella Vista) y W1B (Grampa Batidor, fabricación) YA estaban en Sector Remache: no se tocan.
-- Ahora: los 13 en Sector Remache (sector 8), con estado_compra = 'fabricacion', y su inventario de «Sector Crudo/Procesado»
--   (ubicaciones 1 y 2) en «Sector Remache» (ubicación 8). El inventario en talleristas / proveedores de servicio no se toca.
--
-- ⚠ POR QUÉ estado_compra = 'fabricacion': el Sector Remache es de INSUMOS (sector.es_insumo) y el motor de costos
--   (v_costo_componente) toma por COMPRADO a todo componente de un sector de insumos con estado_compra null. Los W se FABRICAN
--   (los crudos salen de una matriz; los «P» salen del niquelado / templado de un proveedor de servicio): sin 'fabricacion' el motor
--   los trataría como comprados sin precio y se perdería la cadena de costos. Es la misma trampa que los VxSE (db/migracion_remaches_se_*).
--   Con 'fabricacion' tampoco entran a Recepción de insumos ni a la OC (igual que los V).
--
-- Efecto sobre Virgilio: GP2.enviar_a_virgilio sólo acepta los sectores 1, 2, 5, 6 y 11 («solo SC, SP, fleje, plástico y caja»);
--   el 8 (Remache) no se manda a Virgilio. Estos W tenían 0 stock en los depósitos de Virgilio (ubicaciones 64 y 65), así que no hay
--   nada que migrar. En Stock General dejan los rubros «Stock SC» y «Stock SP».
--
-- Medido en el ensayo (revertido): 13 componentes y 13 filas de inventario movidos, 0 conflictos en la ubicación 8; costos 851
--   comparados, 0 distintos; 10 vistas (demanda, consumo, contraparte…) idénticas; máximos de inventario idénticos en el momento del cambio.
--   ⚠ CORREGIDO el 08/10: esta nota decía «también forzando el recálculo de máximos»; era FALSO. El recálculo (que corre con cualquier cambio
--   de ruta o con el sync diario de la Est Madre) pasa los 13 W de 'consumo_meses' (regla de Crudo/Procesado, tope de 5 cajones) a 'est_madre'
--   (regla de los sectores de insumos): W1 7.238 → 28.952, W6 14.476 → 57.904, etc. Aceptado por el dueño: ver db/migracion_w_se_matriz150_20261008.sql.
--   Aplicado con «Sí» del dueño dentro de un bloque de control que se aborta solo (y no guarda nada) si cambia un costo, un máximo o una vista.
--
-- ↩ Revertir (UPDATE, no cuelga en el conector):
--   begin;
--   update "GP2".componente set sector_id = 1, estado_compra = null where codigo in ('W1','W2','W3','W7','W9');
--   update "GP2".componente set sector_id = 2, estado_compra = null where codigo in ('W1P','W2P','W3P','W4','W5','W6','W7P','W9P');
--   update "GP2".inventario i set ubicacion_id = 1 from "GP2".componente c
--    where c.id = i.componente_id and c.codigo in ('W1','W2','W3','W7','W9') and i.ubicacion_id = 8;
--   update "GP2".inventario i set ubicacion_id = 2 from "GP2".componente c
--    where c.id = i.componente_id and c.codigo in ('W1P','W2P','W3P','W4','W5','W6','W7P','W9P') and i.ubicacion_id = 8;
--   commit;

do $$
declare
  ids bigint[]; n_comp int; n_inv int; costos_n int; costos_dist int; nmax int; rep text := ''; diffs int := 0;
  vistas text[] := array['v_consumo_demanda','v_oc_virgilio_demanda','v_hace_articulo','v_contraparte_parte','v_consumo_tallerista','v_componente_muerto','v_stock_mp_ps','v_consumo_fleje_kg_articulo','v_oc_virgilio_partes_tallerista','v_reparto_efectivo'];
  v text; i int := 0; n1 bigint; n2 bigint;
begin
  select array_agg(id) into ids from "GP2".componente where codigo in ('W1','W2','W3','W7','W9','W1P','W2P','W3P','W4','W5','W6','W7P','W9P');
  if cardinality(ids) <> 13 then raise exception 'se esperaban 13 componentes y fueron %', cardinality(ids); end if;
  if exists (select 1 from "GP2".componente where id = any(ids) and sector_id = 8) then raise exception 'alguno ya esta en Sector Remache: no se vuelve a aplicar'; end if;
  if exists (select 1 from "GP2".inventario where componente_id = any(ids) and ubicacion_id = 8) then raise exception 'ya hay inventario en la ubicacion 8 para estos componentes'; end if;
  create temp table _c0 on commit drop as select comp_id, total_pesos, faltan_precios, segundos_matriz from "GP2".v_costo_componente;
  foreach v in array vistas loop i := i + 1; execute format('create temp table _b%s on commit drop as select x::text as t from "GP2".%I x', i, v); end loop;
  create temp table _bmax on commit drop as select componente_id, ubicacion_id, maximo::text mx, maximo_origen mo from "GP2".inventario;

  update "GP2".componente set sector_id = 8, estado_compra = 'fabricacion' where id = any(ids);
  get diagnostics n_comp = row_count;
  update "GP2".inventario set ubicacion_id = 8 where componente_id = any(ids) and ubicacion_id in (1, 2);
  get diagnostics n_inv = row_count;

  create temp table _c1 on commit drop as select comp_id, total_pesos, faltan_precios, segundos_matriz from "GP2".v_costo_componente;
  select count(*), count(*) filter (where b.total_pesos is distinct from a.total_pesos or b.faltan_precios is distinct from a.faltan_precios or b.segundos_matriz is distinct from a.segundos_matriz)
    into costos_n, costos_dist from _c0 a join _c1 b using (comp_id);
  i := 0;
  foreach v in array vistas loop
    i := i + 1;
    execute format('select count(*) from (select x::text t from "GP2".%I x except select t from _b%s) a', v, i) into n1;
    execute format('select count(*) from (select t from _b%s except select x::text from "GP2".%I x) a', i, v) into n2;
    if n1 + n2 > 0 then diffs := diffs + 1; end if;
    rep := rep || format(E'\n  %s: +%s / -%s', v, n1, n2);
  end loop;
  select count(*) into nmax from "GP2".inventario i2 join _bmax b on b.componente_id = i2.componente_id and b.ubicacion_id = i2.ubicacion_id where b.mx is distinct from i2.maximo::text or b.mo is distinct from i2.maximo_origen;
  if n_comp <> 13 or n_inv <> 13 or costos_dist > 0 or diffs > 0 or nmax > 0 then
    raise exception E'ABORTADO, nada se guardó — comp=% inv=% costos comparados=% distintos=% vistas distintas=% maximos distintos=% %', n_comp, n_inv, costos_n, costos_dist, diffs, nmax, rep;
  end if;
end $$;

-- ── Verificación (resultado del 2026-10-08): los 15 W en «Sector Remache»; los 13 movidos con estado_compra 'fabricacion' (W8 sigue null,
--    comprado; W1B ya era fabricacion) y su inventario en la ubicación 8, sin restos en las ubicaciones 1 y 2.
select c.codigo, c.descripcion, s.nombre sector, c.estado_compra,
       (select string_agg(i.ubicacion_id::text, ',' order by i.ubicacion_id) from "GP2".inventario i where i.componente_id = c.id) ubicaciones
  from "GP2".componente c join "GP2".sector s on s.id = c.sector_id
 where c.codigo ~ '^W' order by (c.codigo ~ '^W[0-9]+$') desc, length(c.codigo), c.codigo;
