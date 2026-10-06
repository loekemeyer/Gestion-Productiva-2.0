-- 2026-10-06 — Aletas del sacacorcho doble aleta (523 LOEKE / 723 CHEF): el corte M116 entrega a los CRUDOS L9 / L10 y el
-- doblado M114 entrega «SC tras matriz» (L9-M114 / L10-M114).
-- [usuario] "Después de Corte de Aleta van a los sectores crudos L9 (Aleta Izq s/Doblar y s/Estampar), L10 (Aleta Der
--   s/Doblar y s/Estampar). Ahora lo que expulsa el doblado sería SC tras Matriz."
--
-- Antes (CONOCIMIENTO §4gt, 29/09):  IC2 → M116 → IC2-M116-I → M114 → IC2-M114-I → M221 → D3   (rutas 210/211, izq)
--                                    IC2 → M116 → IC2-M116-D → M114 → IC2-M114-D → M221 → D2   (rutas 212/213, der)
-- Después:                           IC2 → M116 → L9  (Crudo) → M114 → L9-M114  (Movimiento) → M221 → D3
--                                    IC2 → M116 → L10 (Crudo) → M114 → L10-M114 (Movimiento) → M221 → D2
--
-- SIN DELETE y SIN tocar ruta_paso: los 4 intermedios existentes se REUTILIZAN (conservan id) y los pasos ya apuntaban a esos ids.
--   945 IC2-M116-I → L9        (sector 3 → 1 Crudo; su inventario pasa de la ubicación 3 a la 1)
--   947 IC2-M116-D → L10       (idem)
--   946 IC2-M114-I → L9-M114   (sigue en Sector Movimiento)
--   948 IC2-M114-D → L10-M114  (idem)
-- Convención «tras matriz» [usuario 29/09]: código <raíz>-M<matriz>, descripción <desc. raíz> tras M<matriz>; la raíz ahora es el
-- crudo. Queda «Aleta Izq s/Doblar y s/Estampar tras M114», que lee raro (ya está doblada) pero es la convención, literal.
-- Las 4 filas tenían stock 0 y 0 referencias fuera de ruta_paso/inventario (movimiento, recetas, BOM, precios, OC: todo 0).
--
-- ⚠ PENDIENTE DEL DUEÑO: L9 y L10 nacen SIN kg_x_uni y SIN uni_x_cajon. Los otros 77 crudos tienen los dos; no se inventaron
--   (no se tomaron de la base vieja: su SC_Kg del 10/08 las tiene como LF9/LF11 con otros nombres, Regla 0). Sin cajón no hay
--   máximo por cajones ni derivado. El costo NO cambia: sin kg en la cadena el material cae a 1/ppk de la M116 (37,8 u/kg).
--
-- MEDIDO (ensayo revertido y luego aplicado): v_costo_componente 835 filas, 0 costos distintos contra la foto previa
--   zz_backups."GP2_Snap_costo_20261006_m116" (total 537.420,79; 523 3.001,16 · 723 2.958,32 · D2 114,65 · D3 114,99);
--   inventario del resto idéntico (md5); faltantes/oc/programa/tablet/despiece_verif/valorizacion/stock_sector(1) corren sin
--   error (L9 aparece en todos menos oc_bundle: no tiene máximo). Invariantes B/I/K/L/U/W/Y/AA/AB/AJ = 0, 0 huérfanos.
-- EFECTO OPERATIVO: registrar la M116 vuelve a pedir la pieza (L9 izq / L10 der) y el stock del corte queda en Sector Crudo;
--   el doblado M114 lo consume de ahí y entrega L9-M114 / L10-M114.
begin;

update "GP2".componente set codigo='L9',  descripcion='Aleta Izq s/Doblar y s/Estampar', sector_id=1 where id=945 and codigo='IC2-M116-I';
update "GP2".componente set codigo='L10', descripcion='Aleta Der s/Doblar y s/Estampar', sector_id=1 where id=947 and codigo='IC2-M116-D';
update "GP2".componente set codigo='L9-M114',  descripcion='Aleta Izq s/Doblar y s/Estampar tras M114' where id=946 and codigo='IC2-M114-I';
update "GP2".componente set codigo='L10-M114', descripcion='Aleta Der s/Doblar y s/Estampar tras M114' where id=948 and codigo='IC2-M114-D';
update "GP2".inventario set ubicacion_id=1 where componente_id in (945,947) and ubicacion_id=3 and cantidad=0;

commit;

-- VERIFICACION (todo aplicado y medido el 2026-10-06):
-- select p.ruta_id, p.orden, ce.codigo ent, cs.codigo sal from "GP2".ruta_paso p
--   left join "GP2".componente ce on ce.id=p.comp_entrada_id left join "GP2".componente cs on cs.id=p.comp_salida_id
--  where p.ruta_id in (210,211,212,213) and p.orden between 2 and 4 order by 1,2;
-- select c.codigo, s.nombre, (select string_agg('ubic '||ubicacion_id||' cant '||cantidad, ',') from "GP2".inventario i where i.componente_id=c.id)
--   from "GP2".componente c join "GP2".sector s on s.id=c.sector_id where c.id in (945,946,947,948) order by c.id;

-- REVERSA (solo UPDATE, sin DELETE):
-- update "GP2".inventario set ubicacion_id=3 where componente_id in (945,947) and ubicacion_id=1 and cantidad=0;
-- update "GP2".componente set codigo='IC2-M116-I', descripcion='Fleje N° 92 tras M116 (Izq)', sector_id=3 where id=945;
-- update "GP2".componente set codigo='IC2-M116-D', descripcion='Fleje N° 92 tras M116 (Der)', sector_id=3 where id=947;
-- update "GP2".componente set codigo='IC2-M114-I', descripcion='Fleje N° 92 tras M114 (Izq)' where id=946;
-- update "GP2".componente set codigo='IC2-M114-D', descripcion='Fleje N° 92 tras M114 (Der)' where id=948;
