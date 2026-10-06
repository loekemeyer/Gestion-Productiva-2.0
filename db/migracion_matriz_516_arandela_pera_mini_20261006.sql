-- 2026-10-06 — Matriz 516 «Corte Arandela Batidor Pera Mini»: la ABPM deja de salir de la 137.
-- [usuario, Nazareno] "La Matriz 137 expulsa la arandela batidor pera y arandela batidor pera mini. Está mal, la
-- arandela batidor pera mini la corta una matriz que no está creada: Sería Corte Arandela Batidor Pera Mini, el
-- número ponele el que sigue a la última sin letra".
--
-- Antes: la 137 «Cortar arandela Batidor» (id 67) expulsaba DOS componentes desde el fleje 58 (IF9):
--   LL7B «Arandela Batidor Pera»      <- ruta_paso 1010 (art 115), 998 (art 544), 1004 (art 802)
--   ABPM «Arandela Batidor Pera Mini» <- ruta_paso 992  (art 580 Batidor Mini, ruta 164)
-- Ahora: la 137 queda sólo con LL7B (3 pasos) y la ABPM sale de la 516 (id nuevo, 1 paso: el 992).
--
-- Número: 516 = el siguiente a la 515 (última de la serie principal, creada el 05/10). La 900-906 es otra familia
-- («p.p. Ajo») y en public."Matrices" la planta llega a la 514, así que 516 no se pisa con nada. Si se quería la 907:
--   update "GP2".matriz set n_matriz = '907' where n_matriz = '516';
--
-- Atributos COPIADOS de la 137 (tipo A, alimentador, 0,73 s/uni, 391,32 partes por kg de fleje, 1 por golpe,
-- cuenta_mo): el costo queda EXACTO (la ABPM ya cobraba esos valores a través de la 137). NO son medidos para la
-- arandela mini: el 0,73 sale de 5 registros de la 137 que en public.Matrices figura como «Cortar arandela Batidor
-- mini» (6 registros, 62.200 uni, 06/05 a 18/06/2026), así que puede ser el tiempo de CUALQUIERA de las dos. A medir
-- cuando la 516 tenga producción propia.
--
-- Medido antes: huella de v_costo_componente d3755dcef914e779285ec2e2100bcd09 (831 filas, total 535.101,71) =
-- zz_backups."GP2_Snap_costo_20261006_m137" (con RLS). GP2.produccion tenía 0 registros de la 137; la 137 no es
-- línea imaginaria de nadie (articulo_linea_tallerista 0 filas).
--
-- public."Matrices" NO se toca (casa del vecino, Regla 0): la 516 no existe ahí, así que el Registro Producción 2.0
-- no la ofrece hasta que se cargue allá (decisión del dueño, como la 383B/C/D). La tablet de GP2 sí la ve.
-- Existe una 177 «Corte Arandela Batidor Mini» (id 237, GP2 y public) sin pasos, sin tiempo y sin producción: podría
-- ser esta misma matriz con otro nombre. Decisión pendiente del dueño: no se tocó.
-- APLICADA el 2026-10-06. Hecho-por: Nazareno Rodríguez (employee_id 27).

with nueva as (
  insert into "GP2".matriz (n_matriz, descripcion, tipo, partes_por_kilo_de_fleje, tiempo_historico, uni_x_golpe, tiempo_unidad, maquina, activa, carga_en, cuenta_mo)
  select '516', 'Corte Arandela Batidor Pera Mini', tipo, partes_por_kilo_de_fleje, tiempo_historico, uni_x_golpe, tiempo_unidad, maquina, true, carga_en, cuenta_mo
    from "GP2".matriz where id = 67 and n_matriz = '137'
  returning id)
update "GP2".ruta_paso set matriz_id = (select id from nueva)
 where id = 992 and matriz_id = 67 and comp_salida_id = 1                  -- ABPM
returning id, ruta_id, matriz_id;                                          -- 1 fila

-- verificación: 137 -> LL7B x3 · 516 -> ABPM x1, y el costo idéntico al snapshot
-- select m.n_matriz, m.descripcion, count(*) pasos, string_agg(distinct cs.codigo, ',') sale
--   from "GP2".matriz m join "GP2".ruta_paso rp on rp.matriz_id = m.id join "GP2".componente cs on cs.id = rp.comp_salida_id
--  where m.n_matriz in ('137','516') group by 1, 2 order by 1;

-- ROLLBACK (devuelve el paso a la 137 y borra la 516; sólo si todavía no tiene producción)
-- update "GP2".ruta_paso set matriz_id = 67 where id = 992;
-- delete from "GP2".matriz where n_matriz = '516' and not exists (select 1 from "GP2".produccion p where p.matriz_id = "GP2".matriz.id);
