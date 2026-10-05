-- 2026-10-05 — Matriz 237B unificada en la 237 + la tablet muestra los ARTICULOS de cada pieza.
-- [usuario, Nazareno] "En la 237 no me aparecen las variantes de que quiero producir si el de 542, 543,
-- 570, 720, 722 o 858 (los ultimos tres porque se unifico la matriz 237B con la 237)". CONOCIMIENTO §4iy.
-- Es la ultima de las "matrices con letra" que quedaban en espera (§4is): la 237B pasa a ser la 237.
-- APLICADO el 2026-10-05.
--
-- 1) DATOS. Los 9 pasos de la 237B (720/722/858: PB6, PC6, PA19, PC7 -> PB6-M237B / PC7-M237B) pasan a la
--    237; la 237B queda activa=false con 0 pasos. 0 produccion en las dos. Ninguna otra tabla cuelga de la
--    237B (articulo_linea_tallerista, produccion: 0 filas).
--    PLATA: la 237B no tenia tiempo (cuenta_mo=false) y la 237 si (5 s). Con una sola matriz hay un solo
--    tiempo, asi que 720, 722 y 858 pasan a costear 5 s de MO = +$10,00 c/u (igual que 570/542/543 el 02/10).
--    Medido contra la huella del snapshot: cambian SOLO 720, 722, 858, PB6-M237B, PC7-M237B, 720-ARM,
--    722-ARM y 858-ARM, +$10,00 cada uno. Invariantes L, U, W, AA, AB, AD, AJ = 0; AE = 2 (la base).
--    Respaldo: zz_backups."GP2_Backup_rutas_237b_20261005" (los 9 pasos) y
--    zz_backups."GP2_Snap_costo_20261005_237b" (v_costo_componente de los 831 componentes), las dos con RLS.
begin;
update "GP2".ruta_paso set matriz_id = 143 where matriz_id = 413;   -- 237B -> 237 (pasos 4268..4276)
update "GP2".matriz set activa = false where id = 413;
commit;

-- 2) RPC. registro_operarios_bundle().matriz_salidas ahora trae 'arts' en cada salida: los articulos de las
--    rutas donde esa matriz expulsa esa pieza ("542 · 543 · 570"). La 237 saca 3 piezas (PC10-M237 para
--    542/543/570, PB6-M237B para 720/722, PC7-M237B para 858): el selector de pieza que ya existia (matrices
--    con 2+ salidas, como la 505) aparece solo y ahora dice a que articulos corresponde cada una.
--    El cambio esta en db/funciones_GP2.sql (registro_operarios_bundle); se aplico con un parche que reemplaza
--    el fragmento de matriz_salidas y aborta si la funcion ya no coincide.

-- ROLLBACK (datos; la RPC es compatible hacia atras, la tablet vieja ignora 'arts')
-- begin;
-- update "GP2".ruta_paso set matriz_id = 413 where id in (4268, 4269, 4270, 4271, 4272, 4273, 4274, 4275, 4276);
-- update "GP2".matriz set activa = true where id = 413;
-- commit;
