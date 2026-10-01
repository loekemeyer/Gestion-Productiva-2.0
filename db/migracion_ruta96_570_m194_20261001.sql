-- 570 Pala de Canelones · ruta 96 (Fleje 28): el vastago F2 entra a la Matriz 194, no va directo a Fabrica.
-- [usuario, 01/10] "Si" a corregir la ruta para que cierre con la receta (componente_bom: E6-M194 = E6 + F2 + 2 V10).
-- Molde: igual que las rutas del 521 (cada ruta que alimenta la convergencia lleva el paso de la matriz que une).
-- APLICADO el 2026-10-01. Backup: zz_backups."GP2_Backup_ruta96_20261001".
--
-- Antes: ... 633 Pedernera L8->F2 · 634 tallerista Fabrica F2->570 · 635 virgilio
-- Ahora: ... 633 Pedernera L8->F2 · 634 matriz M194 F2->E6-M194 · 635 tallerista Fabrica E6-M194->570 · 4258 virgilio
begin;
update "GP2".ruta_paso set tipo_paso='matriz', matriz_id=82, tallerista_id=null, comp_entrada_id=124, comp_salida_id=506
 where id=634 and ruta_id=96 and tipo_paso='tallerista';
update "GP2".ruta_paso set tipo_paso='tallerista', tallerista_id=3, comp_entrada_id=506, comp_salida_id=424
 where id=635 and ruta_id=96 and tipo_paso='virgilio';
insert into "GP2".ruta_paso (id, ruta_id, orden, tipo_paso, comp_entrada_id, comp_salida_id, cantidad)
 select 1+max(id), 96, 7, 'virgilio', 424, null, 1 from "GP2".ruta_paso;   -- quedo id 4258
commit;
--
-- Efecto medido (snapshot zz_backups."GP2_Snap_costo_max_20261001" contra despues):
--   costo E6-M194: $241,24 -> $388,03 (ahora suma el F2: estaba subvaluado en $146,79). Costo del 570 SIN cambio ($708,67).
--   maximo F2 en Fabrica (ubic 23): 636 -> 120 (queda solo lo del 858, que sigue llevando F2 directo, ruta 97).
--   PEST1 4356 -> 2800 y A9B 1680 -> 1482: NO son de este cambio; el trigger de maximos recalculo lo pendiente de la
--   migracion 94xE de otra sesion del mismo dia.
--
-- ROLLBACK:
-- begin;
-- delete from "GP2".ruta_paso where id=4258;
-- update "GP2".ruta_paso set tipo_paso='virgilio', tallerista_id=null, comp_entrada_id=424, comp_salida_id=null where id=635;
-- update "GP2".ruta_paso set tipo_paso='tallerista', matriz_id=null, tallerista_id=3, comp_entrada_id=124, comp_salida_id=424 where id=634;
-- commit;
