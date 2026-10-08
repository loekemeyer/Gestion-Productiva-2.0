-- PENDIENTE — NO APLICADO. Anotado el 08/10/2026 [Elías: «anotalas para borrar, pero verificá que todas las funciones de GP2 tengan
-- la función correspondiente en Reg Prod 3.0»]. Tiene DROP: va por el SQL Editor (la herramienta de Claude se cuelga con DROP).
--
-- QUÉ: las 4 funciones de GP2 que sólo llamaba la tablet de operarios vieja (la de Google). Desde el 08/10 (04d7982) la tablet es
-- copia de Registro Producción 3.0 y entra por reg_prod_3_0_* con el código de la TV; ninguna función de la base ni cron las llama.
-- Se borran para que la fórmula del toque no quede en DOS lugares (si alguien corrige la vieja creyendo que está en uso, divergen).
--
-- VERIFICADO el 08/10 (Registro-Produccion-3.0 · sql/verificar_gp2_vs_3_0.sql, transacción deshecha, todo IGUAL):
--   registrar_evento_prod -> reg_prod_3_0_registrar_evento : 7 casos (E, C por golpes x1 y x2, envasado por unidades, con pieza, sin
--                            pieza en matriz de 2 salidas, PB): misma fila, mismo stock, mismo aviso, duplicado no mueve nada.
--   anular_evento_prod    -> reg_prod_3_0_anular_evento    : mismos movimientos devueltos y el stock vuelve igual.
--   rollo_tomar           -> reg_prod_3_0_rollo_tomar      : descuenta 1 rollo, mismo uso abierto, misma respuesta, dup con el mismo id.
--   rollo_cerrar          -> reg_prod_3_0_rollo_cerrar     : mismo uso cerrado y misma respuesta (alerta incluida), dup igual.
--   (registro_operarios_bundle -> reg_prod_3_0_bundle: las 10 secciones iguales. No está entre las 4: es de sólo lectura, pero también
--    quedó sin pantalla y su lógica está DUPLICADA en reg_prod_3_0_bundle: decidir aparte.)
--   tomar_rollo / cerrar_rollo NO se borran: las usa 3.0 por dentro (reg_prod_3_0_gp2_tomar_rollo / _cerrar_rollo).
--
-- ANTES DE CORRERLO, las tres cosas:
--   1) Que nadie haya seguido grabando por la tablet vieja (un celular con la página cacheada): tiene que dar 0.
--        select count(*) from "GP2".produccion where origen_created_at > '2026-10-08 14:38:16+00';   -- el 08/10 a la noche: 0
--   2) Registro-Produccion-3.0 · gp2/Produccion/RegistroApp/ (copia vieja de esta tablet, SIN enlace desde el inicio) todavía las
--      llama: borrar esa carpeta o aceptar que deje de andar.
--   3) En el MISMO commit de GP2: sacar las 4 de PERMITIDAS en tests/ui/test_rpc_huerfanas.js, y regenerar db/funciones_GP2.sql y
--      db/tablas_GP2.sql (rollo_llamadas). Las columnas produccion.movimientos / stock_revertido_at se dejan (tienen historia).

drop function "GP2".registrar_evento_prod(jsonb);
drop function "GP2".anular_evento_prod(text);
drop function "GP2".rollo_tomar(text, text, bigint, numeric, text, timestamp with time zone);
drop function "GP2".rollo_cerrar(text, text, boolean, numeric, timestamp with time zone);
drop table "GP2".rollo_llamadas;   -- sólo la usaban rollo_tomar / rollo_cerrar (0 filas al 08/10)

-- Verificación (tiene que dar 0 y 0):
select (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'GP2' and p.proname in ('registrar_evento_prod', 'anular_evento_prod', 'rollo_tomar', 'rollo_cerrar')) funciones,
       (select count(*) from pg_tables where schemaname = 'GP2' and tablename = 'rollo_llamadas') tabla;
