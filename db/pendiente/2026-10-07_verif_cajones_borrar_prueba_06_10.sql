-- =====================================================================
-- VERIFICACIÓN DE CAJONES · borrar lo que quedó pendiente de la PRUEBA del 06/10 (2026-10-07)
-- [usuario, Elías 07/10, textual: "y elimina lo que esta para hacer de ⚖ Cajones pendiente de la prueba de ayer"]
--
-- QUÉ ES: el sorteo de las 15:00 del 06/10 (GP2.verif_cajon_dia) y sus 2 cajones (GP2.verif_cajon, ids 29 y 30:
--   matriz 512 «Reenvasado Rallador Impor» de Graciela Santillan, 144 uni, y matriz 80B «Estampa Destapacorona Sin
--   Marca» de Omar Banchur, 880 uni). Ninguno se empezó ni se cargó (empezado_en, terminado_en, resultado y pesos
--   en NULL): no hay stock ni ajuste que deshacer. Por eso el cartel de Alan seguía mostrando esos 2 cajones.
--
-- POR QUÉ NO SE APLICÓ DESDE LA SESIÓN: el conector de Supabase de la sesión frena todo DELETE (60 s sin llegar
--   a la base; mismo caso que db/pendiente/2026-10-06_sacafuente_pizzero_...). Correrlo UNA vez en el SQL Editor.
--
-- LAS CONDICIONES son a propósito: si alguien ya empezó o cargó algo, NO borra nada de eso.
-- =====================================================================
begin;
delete from "GP2".verif_cajon
 where id in (29, 30) and fecha = '2026-10-06'
   and resultado is null and cargado_en is null and peso_bruto_kg is null;
delete from "GP2".verif_cajon_dia
 where fecha = '2026-10-06' and empezado_en is null and terminado_en is null;
-- verificación: cajones y dias tienen que dar 0 y 0
select (select count(*) from "GP2".verif_cajon  where fecha = '2026-10-06') cajones_06_10,
       (select count(*) from "GP2".verif_cajon_dia where fecha = '2026-10-06') dias_06_10;
commit;
