-- 2026-10-06 — 942E «Cuchara Ac. Inox» pasa a «Cuchara Lisa Ac. Inox», y su pieza Z47 / Z47-M505 igual.
-- [Thomas] "942E renombra es Cuchara Lisa, no Cuchara sólo".
-- Molde: db/migracion_944e_pinza_fideos_20261005.sql (artículo + la pieza que arma la 505 dicen lo mismo).
-- Alcance: GP2.articulo id 164 y GP2.componente id 952 (Z47) y 953 (Z47-M505). Sin triggers; ninguna función ni
-- vista de GP2 trae el texto escrito.
-- NO se tocó: 946E «Cuchara Calada Ac. Inox» (otra pieza), matrices 401 «Env Cucharas Inox Imp» y 505D (inactiva),
-- 942P en el espejo de Virgilio (lo escribe GV) ni la planilla A_Costos_VIGENTES.xlsx.
begin;
update "GP2".articulo set descripcion = 'Cuchara Lisa Ac. Inox'
 where id = 164 and codigo = '942E' and descripcion = 'Cuchara Ac. Inox';
update "GP2".componente set descripcion = replace(descripcion, 'Cuchara Inox', 'Cuchara Lisa Inox')
 where id in (952, 953) and codigo in ('Z47', 'Z47-M505') and descripcion like 'Cuchara Inox%';
commit;

-- ROLLBACK
-- begin;
-- update "GP2".articulo set descripcion = 'Cuchara Ac. Inox' where id = 164;
-- update "GP2".componente set descripcion = replace(descripcion, 'Cuchara Lisa Inox', 'Cuchara Inox') where id in (952, 953);
-- commit;
