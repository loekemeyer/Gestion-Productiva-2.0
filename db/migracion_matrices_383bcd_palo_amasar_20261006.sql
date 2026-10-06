-- ⛔ REVERTIDA EN GP2 el 2026-10-06 por db/migracion_matrices_383_394_309_base_20261006.sql (CONOCIMIENTO §4is adenda):
--    los 9 pasos volvieron a la 383 «Env Palo de Amasar» y 383B/C/D quedaron activa=false. public."Matrices" no se tocó.
-- Matrices variantes del Palo de Amasar: 383B, 383C y 383D (2026-10-06)
-- [Elías 06/10/2026, textual] "hace matrices variantes de los restantes (B,C,...). el 383 actualmente es del palo de
-- amasar frances". Antes la 383 «Env Palo de Amasar» (id 386) cerraba los 4 palos y el operario no registraba cuál:
-- la verificación de cajones no sabía si eran cajas de 12 (Francés) o de 24. Ahora cada medida tiene su matriz.
--
--   383  (id 386) = Palo de Amasar Francés 40 cm  (art 234, 12 x caja)  -- queda con sus 3 pasos, sin tocar
--   383B (id 415) = Palo de Amasar 30 cm          (art 231, 24 x caja)  -- pasos 3199, 3727, 3730
--   383C (id 416) = Palo de Amasar 40 cm          (art 232, 24 x caja)  -- pasos 3202, 3733, 3736
--   383D (id 417) = Palo de Amasar 50 cm          (art 233, 24 x caja)  -- pasos 3205, 3739, 3742
--
-- Atributos copiados de la 383 (30,2 s, cuenta_mo=false, carga en unidades, 1 por golpe): el costo queda EXACTO.
-- Medido: huella de "GP2".v_costo_componente 4fa3bf022e57fa5a25e7733ba8883c7b (831 filas) antes y después.
-- GP2.produccion tenía 0 registros de la 383. public."Matrices" NO se toca (casa del vecino, Regla 0): ahí no existen
-- 383B/C/D, así que el Registro Producción 2.0 no las ofrece hasta que se carguen allá; la tablet de GP2 sí las ve
-- (registro_operarios_bundle lee GP2.matriz). APLICADA el 2026-10-06.
--
-- Contradice en parte §4is (05/10: «la matriz con letra es la base que expulsa un componente más»); lo pidió el dueño.

begin;
with b as (
  insert into "GP2".matriz (n_matriz, descripcion, tipo, partes_por_kilo_de_fleje, tiempo_historico, uni_x_golpe, tiempo_unidad, maquina, activa, carga_en, cuenta_mo)
  select '383B', 'Env Palo de Amasar 30cm', tipo, partes_por_kilo_de_fleje, tiempo_historico, uni_x_golpe, tiempo_unidad, maquina, true, carga_en, cuenta_mo
    from "GP2".matriz where id = 386 returning id),
c as (
  insert into "GP2".matriz (n_matriz, descripcion, tipo, partes_por_kilo_de_fleje, tiempo_historico, uni_x_golpe, tiempo_unidad, maquina, activa, carga_en, cuenta_mo)
  select '383C', 'Env Palo de Amasar 40cm', tipo, partes_por_kilo_de_fleje, tiempo_historico, uni_x_golpe, tiempo_unidad, maquina, true, carga_en, cuenta_mo
    from "GP2".matriz where id = 386 returning id),
d as (
  insert into "GP2".matriz (n_matriz, descripcion, tipo, partes_por_kilo_de_fleje, tiempo_historico, uni_x_golpe, tiempo_unidad, maquina, activa, carga_en, cuenta_mo)
  select '383D', 'Env Palo de Amasar 50cm', tipo, partes_por_kilo_de_fleje, tiempo_historico, uni_x_golpe, tiempo_unidad, maquina, true, carga_en, cuenta_mo
    from "GP2".matriz where id = 386 returning id),
u1 as (update "GP2".ruta_paso set matriz_id = (select id from b) where id in (3199, 3727, 3730) and matriz_id = 386 returning id),
u2 as (update "GP2".ruta_paso set matriz_id = (select id from c) where id in (3202, 3733, 3736) and matriz_id = 386 returning id),
u3 as (update "GP2".ruta_paso set matriz_id = (select id from d) where id in (3205, 3739, 3742) and matriz_id = 386 returning id)
select (select count(*) from u1) p231, (select count(*) from u2) p232, (select count(*) from u3) p233;   -- 3, 3, 3
commit;

-- verificación: 383 -> 234 [12] · 383B -> 231 [24] · 383C -> 232 [24] · 383D -> 233 [24], 3 pasos cada una
-- select m.n_matriz, count(*) pasos, string_agg(distinct a.codigo || ' [' || a.articulos_por_caja || ']', ' ; ') arts
--   from "GP2".matriz m join "GP2".ruta_paso rp on rp.matriz_id = m.id join "GP2".ruta r on r.id = rp.ruta_id
--   join "GP2".articulo a on a.id = r.articulo_id where m.n_matriz like '383%' group by m.n_matriz order by 1;

-- ROLLBACK (devuelve los 9 pasos a la 383 y borra las tres matrices; sólo si todavía no tienen producción)
-- begin;
-- update "GP2".ruta_paso set matriz_id = 386 where id in (3199, 3727, 3730, 3202, 3733, 3736, 3205, 3739, 3742);
-- delete from "GP2".matriz where id in (415, 416, 417);
-- commit;

-- RENOMBRE (2026-10-06, Elías: "383 tiene que decir frances"): la 383 pasa de «Env Palo de Amasar» a
-- «Env Palo de Amasar Frances 40cm», para no confundirla con la 383C «Env Palo de Amasar 40cm». APLICADO.
-- update "GP2".matriz set descripcion = 'Env Palo de Amasar Frances 40cm' where n_matriz = '383' and descripcion = 'Env Palo de Amasar';
-- ROLLBACK del renombre:
-- update "GP2".matriz set descripcion = 'Env Palo de Amasar' where n_matriz = '383' and descripcion = 'Env Palo de Amasar Frances 40cm';
