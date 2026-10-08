-- =====================================================================
-- LOS W CON «SE»: lo que vuelve de Guazzaroni / Pedernera o sale del corte pasa por la matriz 150 y se transforma en el W final (2026-10-08)
-- =====================================================================
-- Pedido [usuario, 08/10, textual]: «Para: W1P W2P W3P W7P W9P — Cuando se recepcionan de Guazzaroni o Pedernera se recepcionan como W1PSE,
-- W2PSE, etc. Después pasan por la matriz 150 que se ponen en bolsas de 2kg y se van al sector W1P, W2P, etc. W4, W5 y W6. Después de cortarse
-- van a W4SE, W5SE y W6SE. Luego pasan por la matriz de envasado 150 y se transforman en W4, W5 y W6. Cambiá esas rutas y agregalo en la
-- tablet de operarios la opción de que expulse estos componentes la matriz 150.» — y, a mis 3 decisiones: «Sí a todo».
-- Es el mismo patrón que los remaches (db/migracion_remaches_se_matriz150_20261007.sql).
--
--  1) 8 componentes SE en Sector Remache: W1PSE, W2PSE, W3PSE, W7PSE, W9PSE (los «P») y W4SE, W5SE, W6SE (los de corte). Descripción del W + ' s/envasar',
--     mismo kg_x_uni, cajón de 25 kg (SUPUESTO mío, aceptado con «Sí a todo»: igual que los VxSE), proveedor heredado y estado_compra 'fabricacion'
--     (obligatorio: el Sector Remache es de insumos; sin eso el motor de costos los toma por comprados). 8 inventarios en 0 en la ubicación 8.
--  2) Rutas (23, una por producción): los 15 pasos 'proveedor_servicio' (Guazzaroni: W1→W1P, W3→W3P, W9→W9P; Pedernera: W2→W2P, W7→W7P) entregan
--     el SE, y los 8 pasos de corte (matriz 344 → W4, 21 → W5, 16 → W6) entregan el SE; justo después se agrega un paso de la matriz 150
--     (SE → W final, cantidad 1) y los pasos siguientes (tallerista, virgilio) corren un lugar. Los pasos de tallerista que consumen el W final no cambian.
--  3) 5 precios de servicio (GP2.precio_servicio_pieza) pasan del W?P al W?PSE: cuelgan de la pieza que entrega el servicio (si no, el niquelado/cromado costaría $0).
--  4) Etiquetas del selector (GP2.matriz_salida_etiqueta): la que ya tenía W5 en la matriz 21 («Arandela») pasa a W5SE (lo que expulsa ahora el corte), y la 150 suma 8
--     opciones (orden 14..21), con la descripción del W como etiqueta (SUPUESTO mío, aceptado): Buje Abrelata Manija · Engranaje Gde Crom · Arandela Fina Manija ·
--     Arandela Base Inox · Arandela Cuch Unt · Arandela Inox p/Mgo Rojo · Engranaje Chico Crom · Arandela Fina Marip Niq. El selector de la tablet pasa de 13 a 21 opciones
--     sin tocar código (las dos tablets leen matriz_salidas + etiqueta del bundle).
--  5) El stock lo mueve GP2.fabricar_stock con la conversión de bolsas de db/migracion_remaches_se_matriz150_20261007.sql: todos estos W ya son bolsa de 2,00 kg
--     (uni_x_cajon). Ensayo: 3 bolsas de W1P = 5.001 unidades W1PSE → W1P; 2 de W4 = 5.970 W4SE → W4.
--
-- MÁXIMOS — ⚠ efecto del cambio ANTERIOR (los W a Sector Remache, db/migracion_w_sector_remache_20261008.sql), que salió a la luz acá:
--   el recálculo de máximos (corre con cualquier cambio de ruta o con el sync diario de la Est Madre) pasa los 13 W de 'consumo_meses' (regla de Crudo/Procesado, tope de
--   5 cajones) a 'est_madre' (regla de los sectores de insumos, sin tope): W1 7.238 → 28.952 · W2 3.470 → 28.952 · W3 7.238 → 28.952 · W4 7.238 → 28.952 · W5 2.116 → 8.464 ·
--   W6 14.476 → 57.904 · W7 4.770 → 35.960 · W9 8.990 → 35.960 · W1P 7.238 → 28.952 · W2P 3.450 → 28.952 · W3P 7.238 → 28.952 · W7P 8.990 → 35.960 · W9P 8.990 → 35.960.
--   (10 de 13 se cuadruplican; W2, W2P y W7 suben unas 8 veces.) Aceptado por el dueño («Sí a todo» a mi recomendación: «aceptar la regla del Sector Remache»). La guarda de
--   abajo permite ESE cambio en esos 13 y aborta ante cualquier otro. Alternativa descartada: congelarlos como 'fisico' con los valores de hoy.
--
-- Medido en el ensayo (revertido) y en la aplicación: costos 851 comparados, 0 distintos; vistas: sólo cambian a propósito v_consumo_demanda (+23 filas),
--   v_oc_virgilio_demanda (+11) y v_contraparte_parte (5 piezas de proveedores de Vx a VxSE); 7 vistas idénticas; 0 órdenes repetidos / huecos / pasos sin actor.
--
-- PENDIENTE: los 8 SE nacen en 0 y quedan en NEGATIVO hasta que Guazzaroni / Pedernera entreguen como SE en Control Entrega PS y el corte se registre como SE;
--   el historial anterior sigue colgado del W final; la mano de obra de la 150 sigue sin costear (cuenta_mo = false).
--
-- ↩ REVERTIR (los DELETE los cuelga el conector de la sesión: correrlos en el SQL Editor):
--   begin;
--   -- precios y etiqueta de vuelta
--   update "GP2".precio_servicio_pieza pz set componente_id = w.id from "GP2".componente s join "GP2".componente w on w.codigo = left(s.codigo, length(s.codigo) - 2)
--    where pz.componente_id = s.id and s.codigo in ('W1PSE','W2PSE','W3PSE','W7PSE','W9PSE');
--   update "GP2".matriz_salida_etiqueta e set componente_id = (select id from "GP2".componente where codigo = 'W5')
--    where e.matriz_id = (select id from "GP2".matriz where n_matriz = '21') and e.componente_id = (select id from "GP2".componente where codigo = 'W5SE');
--   delete from "GP2".matriz_salida_etiqueta where matriz_id = (select id from "GP2".matriz where n_matriz = '150')
--      and componente_id in (select id from "GP2".componente where codigo in ('W1P','W2P','W3P','W4','W5','W6','W7P','W9P'));
--   -- pasos: guardar dónde estaban los de la 150, borrarlos, volver las salidas al W y cerrar los huecos
--   create temp table _d on commit drop as select ruta_id, orden k from "GP2".ruta_paso
--    where matriz_id = (select id from "GP2".matriz where n_matriz = '150') and comp_entrada_id in (select id from "GP2".componente where codigo ~ '^W[0-9]P?SE$');
--   delete from "GP2".ruta_paso where matriz_id = (select id from "GP2".matriz where n_matriz = '150') and comp_entrada_id in (select id from "GP2".componente where codigo ~ '^W[0-9]P?SE$');
--   update "GP2".ruta_paso rp set orden = rp.orden - 1 from _d d where rp.ruta_id = d.ruta_id and rp.orden > d.k;
--   update "GP2".ruta_paso rp set comp_salida_id = w.id from "GP2".componente s join "GP2".componente w on w.codigo = left(s.codigo, length(s.codigo) - 2)
--    where rp.comp_salida_id = s.id and s.codigo ~ '^W[0-9]P?SE$';
--   -- los SE (sólo si no tienen movimientos)
--   delete from "GP2".inventario where componente_id in (select id from "GP2".componente where codigo ~ '^W[0-9]P?SE$');
--   delete from "GP2".componente where codigo ~ '^W[0-9]P?SE$';
--   commit;

do $outer$
declare
  v_m bigint; v_ub bigint; n_se int; n_inv int; n_tgt int; n_sal int; n_150 int; n_pz int; n_et_mov int; n_et_new int; n_shift int;
  vistas_igual text[] := array['v_hace_articulo','v_consumo_tallerista','v_componente_muerto','v_stock_mp_ps','v_consumo_fleje_kg_articulo','v_oc_virgilio_partes_tallerista','v_reparto_efectivo'];
  vistas_cambian text[] := array['v_consumo_demanda','v_oc_virgilio_demanda','v_contraparte_parte'];
  v text; i int := 0; n1 bigint; n2 bigint; rep text := ''; costos_n int; costos_dist int; nmax_inesp int; nmax_esp int; u int; w int; huecos int; diffs_inesp int := 0;
  w13 bigint[];
begin
  select id into v_m from "GP2".matriz where n_matriz = '150';
  select id into v_ub from "GP2".ubicacion where tipo = 'sector' and ref_id = 8;
  if v_m is null or v_ub is null then raise exception 'falta la matriz 150 o la ubicacion del Sector Remache'; end if;
  if exists (select 1 from "GP2".componente where codigo in ('W1PSE','W2PSE','W3PSE','W7PSE','W9PSE','W4SE','W5SE','W6SE')) then raise exception 'ya existen los SE de los W: no se vuelve a aplicar'; end if;
  select array_agg(id) into w13 from "GP2".componente where codigo in ('W1','W2','W3','W7','W9','W1P','W2P','W3P','W4','W5','W6','W7P','W9P');
  if cardinality(w13) <> 13 then raise exception 'se esperaban 13 W y fueron %', cardinality(w13); end if;
  create temp table _c0 on commit drop as select comp_id, total_pesos, faltan_precios, segundos_matriz from "GP2".v_costo_componente;
  foreach v in array (vistas_igual || vistas_cambian) loop i := i + 1; execute format('create temp table _b%s on commit drop as select x::text as t from "GP2".%I x', i, v); end loop;
  create temp table _bmax on commit drop as select componente_id, ubicacion_id, maximo::text mx, maximo_origen mo from "GP2".inventario;

  insert into "GP2".componente (codigo, descripcion, sector_id, unidad_medida, kg_x_uni, uni_x_cajon, proveedor, estado_compra)
    select c.codigo || 'SE', c.descripcion || ' s/envasar', 8, c.unidad_medida, c.kg_x_uni, round(25 / c.kg_x_uni, 4), c.proveedor, 'fabricacion'
      from "GP2".componente c where c.codigo in ('W1P','W2P','W3P','W7P','W9P','W4','W5','W6');
  get diagnostics n_se = row_count;
  insert into "GP2".inventario (componente_id, ubicacion_id, cantidad) select id, v_ub, 0 from "GP2".componente where codigo in ('W1PSE','W2PSE','W3PSE','W7PSE','W9PSE','W4SE','W5SE','W6SE');
  get diagnostics n_inv = row_count;
  create temp table _map on commit drop as select w.id w_id, s.id se_id, w.codigo cod from "GP2".componente w join "GP2".componente s on s.codigo = w.codigo || 'SE' where w.codigo in ('W1P','W2P','W3P','W7P','W9P','W4','W5','W6');

  create temp table _tgt on commit drop as
    select rp.id paso_id, rp.ruta_id, rp.orden k, m.w_id, m.se_id
      from "GP2".ruta_paso rp join _map m on m.w_id = rp.comp_salida_id
     where (rp.tipo_paso = 'proveedor_servicio' and m.cod in ('W1P','W2P','W3P','W7P','W9P'))
        or (rp.tipo_paso = 'matriz' and m.cod in ('W4','W5','W6'));
  select count(*) into n_tgt from _tgt;
  if n_tgt <> 23 or (select count(distinct ruta_id) from _tgt) <> 23 then raise exception 'objetivos inesperados: % pasos en % rutas', n_tgt, (select count(distinct ruta_id) from _tgt); end if;
  update "GP2".ruta_paso rp set orden = rp.orden + 1 from _tgt t where rp.ruta_id = t.ruta_id and rp.orden > t.k;
  get diagnostics n_shift = row_count;
  update "GP2".ruta_paso rp set comp_salida_id = t.se_id from _tgt t where rp.id = t.paso_id;
  get diagnostics n_sal = row_count;
  insert into "GP2".ruta_paso (ruta_id, orden, tipo_paso, matriz_id, comp_entrada_id, comp_salida_id, cantidad)
    select t.ruta_id, t.k + 1, 'matriz', v_m, t.se_id, t.w_id, 1 from _tgt t;
  get diagnostics n_150 = row_count;

  update "GP2".precio_servicio_pieza pz set componente_id = m.se_id from _map m where pz.componente_id = m.w_id and m.cod in ('W1P','W2P','W3P','W7P','W9P');
  get diagnostics n_pz = row_count;
  update "GP2".matriz_salida_etiqueta e set componente_id = m.se_id from _map m, "GP2".matriz mt
   where mt.n_matriz = '21' and e.matriz_id = mt.id and e.componente_id = m.w_id and m.cod = 'W5';
  get diagnostics n_et_mov = row_count;
  insert into "GP2".matriz_salida_etiqueta (matriz_id, componente_id, etiqueta, orden)
    select v_m, c.id, x.etiqueta, x.orden
      from (values ('W1P','Buje Abrelata Manija',14),('W2P','Engranaje Gde Crom',15),('W3P','Arandela Fina Manija',16),('W4','Arandela Base Inox',17),
                   ('W5','Arandela Cuch Unt',18),('W6','Arandela Inox p/Mgo Rojo',19),('W7P','Engranaje Chico Crom',20),('W9P','Arandela Fina Marip Niq.',21)) x(codigo, etiqueta, orden)
      join "GP2".componente c on c.codigo = x.codigo;
  get diagnostics n_et_new = row_count;
  set constraints all immediate;

  create temp table _c1 on commit drop as select comp_id, total_pesos, faltan_precios, segundos_matriz from "GP2".v_costo_componente;
  select count(*), count(*) filter (where b.total_pesos is distinct from a.total_pesos or b.faltan_precios is distinct from a.faltan_precios or b.segundos_matriz is distinct from a.segundos_matriz)
    into costos_n, costos_dist from _c0 a join _c1 b using (comp_id);
  i := 0;
  foreach v in array (vistas_igual || vistas_cambian) loop
    i := i + 1;
    execute format('select count(*) from (select x::text t from "GP2".%I x except select t from _b%s) a', v, i) into n1;
    execute format('select count(*) from (select t from _b%s except select x::text from "GP2".%I x) a', i, v) into n2;
    if (n1 + n2 > 0) and v = any(vistas_igual) then diffs_inesp := diffs_inesp + 1; end if;
    rep := rep || format(E'\n  %s: +%s / -%s', v, n1, n2);
  end loop;
  select count(*) filter (where i2.componente_id = any(w13) and i2.ubicacion_id = v_ub), count(*) filter (where not (i2.componente_id = any(w13) and i2.ubicacion_id = v_ub))
    into nmax_esp, nmax_inesp
    from "GP2".inventario i2 join _bmax b on b.componente_id = i2.componente_id and b.ubicacion_id = i2.ubicacion_id
   where b.mx is distinct from i2.maximo::text or b.mo is distinct from i2.maximo_origen;
  select count(*) into u from (select ruta_id, orden from "GP2".ruta_paso group by 1, 2 having count(*) > 1) d;
  select count(*) into w from "GP2".ruta_paso rp where rp.tipo_paso in ('matriz','proveedor_servicio','tallerista') and coalesce(rp.matriz_id, rp.proveedor_id, rp.tallerista_id) is null;
  select count(*) into huecos from (select ruta_id from "GP2".ruta_paso group by 1 having max(orden) - min(orden) + 1 <> count(*)) h;
  rep := format(E'SE=%s inv=%s objetivos=%s desplazados=%s salidas=%s pasos150=%s precios=%s etiq movidas=%s nuevas=%s | costos comparados=%s distintos=%s | maximos esperados(W)=%s inesperados=%s | orden_rep=%s sin_actor=%s huecos=%s vistas_inesperadas=%s', n_se, n_inv, n_tgt, n_shift, n_sal, n_150, n_pz, n_et_mov, n_et_new, costos_n, costos_dist, nmax_esp, nmax_inesp, u, w, huecos, diffs_inesp) || rep;
  if n_se <> 8 or n_inv <> 8 or n_tgt <> 23 or n_sal <> 23 or n_150 <> 23 or n_pz <> 5 or n_et_new <> 8 or n_et_mov <> 1
     or costos_dist > 0 or nmax_inesp > 0 or nmax_esp > 13 or u > 0 or w > 0 or huecos > 0 or diffs_inesp > 0 then
    raise exception E'ABORTADO, nada se guardó — %', rep;
  end if;
end $outer$;

-- ── Verificación (resultado del 2026-10-08): 8 SE de 25,00 kg (fabricacion) · 78 pasos de la 150 en 78 rutas (55 de los remaches + 23 de los W) con 21 salidas distintas ·
--    21 etiquetas de la 150 (orden 1..21) · 15 pasos de servicio entregan «…PSE» y los cortes 344/21/16 entregan W4SE/W5SE/W6SE · la etiqueta de W5 en la matriz 21 es la de
--    W5SE · 5 precios de servicio en los «…PSE» · 13 máximos de W en 'est_madre' (los valores nuevos) · 0 órdenes repetidos. Ruta de ejemplo (W1P): 1 ingreso IC9 | 2 matriz
--    IC9>W1 M21 | 3 proveedor_servicio W1>W1 | 4 proveedor_servicio W1>W1PSE | 5 matriz W1PSE>W1P M150 | 6 tallerista W1P>501 | 7 virgilio.
select c.codigo, c.descripcion, round(c.kg_x_uni * c.uni_x_cajon, 2) kg_cajon, c.estado_compra, i.cantidad
  from "GP2".componente c join "GP2".inventario i on i.componente_id = c.id
 where c.codigo ~ '^W[0-9]P?SE$' order by c.codigo;

-- ═════════════════════════════════════════════════════════════════════════════════════════════
-- ADENDA 2026-10-08 — las 8 etiquetas de los W en la matriz 150 pasan a nombres cortos
-- ═════════════════════════════════════════════════════════════════════════════════════════════
-- [usuario, 08/10, textual] «Quiero estas descripciones en las etiquetas de la matriz 150: Buje Abrelata / Engranaje Grande / Arandela Fina Manija / Arandela Base /
-- Arandela Cuchillito Untar / Arandela p/Mango / Engranaje Chico / Arandela Fina Mariposa» — y «Sí» al UPDATE con el mapeo W1P, W2P, W3P, W4, W5, W6, W7P, W9P (en ese orden).
-- Reemplaza el SUPUESTO de la nota 4) de arriba (la descripción del W como etiqueta). Sólo texto: orden 14..21, rutas, pasos y stock quedan igual.
-- Aplicado con un bloque que se aborta solo si no toca exactamente 8 filas. Verificación posterior: 21 etiquetas de la 150 (orden 1..21), las 8 nuevas con el texto de abajo.
--
-- ↩ Revertir (UPDATE, no cuelga en el conector): volver a los textos de la nota 4):
--   update "GP2".matriz_salida_etiqueta e set etiqueta = v.etiqueta
--     from (values ('W1P','Buje Abrelata Manija'),('W2P','Engranaje Gde Crom'),('W3P','Arandela Fina Manija'),('W4','Arandela Base Inox'),
--                  ('W5','Arandela Cuch Unt'),('W6','Arandela Inox p/Mgo Rojo'),('W7P','Engranaje Chico Crom'),('W9P','Arandela Fina Marip Niq.')) v(codigo, etiqueta)
--     join "GP2".componente c on c.codigo = v.codigo join "GP2".matriz m on m.n_matriz = '150'
--    where e.matriz_id = m.id and e.componente_id = c.id;

do $$
declare n int;
begin
  update "GP2".matriz_salida_etiqueta e set etiqueta = v.etiqueta
    from (values ('W1P','Buje Abrelata'),('W2P','Engranaje Grande'),('W3P','Arandela Fina Manija'),('W4','Arandela Base'),
                 ('W5','Arandela Cuchillito Untar'),('W6','Arandela p/Mango'),('W7P','Engranaje Chico'),('W9P','Arandela Fina Mariposa')) v(codigo, etiqueta)
    join "GP2".componente c on c.codigo = v.codigo
    join "GP2".matriz m on m.n_matriz = '150'
   where e.matriz_id = m.id and e.componente_id = c.id;
  get diagnostics n = row_count;
  if n <> 8 then raise exception 'se esperaban 8 filas y fueron %', n; end if;
end $$;

select e.orden, c.codigo, e.etiqueta
  from "GP2".matriz_salida_etiqueta e join "GP2".matriz m on m.id = e.matriz_id join "GP2".componente c on c.id = e.componente_id
 where m.n_matriz = '150' and e.orden >= 14 order by e.orden;
