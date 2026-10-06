-- 2026-10-06 — Sacafuente Pizzero, pieza CHICA (Z6): la matriz 364 corta y dobla; la 368 ya no interviene.
-- ⚠ NO APLICADO. Hay que correrlo UNA vez en el SQL Editor de Supabase: necesita DELETE y el conector de la sesión cuelga
--   los DELETE a los 60 s (se reintentó; no aplicó nada y la ruta 27 quedó intacta). Es una sola transacción: o entra todo o nada.
-- [usuario] (captura de la ruta del 518, «Rama 2 — IB3 produce Z6»): "Ya no se dobla la pieza chica del sacafuente pizzero.
--   Ahora la matriz 364 corta y dobla, despues de esta matriz se va a Z6."
--
-- Ruta 27 «Fleje 6 -> Art 518». Hoy (7 pasos):  1 ingreso IB3 · 2 M364 [IB3→IB3-M364] · 3 M368 [IB3-M364→Z6] · 4 M151 [Z6→Z36]
--   · 5 Pedernera [Z36→E10] · 6 Lucho [E10→518] · 7 virgilio.   Queda (6 pasos): 1 ingreso IB3 · 2 M364 [IB3→Z6] · 3 M151 [Z6→Z36]
--   · 4 Pedernera · 5 Lucho · 6 virgilio.
-- NO se toca la ruta 34 (Fleje 8 → M365 → IA10-M365 → M368 → Z5): la 368 sigue haciendo la pieza GRANDE.
-- ids (verificados el 06/10): ruta_paso 176..182 de la ruta 27 · componente 76 = Z6 · 480 = IB3-M364 (stock 0, solo lo usa la 27)
--   · matriz 110 = 368.
--
-- MEDIDO con ensayo revertido (se simuló sacar el paso 3 sin borrarlo): el único costo que cambia es Z6, 175,75 → 151,75
--   (−24,00 = los 12 s de la 368 a $2/s; segundos 15 → 3); IB3-M364 118,59 → 0,00 (queda sin uso y se borra acá).
--   Z36, E10, 518 y los otros 833 costos, sin cambio. 0 órdenes repetidos, 0 rutas sin pasos.
-- ⚠ PENDIENTE DEL DUEÑO (no se tocó): la matriz 364 sigue «Corte Pieza Chica Sacaf Pizz», tipo A, alimentador, 3 s, 46,23 u/kg.
--   Si ahora corta Y dobla, el nombre, la máquina y el tiempo hay que decirlos: con 3 s Z6 pierde $24 de mano de obra.
begin;

-- 1) la 364 entrega Z6 directo
update "GP2".ruta_paso set comp_salida_id=76 where id=177 and ruta_id=27 and comp_salida_id=480;
-- 2) sale el paso 3 (M368 sobre la pieza chica)
delete from "GP2".ruta_paso where id=178 and ruta_id=27 and orden=3 and comp_entrada_id=480 and comp_salida_id=76;
-- 3) se renumeran los pasos 4..7 → 3..6 (uno por uno y en orden: hay unicidad por ruta+orden)
update "GP2".ruta_paso set orden=3 where id=179 and ruta_id=27 and orden=4;
update "GP2".ruta_paso set orden=4 where id=180 and ruta_id=27 and orden=5;
update "GP2".ruta_paso set orden=5 where id=181 and ruta_id=27 and orden=6;
update "GP2".ruta_paso set orden=6 where id=182 and ruta_id=27 and orden=7;
-- 4) el intermedio IB3-M364 queda sin uso
delete from "GP2".inventario where componente_id=480 and cantidad=0;
delete from "GP2".componente where id=480 and codigo='IB3-M364';

commit;

-- VERIFICACION (después de correrlo):
-- select p.orden, p.tipo_paso, ce.codigo ent, cs.codigo sal from "GP2".ruta_paso p
--   left join "GP2".componente ce on ce.id=p.comp_entrada_id left join "GP2".componente cs on cs.id=p.comp_salida_id
--  where p.ruta_id=27 order by p.orden;   -- 6 filas: IB3→IB3 · IB3→Z6 · Z6→Z36 · Z36→E10 · E10→518 · 518→—
-- select count(*) from "GP2".componente where codigo='IB3-M364';   -- 0
-- select codigo, total_pesos from "GP2".v_costo_componente where codigo in ('Z6','Z36','518');   -- Z6 151,75 (con la 364 en 3 s)
-- Después: mover este archivo a db/ (o borrarlo) y anotarlo en LOCKS.txt.

-- REVERSA (el id del intermedio cambia: se vuelve a dar de alta):
-- insert into "GP2".componente (codigo,descripcion,sector_id,unidad_medida) values ('IB3-M364','Fleje N° 6 tras M364',3,'unidad');
-- insert into "GP2".inventario (componente_id,ubicacion_id,cantidad) select id,3,0 from "GP2".componente where sector_id=3 and codigo='IB3-M364';
-- update "GP2".ruta_paso set orden=7 where id=182; update "GP2".ruta_paso set orden=6 where id=181;
-- update "GP2".ruta_paso set orden=5 where id=180; update "GP2".ruta_paso set orden=4 where id=179;
-- update "GP2".ruta_paso set comp_salida_id=(select id from "GP2".componente where sector_id=3 and codigo='IB3-M364') where id=177;
-- insert into "GP2".ruta_paso (ruta_id,orden,tipo_paso,matriz_id,comp_entrada_id,comp_salida_id,cantidad)
--   select 27,3,'matriz',110,c.id,76,1 from "GP2".componente c where c.sector_id=3 and c.codigo='IB3-M364';
