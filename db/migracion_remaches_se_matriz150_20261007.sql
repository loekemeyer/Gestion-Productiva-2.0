-- =====================================================================
-- MATRIZ 150: TOMA VxSE (en tránsito, cajón de 25 kg) Y EXPULSA Vx (bolsa de 2/10 kg) — 2026-10-07
-- =====================================================================
-- Pedido [usuario, 07/10, textual]: «Te cambio la lógica: que chupe un componente la matriz 150 y expulse el mismo componente.
-- Después de Guazzaroni vuelve el componente como sector tránsito: V1SE, V2SE, etc. En la matriz 150 agarra estos componentes
-- con el agregado SE y ahí sí expulsa VX. Los terminados en SE están en cajones de 25 kg, los VX fraccionados en bolsas por la
-- matriz (como te pasé).» Dónde viven: «En sector remache»; descripción «Remache Espiral s/envasar» (= la del Vx + « s/envasar»).
-- Reemplaza la parte C de db/migracion_remaches_cajon_bolsa_matriz150_20261007.sql (la 150 con entrada = salida, V → V).
--
-- Aplicado el 2026-10-07 con «Sí» del dueño, en UNA transacción (un solo bloque: si cambia un costo o un máximo, se aborta
-- sola y no guarda nada). Antes se ensayó entero y se revirtió, incluida una prueba funcional con bolsas reales.
--
--  1) GP2.matriz_carga_en_chk admite 'bolsas' (db/tablas_GP2.sql).
--  2) 12 componentes VxSE (V1..V9, V11..V13) en Sector Remache: descripción del Vx + ' s/envasar', mismo kg_x_uni,
--     uni_x_cajon = 25 / kg_x_uni (cajón de 25 kg), proveedor y estado_compra ('fabricacion') heredados. 12 filas de
--     inventario en 0 en el Sector Remache (ubicación 8). ⚠ SIN estado_compra='fabricacion' el motor de costos los toma por
--     COMPRADOS (el sector Remache es de insumos) y pierde el crudo y el niquelado (V1 quedaba en $110 solo): medido.
--     V10 no se niquela (se compra ya como V): no tiene SE y su paso de la 150 sigue siendo V10 → V10.
--  3) Rutas: los 53 pasos 'proveedor_servicio' CV → Vx pasan a CV → VxSE (Guazzaroni entrega VxSE) y los 53 pasos de la 150
--     toman VxSE y expulsan Vx. El precio del niquelado (GP2.precio_servicio_pieza, proveedor 4) cuelga de la PIEZA QUE ENTREGA
--     el servicio: se movieron las 12 filas de Vx a VxSE (si no, el niquelado costaría $0 y faltarían precios).
--  4) La 150: carga_en='bolsas' y cuenta_mo=false. Con cuenta_mo=true el motor cobraría sus 55 s POR REMACHE: +$110,00 a
--     54 componentes (V9 5,93 → 115,93; total +$5.940), medido. Apagarla deja los costos idénticos (839 comparados, 0 distintos)
--     y la mano de obra de la 150 SIN costear: decisión del dueño pendiente (hay que convertir segundos por bolsa a por remache).
--  5) GP2.fabricar_stock (compartida con la tablet de GP2 y con Registro Producción 3.0 vía reg_prod_3_0_gp2_fabricar_stock):
--     si la matriz carga en bolsas, p_uni = round(bolsas × componente.entrega_uni_x de la pieza; si no, uni_x_cajon). El resto
--     de la función no cambia (db/funciones_GP2.sql, md5 del cuerpo = la base). El premio sigue por bolsa (procesado.uni =
--     bolsas); sólo el stock se mueve en remaches.
--
-- Medido en el ensayo (revertido): 6 bolsas de V9 (10 kg) → V9SE −105.820 y V9 +105.820 (= 60 kg); 3 bolsas de V1 (2 kg) →
--   ±17.142; 2 bolsas de V10 → V10 → V10 10.000 (neto 0, queda el ruido en el historial). Vistas: v_consumo_demanda +52 filas y
--   v_oc_virgilio_demanda +32 (aparecen los VxSE), v_contraparte_parte 12 piezas de Guazzaroni de Vx a VxSE; las otras 7 revisadas
--   sin cambios. Máximos de inventario de lo que ya existía: 0 distintos.
--
-- PENDIENTE / A SABER:
--   * Los VxSE nacen en 0: quedan en NEGATIVO hasta que Guazzaroni entregue como VxSE en Control Entrega PS (no hay stock en
--     tránsito en Guazzaroni: los CV de su ubicación están en 0, nada que migrar).
--   * El historial de V9/V1/… anterior (movimientos, entregas) sigue colgado de Vx, no de VxSE.
--   * Mano de obra de la 150 sin costear (punto 4).
--
-- ↩ REVERTIR (en este orden; los DELETE los cuelga el conector de la sesión: correrlos en el SQL Editor):
--   begin;
--   update "GP2".precio_servicio_pieza pz set componente_id = v.id
--     from "GP2".componente s join "GP2".componente v on v.codigo = left(s.codigo, length(s.codigo) - 2)
--    where pz.componente_id = s.id and s.codigo ~ '^V[0-9]+SE$';
--   update "GP2".ruta_paso rp set comp_entrada_id = v.id
--     from "GP2".componente s join "GP2".componente v on v.codigo = left(s.codigo, length(s.codigo) - 2)
--    where rp.comp_entrada_id = s.id and s.codigo ~ '^V[0-9]+SE$' and rp.matriz_id = (select id from "GP2".matriz where n_matriz = '150');
--   update "GP2".ruta_paso rp set comp_salida_id = v.id
--     from "GP2".componente s join "GP2".componente v on v.codigo = left(s.codigo, length(s.codigo) - 2)
--    where rp.comp_salida_id = s.id and s.codigo ~ '^V[0-9]+SE$' and rp.tipo_paso = 'proveedor_servicio';
--   update "GP2".matriz set carga_en = 'unidades', cuenta_mo = true where n_matriz = '150';
--   -- fabricar_stock: volver al bloque de db/funciones_GP2.sql del commit 6ec5aca (sin v_carga / v_xb).
--   -- check: alter table "GP2".matriz drop constraint matriz_carga_en_chk;
--   --        alter table "GP2".matriz add constraint matriz_carga_en_chk check (carga_en = any (array['golpes','unidades','kg']));
--   -- sólo si los VxSE no tienen movimientos: delete from "GP2".inventario / "GP2".componente donde codigo ~ '^V[0-9]+SE$'.
--   commit;

do $outer$
declare
  v_modo text := 'real';   -- 'dry' = ensayo que siempre revierte (e incluye una prueba funcional con bolsas)
  v_m bigint; v_ub bigint; ncomp int; nsal int; nent int; npz int; ninv int;
  vistas text[] := array['v_consumo_demanda','v_oc_virgilio_demanda','v_hace_articulo','v_contraparte_parte','v_consumo_tallerista','v_componente_muerto','v_stock_mp_ps','v_consumo_fleje_kg_articulo','v_oc_virgilio_partes_tallerista','v_reparto_efectivo'];
  v text; i int := 0; n1 bigint; n2 bigint; rep text := ''; costos_dist int; costos_n int; nmax int; u int; w int; huecos int;
  antes text; despues text; mov text; r1 jsonb; r2 jsonb; r3 jsonb;
begin
  select id into v_m from "GP2".matriz where n_matriz = '150';
  select id into v_ub from "GP2".ubicacion where tipo = 'sector' and ref_id = 8;
  if v_m is null or v_ub is null then raise exception 'falta la matriz 150 o la ubicacion del Sector Remache'; end if;
  if exists (select 1 from "GP2".componente where codigo ~ '^V[0-9]+SE$') then raise exception 'ya existen componentes VxSE: no se vuelve a aplicar'; end if;
  create temp table _c0 on commit drop as select comp_id, total_pesos, faltan_precios, segundos_matriz from "GP2".v_costo_componente;
  foreach v in array vistas loop
    i := i + 1;
    execute format('create temp table _b%s on commit drop as select x::text as t from "GP2".%I x', i, v);
  end loop;
  create temp table _bmax on commit drop as select componente_id, ubicacion_id, maximo::text mx, maximo_origen from "GP2".inventario;

  alter table "GP2".matriz drop constraint matriz_carga_en_chk;
  alter table "GP2".matriz add constraint matriz_carga_en_chk check (carga_en = any (array['golpes'::text, 'unidades'::text, 'kg'::text, 'bolsas'::text]));

  insert into "GP2".componente (codigo, descripcion, sector_id, unidad_medida, kg_x_uni, uni_x_cajon, proveedor, estado_compra)
    select c.codigo || 'SE', c.descripcion || ' s/envasar', c.sector_id, c.unidad_medida, c.kg_x_uni, round(25 / c.kg_x_uni, 4), c.proveedor, c.estado_compra
      from "GP2".componente c where c.codigo ~ '^V([1-9]|1[1-3])$';
  get diagnostics ncomp = row_count;
  insert into "GP2".inventario (componente_id, ubicacion_id, cantidad)
    select id, v_ub, 0 from "GP2".componente where codigo ~ '^V([1-9]|1[1-3])SE$';
  get diagnostics ninv = row_count;
  create temp table _map on commit drop as select v.id v_id, s.id se_id from "GP2".componente v join "GP2".componente s on s.codigo = v.codigo || 'SE';

  update "GP2".ruta_paso rp set comp_salida_id = m.se_id from _map m
   where rp.tipo_paso = 'proveedor_servicio' and rp.comp_salida_id = m.v_id
     and rp.comp_entrada_id in (select id from "GP2".componente where codigo ~ '^CV[0-9]+$');
  get diagnostics nsal = row_count;
  update "GP2".ruta_paso rp set comp_entrada_id = m.se_id from _map m
   where rp.matriz_id = v_m and rp.tipo_paso = 'matriz' and rp.comp_entrada_id = m.v_id and rp.comp_salida_id = m.v_id;
  get diagnostics nent = row_count;
  update "GP2".precio_servicio_pieza pz set componente_id = m.se_id from _map m
   where pz.componente_id = m.v_id and pz.proveedor_servicio_id = 4;
  get diagnostics npz = row_count;

  update "GP2".matriz set carga_en = 'bolsas', cuenta_mo = false where id = v_m;

  -- fabricar_stock con la conversión bolsas → unidades: el cuerpo vigente está en db/funciones_GP2.sql (CREATE OR REPLACE
  -- FUNCTION "GP2".fabricar_stock): se aplicó dentro de este mismo bloque con EXECUTE y es idéntico al archivo (md5 verificado).

  set constraints all immediate;

  create temp table _c1 on commit drop as select comp_id, total_pesos, faltan_precios, segundos_matriz from "GP2".v_costo_componente;
  select count(*), count(*) filter (where b.total_pesos is distinct from a.total_pesos or b.faltan_precios is distinct from a.faltan_precios or b.segundos_matriz is distinct from a.segundos_matriz)
    into costos_n, costos_dist from _c0 a join _c1 b using (comp_id);
  i := 0;
  foreach v in array vistas loop
    i := i + 1;
    execute format('select count(*) from (select x::text t from "GP2".%I x except select t from _b%s) a', v, i) into n1;
    execute format('select count(*) from (select t from _b%s except select x::text from "GP2".%I x) a', i, v) into n2;
    rep := rep || format(E'\n  %s: +%s / -%s filas', v, n1, n2);
  end loop;
  select count(*) into nmax from "GP2".inventario i2 join _bmax b on b.componente_id = i2.componente_id and b.ubicacion_id = i2.ubicacion_id
   where b.mx is distinct from i2.maximo::text or b.maximo_origen is distinct from i2.maximo_origen;
  select count(*) into u from (select ruta_id, orden from "GP2".ruta_paso group by 1, 2 having count(*) > 1) d;
  select count(*) into w from "GP2".ruta_paso rp where rp.tipo_paso in ('matriz','proveedor_servicio','tallerista') and coalesce(rp.matriz_id, rp.proveedor_id, rp.tallerista_id) is null;
  select count(*) into huecos from (select ruta_id from "GP2".ruta_paso group by 1 having max(orden) - min(orden) + 1 <> count(*)) h;
  rep := format(E'SE=%s inv=%s salidas niquelado=%s entradas 150=%s precios=%s | costos comparados=%s distintos=%s | maximos distintos=%s | orden_repetido=%s sin_actor=%s huecos=%s', ncomp, ninv, nsal, nent, npz, costos_n, costos_dist, nmax, u, w, huecos) || rep;

  if v_modo = 'dry' then
    select string_agg(c.codigo || '=' || coalesce(i3.cantidad::text, 'sin fila'), ' | ' order by c.codigo) into antes
      from "GP2".componente c left join "GP2".inventario i3 on i3.componente_id = c.id and i3.ubicacion_id = v_ub where c.codigo in ('V9','V9SE','V1','V1SE','V10');
    r1 := reg_prod_3_0.reg_prod_3_0_gp2_fabricar_stock(v_m, (select id from "GP2".componente where codigo = 'V9'), 6, now());
    r2 := reg_prod_3_0.reg_prod_3_0_gp2_fabricar_stock(v_m, (select id from "GP2".componente where codigo = 'V1'), 3, now());
    r3 := reg_prod_3_0.reg_prod_3_0_gp2_fabricar_stock(v_m, (select id from "GP2".componente where codigo = 'V10'), 2, now());
    select string_agg(c.codigo || '=' || coalesce(i3.cantidad::text, 'sin fila'), ' | ' order by c.codigo) into despues
      from "GP2".componente c left join "GP2".inventario i3 on i3.componente_id = c.id and i3.ubicacion_id = v_ub where c.codigo in ('V9','V9SE','V1','V1SE','V10');
    select string_agg(mv.id || ': ' || ce.codigo || ' -> ' || cs.codigo || ' cant ' || mv.cantidad || ' transf ' || coalesce(mv.cantidad_transformada::text, '-'), ' ;; ' order by mv.id)
      into mov from "GP2".movimiento mv join "GP2".componente ce on ce.id = mv.comp_id left join "GP2".componente cs on cs.id = mv.comp_transformado_id
     where mv.id in ((r1->>'movimiento_id')::bigint, (r2->>'movimiento_id')::bigint, (r3->>'movimiento_id')::bigint);
    raise exception E'ENSAYO REVERTIDO — %\nantes: %\ndespues: %\nmovimientos: %\navisos: % / % / %', rep, antes, despues, mov, r1->>'aviso', r2->>'aviso', r3->>'aviso';
  end if;
  if ncomp <> 12 or ninv <> 12 or nsal <> 53 or nent <> 53 or npz <> 12 or costos_dist > 0 or nmax > 0 or u > 0 or w > 0 or huecos > 0 then
    raise exception E'ABORTADO, nada se guardó — %', rep;
  end if;
end $outer$;

-- ── Verificación (resultado del 2026-10-07): 12 VxSE en Sector Remache (25,00 kg, estado_compra fabricacion) con 12 inventarios en 0 ·
--    53 pasos de niquelado entregan VxSE y 0 siguen entregando Vx · la 150 tiene 55 pasos (53 toman VxSE, 2 V10→V10) ·
--    12 precios de niquelado en VxSE y 0 en Vx · 150 = carga_en 'bolsas', cuenta_mo false · el check admite 'bolsas' ·
--    fabricar_stock convierte · 0 órdenes repetidos · 13 etiquetas de la 150 intactas.
select c.codigo, c.descripcion, round(c.kg_x_uni * c.uni_x_cajon, 2) kg_cajon, c.estado_compra, i.cantidad
  from "GP2".componente c join "GP2".inventario i on i.componente_id = c.id
 where c.codigo ~ '^V[0-9]+SE$' order by length(c.codigo), c.codigo;
