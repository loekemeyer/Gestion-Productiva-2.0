-- =====================================================================
-- 323E y 838E (Rallador Mini importado, Loeke / Chef) se envasan con la MATRIZ 514, no con la 512.
-- [Thomas, 09/10/2026: «tanto en el artículo 323E y 838E utilizan la matriz 514 como envasado y no la 512»]
-- APLICADA el 09/10/2026 (una transacción). CONOCIMIENTO §4kg.
--
-- 1) La 514 no existía en GP2.matriz (GP2 llegaba a 512; ver §4 verif. cajones 06/10). Se da de alta con
--    la descripción de Entero (public."Matrices": «Env Rallador Mini Imp.») y SIN tiempo histórico: Entero
--    tampoco lo tiene y no se inventa. Consecuencia: 323E/838E quedan con faltan_tiempos = 1 y MO $0
--    hasta que se cargue el tiempo (antes heredaban los 54,5 s de la 512 = $109 de MO).
-- 2) Los 4 pasos de envasado (rutas 1105-1108) pasan de 411 (512) a 419 (514).
-- 3) El selector Loeke/Chef de la tablet (matriz_salida_etiqueta) se muda a la 514.
-- La 512 queda activa y sin pasos: es una matriz real de Entero (8 registros, 888 u, último 28/09).
-- Los 4 registros de producción de prueba del 06/10 (ids 7513-7516, legajo 1 «Pruebas») quedan en la 512.
-- =====================================================================
begin;
insert into "GP2".matriz (id, n_matriz, descripcion, tipo, partes_por_kilo_de_fleje, tiempo_historico,
                          uni_x_golpe, tiempo_unidad, maquina, activa, carga_en, cuenta_mo)
values (419, '514', 'Env Rallador Mini Imp.', null, null, null, 1, 'uni', null, true, 'unidades', true);
update "GP2".ruta_paso set matriz_id = 419 where id in (4313, 4316, 4319, 4322) and matriz_id = 411;
update "GP2".matriz_salida_etiqueta set matriz_id = 419 where matriz_id = 411;
commit;

-- Verificación (09/10): pasos 514 = 4313,4316,4319,4322 · pasos 512 = 0 · etiquetas 514 = Loeke→974, Chef→975
-- Costo 323E y 838E: $122,90 (material 13,90 + MO 109) → $13,90 (MO 0, faltan_tiempos 1).
-- Invariantes W, L, AJ en 0.

-- Revert:
-- begin;
-- update "GP2".matriz_salida_etiqueta set matriz_id = 411 where matriz_id = 419;
-- update "GP2".ruta_paso set matriz_id = 411 where id in (4313, 4316, 4319, 4322) and matriz_id = 419;
-- delete from "GP2".matriz where id = 419;
-- commit;

-- ---------------------------------------------------------------------
-- Adenda 09/10: tiempo de la 514 = 22 s por unidad [Thomas: «22 segundos»]. APLICADA.
-- update "GP2".matriz set tiempo_historico = 22 where id = 419 and n_matriz = '514' and tiempo_historico is null;
-- Costo 323E y 838E: $13,90 → $57,90 (MO $44, faltan_tiempos 0). Revert: set tiempo_historico = null.
