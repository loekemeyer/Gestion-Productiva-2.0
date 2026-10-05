-- 2026-10-05 — Z48 pasa de «Cuchara Fideos Inox» a «Pinza Fideos Inox».
-- [usuario, sobre la captura de Stock General con la búsqueda «z48»]
-- "En vez de Cuchara Fideos renombra a Pinza Fideos".
-- Alcance: SÓLO los 2 componentes que muestra la captura (Z48 id 956 y Z48-M505 id 957). El texto sale de
-- GP2.componente.descripcion: ninguna función ni vista de GP2 lo trae escrito, y inventario no lo copia.
-- NO se tocó (otra pieza o fuera de GP2): PV5 «Cuchara Fideos Nylon 1 Pza» (cuchara de verdad), artículos
-- 391/844/944E, 944P en el espejo de Virgilio, la planilla de costos del usuario y la matriz 171.
begin;
update "GP2".componente
   set descripcion = replace(descripcion, 'Cuchara Fideos', 'Pinza Fideos')
 where id in (956, 957) and descripcion like 'Cuchara Fideos%';
commit;

-- ROLLBACK
-- begin;
-- update "GP2".componente set descripcion = 'Cuchara Fideos Inox' where id = 956;
-- update "GP2".componente set descripcion = 'Cuchara Fideos Inox tras M505' where id = 957;
-- commit;
