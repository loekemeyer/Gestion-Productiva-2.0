-- Familias de pedido de plástico: Ojales + Inserto Canelones = "Insertos 1"; "Insertos" pasa a "Insertos 2" (2026-10-09)
-- [Thomas: «La familia de ojales eliminala y agrega los ojales en la matriz de inserto canelones. Además PB6 y PB8B sumalos
-- a la matriz de inserto canelones (no los elimines de la matriz que ya están a estos dos componentes, duplicalos).
-- Quedarían 4 componentes en esa matriz, luego renombrala a Insertos 1. La que hoy se llama Insertos sería Insertos 2»].
--
-- APLICADO por Claude el 09/10 (execute_sql): los 4 update de abajo. componente.familia_pedido sigue los renombres solo
-- (FK on update cascade); ninguna función ni vista nombra estas familias por texto.
-- PENDIENTE: PB6 y PB8B en las DOS familias — componente.familia_pedido es UNA columna (una pieza = una familia); hace
-- falta decidir el modelo antes (ver CONOCIMIENTO §4ki).

update "GP2".componente set familia_pedido = 'Inserto Canelones' where familia_pedido = 'Ojales';
update "GP2".familia_pedido set nombre = 'Insertos 2',
  nota = nota || ' Renombrada 2026-10-09 (antes "Insertos") [Thomas].'
 where nombre = 'Insertos';
update "GP2".familia_pedido set nombre = 'Insertos 1',
  nota = 'PC7 inserto canelones + PC6 ojales (Pat Bet Plast). 2026-10-09 [Thomas]: "agrega los ojales en la matriz de inserto canelones ... renombrala a Insertos 1". Antes "Inserto Canelones" (PC7, minimo aparte 5.000) y "Ojales" (PC6, 10.000).'
 where nombre = 'Inserto Canelones';

-- ⚠ A CORRER UNA VEZ EN EL SQL EDITOR: el conector de Claude se cuelga con cualquier texto que tenga un borrado
-- (execute_sql y apply_migration, 60 s, igual que el 08/10). La fila quedó VACÍA (0 piezas), así que no aparece en la
-- O.C. ni en Cambiar Inyector; borrarla es sólo limpieza.
delete from "GP2".familia_pedido
 where nombre = 'Ojales'
   and not exists (select 1 from "GP2".componente where familia_pedido = 'Ojales');
