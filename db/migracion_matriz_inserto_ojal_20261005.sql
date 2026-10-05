-- 2026-10-05 — Matriz 515 «Colocar Inserto y Ojal al Mgo» para los articulos 720, 722 y 858.
-- [usuario, Nazareno] "Me retracto: de la matriz 237 salen solo de los arts 542, 543 o 570. Crea un numero de
-- matriz (el siguiente a la ultima) para 720, 722 o 858 y que se llame Colocar Inserto y Ojal al Mgo".
-- Retira db/migracion_matriz_237b_en_237_20261005.sql (parte 1). CONOCIMIENTO §4iy. APLICADO el 2026-10-05.
--
-- Numero: 515. La planta ya usa 513 y 514 (public."Matrices": «colocar etiqueta a bombillas», «Env Rallador Mini
-- Imp.», con registros de hoy en db_n8n_espejo); GP2 llega a la 512. Un 513 se habria pisado con produccion real.
-- La 900-906 es otra familia («p.p. Ajo»). Si se queria la 907: update "GP2".matriz set n_matriz='907' where id=414.
--
-- Atributos copiados de la 237B (sin tiempo, cuenta_mo=false): el costo vuelve EXACTO al de antes de la union.
-- Medido: huella de v_costo_componente a0a9f137b05cc12d740df988f8c56cea y total 535.101,71, igual que el
-- snapshot zz_backups."GP2_Snap_costo_20261005_237b" (0 componentes distintos). Invariantes L/U/W/AA/AD/AJ = 0.
-- La 237 queda con 6 pasos (542/543/570, pieza unica PC10-M237: sin selector); la 515 con 9 (720/722/858,
-- 2 piezas: PB6-M237B para 720·722 y PC7-M237B para 858). La 237B (id 413) queda activa=false con 0 pasos.
begin;
with nueva as (
  insert into "GP2".matriz (n_matriz, descripcion, activa, cuenta_mo, uni_x_golpe, carga_en, tiempo_unidad)
  values ('515', 'Colocar Inserto y Ojal al Mgo', true, false, 1, 'unidades', 'uni')
  returning id)                                                    -- id 414
update "GP2".ruta_paso set matriz_id = (select id from nueva)
 where id in (4268, 4269, 4270, 4271, 4272, 4273, 4274, 4275, 4276) and matriz_id = 143;
commit;

-- PENDIENTE (propuesto, no aplicado): renombrar los intermedios PB6-M237B / PC7-M237B a PB6-M515 / PC7-M515.

-- ROLLBACK (deja los 9 pasos otra vez en la 237B, reactivandola)
-- begin;
-- update "GP2".ruta_paso set matriz_id = 413 where id in (4268, 4269, 4270, 4271, 4272, 4273, 4274, 4275, 4276);
-- update "GP2".matriz set activa = true where id = 413;
-- commit;
