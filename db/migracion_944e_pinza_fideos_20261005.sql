-- 2026-10-05 — Artículo 944E pasa de «Cuchara Fideos Ac. Inox» a «Pinza Fideos Ac. Inox».
-- [usuario, sobre la captura del selector «944E — Cuchara Fideos Ac. Inox»]
-- "Que sea Pinza Fideos Ac. Inox en vez de Cuchara".
-- Sigue a db/migracion_z48_pinza_fideos_20261005.sql: la pieza Z48 que arma la 505 ya era «Pinza Fideos Inox»
-- y el terminado que se arma con ella tiene que decir lo mismo.
-- Alcance: SÓLO GP2.articulo id 166 (codigo 944E). Sin triggers en esa tabla, y ninguna función ni vista de GP2
-- trae el texto escrito (verificado con pg_proc / pg_get_viewdef).
-- NO se tocó: 391 y 844 «Cuchara Fideos Nylon 1 Pza» y PV5 (cuchara de verdad, de nylon), 944P en el espejo de
-- Virgilio (lo escribe GV) ni la planilla de costos A_Costos_VIGENTES.xlsx.
begin;
update "GP2".articulo
   set descripcion = replace(descripcion, 'Cuchara Fideos', 'Pinza Fideos')
 where id = 166 and codigo = '944E' and descripcion = 'Cuchara Fideos Ac. Inox';
commit;

-- ROLLBACK
-- begin;
-- update "GP2".articulo set descripcion = 'Cuchara Fideos Ac. Inox' where id = 166 and codigo = '944E';
-- commit;
