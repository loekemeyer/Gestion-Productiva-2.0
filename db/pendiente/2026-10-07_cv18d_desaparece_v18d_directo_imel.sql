-- 2026-10-07 — El tornillo sacafuente llega de Imel YA como V18D: desaparece el CV18D y el paso de niquelado (508 y 708).
-- ⚠ NO APLICADO. Hay que correrlo UNA vez en el SQL Editor de Supabase: necesita DELETE y el conector de la sesión retiene los DELETE
--   (cuelga a los 60 s esperando una confirmación humana que una sesión remota no puede dar; se reintentó con todo en una transacción:
--   no aplicó nada, CV18D y los 8 pasos de las rutas 219/583 quedaron intactos). Es UNA transacción: o entra todo o nada.
-- [usuario] (captura de la ruta «CV18D — Tornillo Sacafuente p/Niquelar»: Imel → CV18D → Guazzaroni (niquelado) → Martin Cornejo →
--   Virgilio): "Ese tornillo sacafuente viene de Imel ya como V18D, elimina CV18D y también el paso que se manda a niquelar".
--
-- HOY  (rutas 219 «Insumo TORNSF -> Art 508» y 583 «Insumo CV18D -> Art 708», idénticas):
--   1 ingreso CV18D→CV18D · 2 Guazzaroni (proveedor_servicio 4) CV18D→V18D · 3 tallerista 6 (Martin Cornejo) V18D→art · 4 virgilio
-- QUEDA (como las rutas de W8):
--   1 insumo V18D→V18D · 2 tallerista 6 V18D→art · 3 virgilio
--
-- ids (verificados el 07/10): componente 477 = CV18D (stock 0, proveedor Imel) · 281 = V18D (Sector Remache, estado_compra
--   'fabricacion', proveedor NULL) · ruta_paso 1285/2460/1286/1287 (ruta 219) y 2411/2507/2412/2413 (ruta 583) · inventario 839 =
--   CV18D en Sector Remache (0) · precio_proveedor 66 = «Tornillo sacafuentes» $68,70, lista 21/08, cod_prov 3808 (Imel), colgado
--   del 477 · precio_servicio_pieza 112 = niquelado de Guazzaroni sobre V18D (precio_kg NULL; la tarifa $2.606/kg vive en
--   tarifa_servicio y NO se toca: la usan V1/V11/V12/V13/D9/D13).
-- Barrido hecho sobre las 30 FK a GP2.componente: CV18D sólo lo referencian 6 ruta_paso (4 de entrada + 2 de salida), 1 inventario
--   y 1 precio_proveedor; 0 movimientos, 0 recepciones, 0 OC, 0 alias. V18D conserva 2 recetas (508, 708), sus 2 inventarios y su
--   movimiento 85670 (consumo de Martin Cornejo del 06/10): no se tocan.
--
-- MEDIDO con ensayo revertido (los 2 pasos de niquelado simulados como insumo V18D→V18D duplicado, precio 66 pasado al V18D):
--   solo cambian 4 costos de 835 — V18D 148,18 → 68,70 (origen 'precio'; servicios 79,48 → 0) · 508 1.634,41 → 1.554,93 ·
--   708 1.611,47 → 1.531,98 · CV18D 68,70 → 0,00 (se borra). faltan_precios/kg/tiempos de 508 y 708 sin cambio (1/0/3).
--   Foto previa: zz_backups."GP2_Snap_costo_20261007_cv18d" (835 filas, total 537.420,79, huella fbaadea5e79f37157165a1344f910264, con RLS).
-- EFECTO OPERATIVO al aplicar:
--   · V18D deja de ser 'fabricacion' → vuelve a la OC y a la Recepción de Insumos, bajo Imel (antes lo pedía el CV18D).
--   · Se va el paso de Guazzaroni de las rutas 508/708: el Envío a Guazzaroni deja de ofrecer el tornillo; Martin Cornejo lo recibe
--     de Imel/Cervantes sin pasar por el PS.
--   · El tornillo ya no paga niquelado: -$79,48 por 508 y 708 (el niquelado ya viene incluido en el precio de Imel).
-- ⚠ NO SE TOCA (falta el dato): el $68,70 es la lista de Imel del 21/08 para «Tornillo sacafuentes»; si Imel ya vende NIQUELADO y
--   ese precio era del crudo, el costo real de V18D sube. Lo confirma el dueño con la factura de Imel.

begin;

-- 1) V18D se compra a Imel (el proveedor vivía en el CV18D) y deja de ser 'fabricacion'
update "GP2".componente set proveedor = 'Imel', estado_compra = null where id = 281 and codigo = 'V18D';

-- 2) el precio de Imel pasa del crudo al V18D (el V18D no tenía precio_proveedor: no choca con nada)
update "GP2".precio_proveedor set componente_id = 281 where id = 66 and componente_id = 477;

-- 3) rutas 219 (508) y 583 (708): sale el paso de Guazzaroni y el ingreso pasa a insumo V18D
delete from "GP2".ruta_paso where id in (2460, 2507) and tipo_paso = 'proveedor_servicio' and comp_entrada_id = 477 and comp_salida_id = 281;
update "GP2".ruta_paso set tipo_paso = 'insumo', comp_entrada_id = 281, comp_salida_id = 281 where id in (1285, 2411) and orden = 1 and comp_entrada_id = 477;
-- se renumeran 3→2 y 4→3 (hay unicidad ruta+orden, diferida: el orden de los update no importa dentro de la transacción)
update "GP2".ruta_paso set orden = 2 where id in (1286, 2412) and orden = 3;
update "GP2".ruta_paso set orden = 3 where id in (1287, 2413) and orden = 4;
update "GP2".ruta set nombre = 'Insumo V18D -> Art 508' where id = 219;
update "GP2".ruta set nombre = 'Insumo V18D -> Art 708' where id = 583;

-- 4) la tarifa del niquelado del V18D queda sin paso
delete from "GP2".precio_servicio_pieza where id = 112 and componente_id = 281 and proveedor_servicio_id = 4;

-- 5) el CV18D se va entero (si algo todavía le apunta, la FK aborta la transacción entera)
delete from "GP2".inventario where id = 839 and componente_id = 477 and cantidad = 0;
delete from "GP2".componente where id = 477 and codigo = 'CV18D';

-- 6) guarda: si el estado no es el esperado, no se confirma nada
do $g$
begin
  if (select count(*) from "GP2".ruta_paso where ruta_id in (219, 583)) <> 6 then raise exception 'rutas 219/583: se esperaban 6 pasos'; end if;
  if exists (select 1 from "GP2".componente where codigo = 'CV18D') then raise exception 'CV18D sigue existiendo'; end if;
  if (select count(*) from "GP2".precio_proveedor where componente_id = 281) <> 1 then raise exception 'V18D deberia tener 1 precio_proveedor'; end if;
end $g$;

commit;

-- VERIFICACION (después de correrlo):
-- select r.id ruta, p.orden, p.tipo_paso, ce.codigo ent, cs.codigo sal, p.tallerista_id from "GP2".ruta r
--   join "GP2".ruta_paso p on p.ruta_id = r.id left join "GP2".componente ce on ce.id = p.comp_entrada_id
--   left join "GP2".componente cs on cs.id = p.comp_salida_id where r.id in (219, 583) order by r.id, p.orden;
--   -- 6 filas: (219) V18D→V18D · V18D→508 (tall 6) · 508→— · (583) V18D→V18D · V18D→708 (tall 6) · 708→—
-- select count(*) from "GP2".componente where codigo = 'CV18D';   -- 0
-- select codigo, proveedor, estado_compra from "GP2".componente where id = 281;   -- V18D · Imel · NULL
-- select n.codigo, s.total_pesos antes, n.total_pesos despues from "GP2".v_costo_componente n
--   full join zz_backups."GP2_Snap_costo_20261007_cv18d" s on s.comp_id = n.comp_id
--  where n.comp_id is null or s.comp_id is null or n.total_pesos is distinct from s.total_pesos
--     or n.faltan_precios <> s.faltan_precios or n.faltan_kg <> s.faltan_kg or n.faltan_tiempos <> s.faltan_tiempos;
--   -- 4 filas: V18D 148,18→68,70 · 508 1.634,41→1.554,93 · 708 1.611,47→1.531,98 · CV18D 68,70→(borrado)
-- \i db/verificar.sql   -- cada fila n = 0
-- Después: mover este archivo a db/, regenerar db/ si hace falta, y actualizar los textos que nombran al CV18D
--   (REGLAS_OC_INSUMOS.md línea 241, COMPONENTES_SIN_CAJON_2026-09-23.md, CONOCIMIENTO 4gc/4ge/4gi quedan como historia).

-- REVERSA (los ids se conservan: se vuelve a insertar con el mismo id; si la tabla usa identidad, agregar OVERRIDING SYSTEM VALUE):
-- begin;
-- insert into "GP2".componente select * from jsonb_populate_record(null::"GP2".componente, '{"id":477,"marca":null,"codigo":"CV18D","kg_x_uni":0.0305,"mb_color":null,"es_pliego":false,"proveedor":"Imel","sector_id":8,"descripcion":"Tornillo Sacafuente p/Niquelar","envio_carga":null,"material_id":null,"uni_x_cajon":65.5738,"discontinuado":false,"entrega_uni_x":null,"estado_compra":null,"remito_unidad":null,"uni_x_paquete":null,"unidad_medida":"unidad","carton_formato":null,"codigo_isis_ch":null,"entrega_unidad":null,"familia_pedido":null,"codigo_virgilio":null,"recibe_en_cajas":false,"carton_categoria":null,"pedido_minimo_uni":null,"relev_solo_sueltas":false}'::jsonb);
-- insert into "GP2".inventario select * from jsonb_populate_record(null::"GP2".inventario, '{"id":839,"maximo":2692,"cantidad":0,"ubicaciones":null,"ubicacion_id":8,"componente_id":477,"maximo_origen":"est_madre","actualizado_en":null,"cajones_x_ubicacion":null}'::jsonb);
-- update "GP2".componente set proveedor = null, estado_compra = 'fabricacion' where id = 281;
-- update "GP2".precio_proveedor set componente_id = 477 where id = 66;
-- insert into "GP2".precio_servicio_pieza select * from jsonb_populate_record(null::"GP2".precio_servicio_pieza, '{"id":112,"moneda":"ARS","origen":"Alta 2026-09-04: el paso CV18D -> V18D es niquelado de Guazzaroni, tarifa por proceso ($2606/kg en GP2.tarifa_servicio). NO RESUELVE TODAVIA porque el tornillo sacafuente no tiene kg_x_uni cargado (ni el V18D ni el CV18D): falta el peso.","proceso":"niquelado","precio_kg":null,"precio_uni":null,"componente_id":281,"actualizado_en":"2026-09-03T21:49:25.676698-03:00","proveedor_servicio_id":4}'::jsonb);
-- update "GP2".ruta_paso set orden = 4 where id in (1287, 2413);
-- update "GP2".ruta_paso set orden = 3 where id in (1286, 2412);
-- update "GP2".ruta_paso set tipo_paso = 'ingreso', comp_entrada_id = 477, comp_salida_id = 477 where id in (1285, 2411);
-- insert into "GP2".ruta_paso select * from jsonb_populate_record(null::"GP2".ruta_paso, '{"id":2460,"orden":2,"ruta_id":219,"cantidad":1,"matriz_id":null,"tipo_paso":"proveedor_servicio","proveedor_id":4,"tallerista_id":null,"comp_salida_id":281,"comp_entrada_id":477,"proveedor_at_id":null}'::jsonb);
-- insert into "GP2".ruta_paso select * from jsonb_populate_record(null::"GP2".ruta_paso, '{"id":2507,"orden":2,"ruta_id":583,"cantidad":1,"matriz_id":null,"tipo_paso":"proveedor_servicio","proveedor_id":4,"tallerista_id":null,"comp_salida_id":281,"comp_entrada_id":477,"proveedor_at_id":null}'::jsonb);
-- update "GP2".ruta set nombre = 'Insumo TORNSF -> Art 508' where id = 219;
-- update "GP2".ruta set nombre = 'Insumo CV18D -> Art 708' where id = 583;
-- commit;
