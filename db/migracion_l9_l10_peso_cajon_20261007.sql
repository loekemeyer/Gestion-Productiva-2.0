-- 2026-10-07 — APLICADO. Peso y cajón de los crudos L9 (Aleta Izq s/Doblar y s/Estampar) y L10 (Aleta Der s/Doblar y s/Estampar).
-- Cierra el «⚠ pendiente del dueño» de CONOCIMIENTO §4jf (L9 y L10 nacieron el 06/10 sin kg_x_uni ni uni_x_cajon).
-- [usuario, 07/10] «Te paso de los sectores crudos L9 y L10: Uni x Cajon 1234 · KG X Uni 0.024316667. Los dos iguales.»
--
-- Es una carga de DATOS (2 filas, 2 columnas): sin DDL, sin DELETE, sin tocar ruta_paso ni inventario.
-- Mismo formato que el vecino L8 (kg_x_uni con 9 decimales, uni_x_cajon entero).
--
-- Efectos en cadena (medidos contra la foto zz_backups."GP2_Snap_costo_20261007_l9_l10", 834 filas):
--   * v_costo_componente: SOLO cambia el material (M116 y M114 son tiempo_unidad 'uni', la mano de obra no depende del kg).
--     L9 91,81 -> 84,64 · L10 91,81 -> 84,64 · L9-M114 108,81 -> 101,64 · L10-M114 108,81 -> 101,64   (-7,17 c/u)
--     D3 114,99 -> 114,04 · D2 114,65 -> 114,04   (ahora IGUALES, como L9 y L10)
--     523 3.001,16 -> 2.999,60 · 723 2.958,32 -> 2.956,76   (-1,56 c/u)
--     Total 537.113,64 -> 537.080,28 = -33,36 (= 4 x 7,17 + 2 x 1,56 + 0,95 + 0,61). 8 filas distintas de 834; el resto idéntico.
--   * trg_maximos_cajones_componente (AFTER UPDATE OF uni_x_cajon) corrió recalcular_maximos_cajones(): el tope de 5 cajones
--     pasa a 6.170 u y el máximo por consumo de L9/L10 es 1.932, así que NO cambió (inventario.maximo idéntico en las 1.180 filas
--     contra zz_backups."GP2_Snap_inv_max_20261007_l9_l10").
--   * Crudos sin peso o cajón: 2 -> 0 (ya no queda ninguno en Sector Crudo).
-- Invariantes B, I, K, L, U, W, Y, AA de db/verificar.sql = 0 (el resto no lee estas columnas).

update "GP2".componente
   set kg_x_uni = 0.024316667,
       uni_x_cajon = 1234
 where id in (945, 947) and codigo in ('L9', 'L10');

-- REVERSA (vuelve al estado del 06/10: sin peso ni cajón; el costo vuelve a caer a 1/ppk de la M116, 37,8 u/kg):
-- update "GP2".componente set kg_x_uni = null, uni_x_cajon = null where id in (945, 947) and codigo in ('L9', 'L10');

-- Verificación:
-- select codigo, kg_x_uni, uni_x_cajon from "GP2".componente where id in (945, 947);   -- 0.024316667 / 1234 las dos
