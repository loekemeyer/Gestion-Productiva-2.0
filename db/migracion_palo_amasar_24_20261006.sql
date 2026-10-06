-- Palo de Amasar 231 / 232 / 233: 24 unidades por caja (2026-10-06)
-- [Elías 06/10/2026, con la captura del catálogo web de LK]: "usa las unix caja de la pagina para los palos de amasar".
-- La página dice UxB 24 en 231 (30 cm), 232 (40 cm) y 233 (50 cm), y 12 en 234 (Francés 40 cm).
-- GP2 los tenía en 12 (CONOCIMIENTO §4as los había creado con 24 el 10/09); el 234 ya estaba bien y no se toca.
-- APLICADA el 06/10 (sin tabla lateral: GP2.uni_x_articulo_x_caja no tiene filas de estos códigos).

update "GP2".articulo
   set articulos_por_caja = 24
 where codigo in ('231','232','233')
   and articulos_por_caja = 12;

-- verificación (debe dar 24, 24, 24, 12):
-- select codigo, descripcion, articulos_por_caja from "GP2".articulo where codigo in ('231','232','233','234') order by codigo;

-- REVERTIR:
-- update "GP2".articulo set articulos_por_caja = 12 where codigo in ('231','232','233') and articulos_por_caja = 24;
