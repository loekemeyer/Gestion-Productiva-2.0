-- 2026-10-02 — Matriz 505 «Armado Inox» única para los 5 insertos inox (942E/943E/944E/945E/948E).
-- [usuario, Thomas] "Todo lo que es armado inox tiene una matriz especifica (M 505 y sus derivados).
-- Ahora quiero que sea solo M 505 (Armado Inox) y que cuando el operario toca M 505 le de la opción
-- de Cuchara, Cucharon, etc".
-- Cómo: los 12 pasos de 505B/505C/505D/505F pasan a la 505 (id 171). Con 5 salidas distintas,
-- registro_operarios_bundle.matriz_salidas ya la lista y la tablet pide la pieza (selector existente).
-- Las 4 matrices quedan activa=false (0 producción, 0 pasos después). Los intermedios pierden la letra:
-- Z47-M505D -> Z47-M505, etc. (mismo id: inventario/BOM/rutas no cambian).
-- Costo: las 5 matrices tenían tiempo_historico 14,7 y cuenta_mo=true -> costo idéntico.
begin;
update "GP2".ruta_paso set matriz_id = 171 where matriz_id in (175, 215, 176, 383);
update "GP2".matriz set descripcion = 'Armado Inox' where id = 171;
update "GP2".matriz set activa = false where id in (175, 215, 176, 383);
update "GP2".componente set codigo = 'Z44-M505', descripcion = 'Cucharon Inox tras M505' where id = 955;
update "GP2".componente set codigo = 'Z47-M505', descripcion = 'Cuchara Inox tras M505' where id = 953;
update "GP2".componente set descripcion = 'Cuchara Fideos Inox tras M505' where id = 957;
update "GP2".componente set codigo = 'Z49-M505', descripcion = 'Espátula Calada Inox tras M505' where id = 959;
update "GP2".componente set codigo = 'Z50-M505', descripcion = 'Espumadera Inox tras M505' where id = 961;
commit;

-- ROLLBACK
-- begin;
-- update "GP2".ruta_paso set matriz_id = 175 where id in (3324, 4251, 4255);
-- update "GP2".ruta_paso set matriz_id = 215 where id in (3312, 4224, 4228);
-- update "GP2".ruta_paso set matriz_id = 176 where id in (3309, 4215, 4219);
-- update "GP2".ruta_paso set matriz_id = 383 where id in (3318, 4242, 4246);
-- update "GP2".matriz set descripcion = 'Armado Cuchara Fideos Inox Imp' where id = 171;
-- update "GP2".matriz set activa = true where id in (175, 215, 176, 383);
-- update "GP2".componente set codigo = 'Z44-M505C', descripcion = 'Cucharon Inox tras M505C' where id = 955;
-- update "GP2".componente set codigo = 'Z47-M505D', descripcion = 'Cuchara Inox tras M505D' where id = 953;
-- update "GP2".componente set codigo = 'Z49-M505F', descripcion = 'Espátula Calada Inox tras M505F' where id = 959;
-- update "GP2".componente set codigo = 'Z50-M505B', descripcion = 'Espumadera Inox tras M505B' where id = 961;
-- commit;
