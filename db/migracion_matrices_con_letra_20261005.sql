-- 2026-10-05 — Matriz con letra = la matriz BASE que expulsa un componente más (lógica de la 505, §4in).
-- [usuario, sin identificar] "Quiero que saques de los despieces las matrices que tienen una letra.
-- Observá como funciona la matriz 505 y esa es la lógica que quiero que uses. Ejemplo: Matriz 12B
-- desaparece porque en realidad es la matriz 12 que se le suma un componente más que expulsa que sería
-- el G13 · Mgo Plano 501 Dobl p/Pintar". CONOCIMIENTO §4is.
-- Cómo: los pasos de la letra pasan a la base (mismas entradas y salidas); la letra queda activa=false
-- con 0 pasos. La tablet de operarios ya pide la pieza (matriz_salidas): sin cambio de código.
-- APLICADO el 2026-10-05. Costo idéntico: huella v_costo_componente 588e8801…, total 534.957,43
-- antes y después (12/12B 6,5 s las dos; 254/254B cuenta_mo=false las dos). 0 producción en 10 y 318.
begin;
update "GP2".ruta_paso set matriz_id = 9   where matriz_id = 10;   -- 12B -> 12  (pasos 3, 10: G11 -> G13, arts 101/501)
update "GP2".ruta_paso set matriz_id = 317 where matriz_id = 318;  -- 254B -> 254 (pasos 641, 877, 1755, 3270, 3273, 3276: -> 858-ARM)
update "GP2".matriz set activa = false where id in (10, 318);
commit;

-- NO APLICADO (espera al dueño, §4is): la letra tiene otro tiempo o cuenta_mo que la base.
--   237B (id 413, sin tiempo, cuenta_mo=false) -> 237 (id 143, 5 s, cuenta_mo=true): +5 s de MO en 720/722/858.
--   309B (id 331, 41 s) -> 309 (id 330, 82 s) · 394C (id 260, 15 s) -> 394 (id 394, 28 s).
--   S/N (id 117): no tiene base.

-- ROLLBACK
-- begin;
-- update "GP2".ruta_paso set matriz_id = 10  where id in (3, 10);
-- update "GP2".ruta_paso set matriz_id = 318 where id in (641, 877, 1755, 3270, 3273, 3276);
-- update "GP2".matriz set activa = true where id in (10, 318);
-- commit;
