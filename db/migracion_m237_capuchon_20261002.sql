-- Matriz 237 «Poner Capuchon Mgo Espatula»: el capuchón PA18 y el mango PC10 CONVERGEN en Cervantes en el
-- intermedio PC10-M237, que recibe Fábrica. SOLO 570, 542 y 543 (los que arma Log/Fábrica).
-- [Thomas, 01/10] "Los únicos que le pone Cervantes la matriz de mangos y capuchón es los que entrega Log/Fabr.
-- 570, 542, 543" · [02/10] "Aplica la 237 en esos 3 artículos". CONOCIMIENTO §4id.
-- APLICADO el 2026-10-02. Backup: zz_backups."GP2_Backup_rutas_m237_20261002" (las 6 rutas, 21 pasos).
-- Efecto medido: 570/542/543 +$10,00 c/u (5 s); nada más cambió de costo; máximos sin cambio.
--
-- Rutas resultantes:
--   347/353/806 (Insumo PC10):  insumo PC10 · matriz 237 PC10->PC10-M237 · Fábrica PC10-M237->art · virgilio
--   348/354/807 (Insumo PA18B): insumo PA18B · Hernandez PA18B->PA18 · matriz 237 PA18->PC10-M237 · Fábrica · virgilio
begin;
-- la secuencia estaba atrasada por ids cargados a mano en migracion_rutas_convergencia_e6m194_20261001.sql
select setval('"GP2".ruta_paso_id_seq', (select max(id) from "GP2".ruta_paso));
insert into "GP2".componente (codigo, descripcion, sector_id, unidad_medida, es_pliego, discontinuado, recibe_en_cajas, relev_solo_sueltas)
values ('PC10-M237', 'Mango LK Espatula c/Capuchon tras M237', 3, 'unidad', false, false, false, false);
insert into "GP2".inventario (componente_id, ubicacion_id, cantidad)
select id, 3, 0 from "GP2".componente where codigo = 'PC10-M237';
insert into "GP2".componente_bom (componente_padre_id, componente_hijo_id, cantidad)
select p.id, h.id, 1 from "GP2".componente p, "GP2".componente h
 where p.codigo = 'PC10-M237' and h.codigo in ('PC10', 'PA18');
update "GP2".ruta_paso set orden = orden + 1
 where (ruta_id in (347, 353, 806) and orden >= 2) or (ruta_id in (348, 354, 807) and orden >= 3);
insert into "GP2".ruta_paso (ruta_id, orden, tipo_paso, matriz_id, comp_entrada_id, comp_salida_id, cantidad)
select r.ruta_id, r.orden, 'matriz', (select id from "GP2".matriz where n_matriz = '237'),
       (select id from "GP2".componente where codigo = r.entra),
       (select id from "GP2".componente where codigo = 'PC10-M237'), 1
  from (values (347, 2, 'PC10'), (353, 2, 'PC10'), (806, 2, 'PC10'),
               (348, 3, 'PA18'), (354, 3, 'PA18'), (807, 3, 'PA18')) r(ruta_id, orden, entra);
update "GP2".ruta_paso set comp_entrada_id = (select id from "GP2".componente where codigo = 'PC10-M237')
 where ruta_id in (347, 348, 353, 354, 806, 807) and tipo_paso = 'tallerista';
commit;

-- ROLLBACK (lleva DELETE: correrlo en el SQL editor):
-- begin;
-- delete from "GP2".ruta_paso where ruta_id in (347,348,353,354,806,807) and tipo_paso = 'matriz'
--    and matriz_id = (select id from "GP2".matriz where n_matriz = '237');
-- update "GP2".ruta_paso p set orden = b.orden, comp_entrada_id = b.comp_entrada_id
--   from zz_backups."GP2_Backup_rutas_m237_20261002" b where b.id = p.id;
-- delete from "GP2".componente_bom where componente_padre_id = (select id from "GP2".componente where codigo = 'PC10-M237');
-- delete from "GP2".inventario where componente_id = (select id from "GP2".componente where codigo = 'PC10-M237');
-- delete from "GP2".componente where codigo = 'PC10-M237';
-- commit;
