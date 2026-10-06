-- 2026-10-06 — Fleje N° 15 (IE10): la M73 y la M74 dejan de tener UNA salida y pasan a tener una por marca/forma.
-- [usuario] M73: "después de pasar por la matriz 73 se puede ir a IE10-M73-A-L (Abierta Loeke), IE10-M73-C-L (Cerrada
--   Loeke), IE10-M73-A-C (Abierta Chef) y IE10-M73-C-C (Cerrada Chef)".
-- [usuario] M74: "hoy expulsa G5, G7 e IE10-M74. Tendría que ser G5, G7, IE10-M74-L (Loeke) y IE10-M74-C (Chef)".
-- ⚠ En M73 la "C" del medio es CERRADA (IE10-M73-C-L); en M74 la "C" final es CHEF (IE10-M74-C). Nomenclatura del usuario.
--
-- Mapeo (507 = Loeke/LK cromado, 707 = Chef pintado; Abierta = rama M74→G7/G5, Cerrada = rama M74→M77→G8/G6):
--   ruta 46 (507 abierta) : IE10 → M73 → IE10-M73-A-L → M74 → G7
--   ruta 45 (507 cerrada) : IE10 → M73 → IE10-M73-C-L → M74 → IE10-M74-L → M77 → G8
--   ruta 48 (707 abierta) : IE10 → M73 → IE10-M73-A-C → M74 → G5
--   ruta 47 (707 cerrada) : IE10 → M73 → IE10-M73-C-C → M74 → IE10-M74-C → M77 → G6
-- 482 (IE10-M73) y 483 (IE10-M74) se RENOMBRAN en vez de borrarse (conservan id e inventario; no hay DELETE).
-- Solo base (GP2). public no se toca (Regla 0). El Despiece (Despiece_GP2.html) lee ruta_paso en vivo y
-- ruta_revision tiene 0 filas: no hay firmas que migrar.
--
-- POR QUÉ SE PARTIÓ TAMBIÉN LA M74 (ensayo con rollback): con sólo las 4 de la M73, IE10-M74 (que comparten las ramas
-- cerradas de 507 y 707) recibía DOS flejes y 507/707 subían +$457,86 c/u (artefacto). Con la M74 partida suben +$228,93
-- c/u, que es la mitad de material que el motor deduplicaba (CONOCIMIENTO §4cv, "hallazgo de paso").
--
-- Costos medidos antes → después (v_costo_componente, pesos): 507 649,02 → 877,95 · 707 721,05 → 949,98 ·
--   D5-M78 538,20 → 767,13 · B1-M78 632,48 → 861,41. Los otros 827 costos: huella md5 idéntica (8b987ef0…).
-- Totales antes → después: componente 831 → 835 · inventario 1174 → 1178 · ruta_paso 3452 (sin cambio) · costo 831 → 835.
-- Ids nuevos: 988 IE10-M73-C-L · 989 IE10-M73-A-C · 990 IE10-M73-C-C · 991 IE10-M74-C. (Los ensayos con rollback
--   consumieron 11 ids de secuencia: el hueco es esperado.)
begin;

-- 1) componente (Sector Movimiento = 3)
update "GP2".componente set codigo='IE10-M73-A-L', descripcion='Fleje N° 15 tras M73 (Abierta Loeke)' where id=482 and codigo='IE10-M73' and sector_id=3;
update "GP2".componente set codigo='IE10-M74-L',   descripcion='Fleje N° 15 tras M74 (Loeke)'         where id=483 and codigo='IE10-M74' and sector_id=3;
insert into "GP2".componente (codigo,descripcion,sector_id,unidad_medida) values
  ('IE10-M73-C-L','Fleje N° 15 tras M73 (Cerrada Loeke)',3,'unidad'),
  ('IE10-M73-A-C','Fleje N° 15 tras M73 (Abierta Chef)',3,'unidad'),
  ('IE10-M73-C-C','Fleje N° 15 tras M73 (Cerrada Chef)',3,'unidad'),
  ('IE10-M74-C',  'Fleje N° 15 tras M74 (Chef)',3,'unidad');

-- 2) inventario: fila en ubicación 3, cantidad 0 (igual que IC2-M114-D/I)
insert into "GP2".inventario (componente_id,ubicacion_id,cantidad)
  select id,3,0 from "GP2".componente where sector_id=3 and codigo in ('IE10-M73-C-L','IE10-M73-A-C','IE10-M73-C-C','IE10-M74-C');

-- 3) ruta_paso (el despiece de 507 y 707). Las ramas abiertas de Loeke (pasos 290/291) ya apuntaban a 482 = A-L.
update "GP2".ruta_paso set comp_salida_id  =(select id from "GP2".componente where sector_id=3 and codigo='IE10-M73-C-L') where id=282 and comp_salida_id=482;
update "GP2".ruta_paso set comp_entrada_id =(select id from "GP2".componente where sector_id=3 and codigo='IE10-M73-C-L') where id=283 and comp_entrada_id=482;
update "GP2".ruta_paso set comp_salida_id  =(select id from "GP2".componente where sector_id=3 and codigo='IE10-M73-A-C') where id=305 and comp_salida_id=482;
update "GP2".ruta_paso set comp_entrada_id =(select id from "GP2".componente where sector_id=3 and codigo='IE10-M73-A-C') where id=306 and comp_entrada_id=482;
update "GP2".ruta_paso set comp_salida_id  =(select id from "GP2".componente where sector_id=3 and codigo='IE10-M73-C-C') where id=297 and comp_salida_id=482;
update "GP2".ruta_paso set comp_entrada_id =(select id from "GP2".componente where sector_id=3 and codigo='IE10-M73-C-C') where id=298 and comp_entrada_id=482;
update "GP2".ruta_paso set comp_salida_id  =(select id from "GP2".componente where sector_id=3 and codigo='IE10-M74-C')   where id=298 and comp_salida_id=483;
update "GP2".ruta_paso set comp_entrada_id =(select id from "GP2".componente where sector_id=3 and codigo='IE10-M74-C')   where id=299 and comp_entrada_id=483;

commit;

-- VERIFICACION (todo aplicado y medido el 2026-10-06): 6 componentes IE10-M73/M74-* con inventario ubic 3 = 0; 8 pasos
-- de las rutas 45-48 con los códigos nuevos; 0 huérfanos; invariantes I,K,L,U,W,Y,AB,AJ = 0;
-- select codigo, total_pesos from "GP2".v_costo_componente where comp_id in (401,437,485,486);  -- 507 / 707 / D5-M78 / B1-M78

-- REVERSA (el DELETE de las 4 filas nuevas va por el SQL Editor: el conector cuelga los DELETE).
-- update "GP2".ruta_paso set comp_salida_id=482 where id in (282,305,297);
-- update "GP2".ruta_paso set comp_entrada_id=482 where id in (283,306,298);
-- update "GP2".ruta_paso set comp_salida_id=483 where id=298;
-- update "GP2".ruta_paso set comp_entrada_id=483 where id=299;
-- update "GP2".componente set codigo='IE10-M73', descripcion='Fleje N° 15 tras M73' where id=482;
-- update "GP2".componente set codigo='IE10-M74', descripcion='Fleje N° 15 tras M74' where id=483;
-- delete from "GP2".inventario where componente_id in (988,989,990,991);
-- delete from "GP2".componente where id in (988,989,990,991);
