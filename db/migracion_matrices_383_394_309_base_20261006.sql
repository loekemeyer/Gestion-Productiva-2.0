-- 2026-10-06 — 383B/C/D, 394C, 309B y S/N vuelven a su matriz base (regla §4is: la letra es la base que expulsa otra pieza).
-- [usuario, sin identificar, textual] "Las siguientes matrices no tienen que estar en despieces: 383B 383C 383D. En realidad
-- en los despieces tiene que estar la matriz 383 y poder expulsar cualquiera de los 3 palos de amasar" · "394C tampoco tendría
-- que estar en el despiece, sería la matriz 394 que puede expulsar el componente de la matriz 394C" · ídem 309B -> 309.
-- Revierte en GP2 db/migracion_matrices_383bcd_palo_amasar_20261006.sql (Elías). public."Matrices" NO se toca.
-- APLICADO el 2026-10-06. Costo idéntico: huella v_costo_componente ef25071c…, total 535.101,71 (831 filas) antes y
-- después (todas cuenta_mo=false). 0 producción en 415/416/417/260/331. CONOCIMIENTO §4is (adenda).
-- Se pierde el tiempo propio del Chef: 707 pasa a los 82 s de la 309 (tenía 41) y 858 a los 28 s de la 394 (tenía 15).
begin;
update "GP2".ruta_paso set matriz_id = 386
 where id in (3199,3727,3730, 3202,3733,3736, 3205,3739,3742) and matriz_id in (415,416,417);  -- 231/232/233 -> 383
update "GP2".matriz set activa = false where id in (415,416,417);
update "GP2".matriz set descripcion = 'Env Palo de Amasar' where id = 386;                     -- era «… Frances 40cm»
commit;
begin;
update "GP2".ruta_paso set matriz_id = 394 where id in (1751,2244,4300,4301,4302,4303,4304,4305) and matriz_id = 260;  -- 858 -> 394
update "GP2".matriz set activa = false where id = 260;
update "GP2".matriz set descripcion = 'Env Pala Canelones' where id = 394;                                           -- era «… X 24»
commit;
begin;
update "GP2".ruta_paso set matriz_id = 330 where id in (302,309,1862,1865,2205) and matriz_id = 331;                  -- 707 -> 309
update "GP2".matriz set activa = false where id = 331;
commit;

-- S/N -> 21 [usuario: "Esta matriz eliminala, en el despiece sería la matriz 21 que además de corte buje 501 también corta
-- arandela cuchillitos" · "Que tome el dato de la 21"]. La 21 tiene uni_x_golpe 2 y ppk 188,15 (la S/N tenía 3 y 740,84): la W5
-- entra con golpes x 2 y el Fleje N° 38 se descuenta con 188,15 piezas/kg. Costo idéntico (ef25071c…). APLICADO.
begin;
update "GP2".ruta_paso set matriz_id = 19 where id in (787, 791) and matriz_id = 117;   -- W5 (519/719) -> 21
update "GP2".matriz set activa = false where id = 117;
update "GP2".matriz set descripcion = 'Corte Arandela buje 501 / Arandela Cuchillitos' where id = 19;   -- era «Corte Arandela buje 501»
commit;
-- PENDIENTE (el conector retiene los DELETE): correr en el SQL Editor
-- delete from "GP2".matriz where id = 117;   -- S/N, 0 pasos, 0 producción

-- ROLLBACK
-- begin;
-- update "GP2".ruta_paso set matriz_id = 415 where id in (3199,3727,3730);
-- update "GP2".ruta_paso set matriz_id = 416 where id in (3202,3733,3736);
-- update "GP2".ruta_paso set matriz_id = 417 where id in (3205,3739,3742);
-- update "GP2".matriz set activa = true where id in (415,416,417);
-- update "GP2".matriz set descripcion = 'Env Palo de Amasar Frances 40cm' where id = 386;
-- update "GP2".ruta_paso set matriz_id = 260 where id in (1751,2244,4300,4301,4302,4303,4304,4305);
-- update "GP2".matriz set activa = true where id = 260;
-- update "GP2".matriz set descripcion = 'Env Pala Canelones X 24' where id = 394;
-- update "GP2".ruta_paso set matriz_id = 331 where id in (302,309,1862,1865,2205);
-- update "GP2".matriz set activa = true where id = 331;
-- update "GP2".ruta_paso set matriz_id = 117 where id in (787, 791);   -- solo si la S/N no se borró
-- update "GP2".matriz set activa = true where id = 117;
-- update "GP2".matriz set descripcion = 'Corte Arandela buje 501' where id = 19;
-- commit;
