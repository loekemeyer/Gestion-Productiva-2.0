-- 2026-10-06 — Aletas del sacacorcho doble aleta (523 LOEKE / 723 CHEF): el corte M116 expulsa UN solo componente
-- (IC2-M116) y recién el doblado M114 separa izquierda y derecha.
-- [usuario] "En el corte de Pinza de Fiambre y en el corte de Pinza de Fideos se expulsa el mismo componente. En el caso
--   de las Aletas, quiero que del corte se expulse el mismo componente también: IC2-M116 (no diferenciar entre izq y der).
--   Recién en el doblado separa".
-- Es la forma de las gemelas M60 (IA4-M60) y M64 (IA4-M64): UN corte, DOS salidas desde el doblado/estampado.
--
-- Antes (CONOCIMIENTO §4gt, 29/09):  IC2 → M116 → IC2-M116-I → M114 → IC2-M114-I → M221 → D3   (rutas 210/211, izq)
--                                    IC2 → M116 → IC2-M116-D → M114 → IC2-M114-D → M221 → D2   (rutas 212/213, der)
-- Después:                           IC2 → M116 → IC2-M116   → M114 → IC2-M114-I → M221 → D3
--                                    IC2 → M116 → IC2-M116   → M114 → IC2-M114-D → M221 → D2
-- Se RENOMBRA IC2-M116-I (id 945, conserva id e inventario) en vez de crear uno nuevo; IC2-M116-D (id 947) queda sin
-- ninguna referencia. Solo base (GP2). public no se toca (Regla 0).
--
-- COSTO (medido con ensayo revertido, después aplicado; v_costo_componente, pesos): 523 3.001,16 → 2.918,91 y
--   723 2.958,32 → 2.876,07 (−82,25 c/u). Es SOLO material (US$ 1,207038 → 1,153628); segundos de mano de obra idénticos (16,2).
--   Los otros 832 costos: huella md5 idéntica (02481abd…); IC2-M116-D 91,81 → 0,00 (es el sobrante). D2 y D3 NO cambian.
--   Foto previa: zz_backups."GP2_Snap_costo_20261006_m116" (835 filas, total 537.420,79, huella c2b157de…, con RLS).
-- ⚠ [Probable] ese −82,25 es el sub-costeo de §4cv/§4jd (el motor deduplica la arista IC2→M116 compartida y cuenta UN
--   corte de fleje para las dos aletas): el fleje por aleta sale de ppk 37,8 u/kg (0,0265 kg) y la aleta terminada pesa
--   0,0245 kg, o sea que ppk es POR ALETA y un par necesita dos. Es la misma magnitud que la corrección de fiambre del 31/08
--   (−82,62), que las pinzas 053/055/594/595 ya traen. Es consecuencia del modelo pedido, no un error de esta migración.
--
-- EFECTO OPERATIVO: registrar golpes de la M116 deja de pedir elegir izquierda/derecha (una sola salida, igual que la 60 y la
--   64); el que elige es el doblado M114 (IC2-M114-I / IC2-M114-D). El stock del corte se junta en UN solo IC2-M116.
-- Retira lo de §4gt "izquierda y derecha van SEPARADAS con sufijo -I / -D" para el corte; el doblado M114 sigue separado.
begin;

-- 1) el componente del corte pasa a ser uno solo (Sector Movimiento = 3)
update "GP2".componente set codigo='IC2-M116', descripcion='Fleje N° 92 tras M116' where id=945 and codigo='IC2-M116-I' and sector_id=3;

-- 2) rutas 212 y 213 (aleta derecha → 523 / 723): el corte entrega IC2-M116 y el doblado la recibe de ahí
update "GP2".ruta_paso set comp_salida_id=945  where id in (1254,1260) and comp_salida_id=947;
update "GP2".ruta_paso set comp_entrada_id=945 where id in (1255,1261) and comp_entrada_id=947;

commit;

-- 3) A CORRER UNA VEZ EN EL SQL EDITOR (el conector de la sesión cuelga los DELETE a los 60 s: se probó, no se aplicó):
--    el sobrante IC2-M116-D (id 947, stock 0, sin ninguna referencia salvo su fila de inventario 126384).
-- delete from "GP2".inventario where id=126384 and componente_id=947 and cantidad=0;
-- delete from "GP2".componente where id=947 and codigo='IC2-M116-D';
-- Mientras no se corra: 947 queda inerte (sin ruta, stock 0, costo 0,00) pero visible como "Fleje N° 92 tras M116 (Der)".

-- VERIFICACION (todo aplicado y medido el 2026-10-06): rutas 210-213 pasos 2-4 con IC2→IC2-M116→IC2-M114-{I,D}→{D3,D2};
-- invariantes B/I/K/L/U/W/Y/AA/AB/AJ = 0; 0 pasos con componente inexistente; huérfanos de IC2-M116* = 1 (el 947).
-- select p.ruta_id, p.orden, ce.codigo ent, cs.codigo sal from "GP2".ruta_paso p
--   left join "GP2".componente ce on ce.id=p.comp_entrada_id left join "GP2".componente cs on cs.id=p.comp_salida_id
--  where p.ruta_id in (210,211,212,213) and p.orden between 2 and 4 order by 1,2;

-- REVERSA (sin DELETE si el 947 todavía existe):
-- update "GP2".ruta_paso set comp_salida_id=947  where id in (1254,1260);
-- update "GP2".ruta_paso set comp_entrada_id=947 where id in (1255,1261);
-- update "GP2".componente set codigo='IC2-M116-I', descripcion='Fleje N° 92 tras M116 (Izq)' where id=945;
-- update "GP2".componente set codigo='IC2-M116-D', descripcion='Fleje N° 92 tras M116 (Der)' where id=947;  -- solo si se renombró
-- (si el 947 ya se borró: insert into "GP2".componente(codigo,descripcion,sector_id,unidad_medida) values
--    ('IC2-M116-D','Fleje N° 92 tras M116 (Der)',3,'unidad'); + su fila de inventario ubic 3 = 0 + repuntar los 4 pasos al id nuevo)
