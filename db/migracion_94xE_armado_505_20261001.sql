-- =====================================================================
-- 94xE: despiece de armado en matriz 505* + baja de 941E/946E + GRJ33 (2026-10-01)
-- Pedido del usuario (01/10, textual en CONOCIMIENTO_GP2.md §4ia).
--
--  1) PEST1 pasa a llamarse «Insertos Sonrisa».
--  2) 941E y 946E se BORRAN (articulo, receta, rutas y su componente terminado). Sin stock,
--     sin movimientos, sin producción (medido). Sus matrices 505E / 505G quedan activa=false.
--     ⚠ El bloque de DELETE (al final) NO se aplicó el 01/10: el MCP de Supabase retiene los
--     DELETE esperando confirmación del dueño. Mientras tanto quedaron discontinuado = true.
--     NO se toca GP2.articulo_familia (es espejo de public."Equivalencias_Familia" de GV,
--     invariante AG) ni GP2.est_madre (copia de la proyección de GV).
--  3) Cinco piezas importadas nuevas (sector Procesado, proveedor Importado, estado
--     'importado' => salen solas en Tablet → Recibir → Virgilio):
--        Z47 Cuchara Inox · Z44 Cucharon Inox · Z48 Cuchara Fideos Inox ·
--        Z49 Espátula Calada Inox · Z50 Espumadera Inox
--     + el Mango de Madera. ⚠ El usuario dijo «Z43», pero Z43 YA ES «Varilla c/Cuchilla
--     Negro» (Abrelatas 101, receta + 4 pasos de ruta). No se pisa: nació MGOMAD y el 01/10 el usuario fijó Z46 (D1)
--     (provisorio, mismo criterio que CART058) hasta que el usuario diga el código.
--  4) Despiece de 942E/943E/944E/945E/948E, molde del 507 (varias entradas → matriz →
--     intermedio «<pieza>-M<matriz>» en Sector Movimiento → Fábrica arma con la caja → Virgilio):
--        PEST1 + pieza inox + Z46 (mango) → matriz 505D/505C/505/505F/505B → <pieza>-M505x
--        → Fábrica (tallerista 3) → 9xxE → Virgilio.   La ruta de la caja A9B no se toca.
--  5) GRJ33 «Doble Aleta Premium», importado, se recibe de Virgilio (Sector Garage, igual
--     que GRJ31/GRJ32), con su vínculo GV 522E / 522ES.
--  6) Vínculo GV → GP2 de las partes (GP2.importado_virgilio_componente): 942P→Z47,
--     943P→Z44, 944P→Z48, 945P→Z49, 948P→Z50 [deducido: public."Importados_Stock_Parte"
--     dice que la parte de 942E es 942P y su nombre es «Parte Cuchara Ac. Inox»].
--
-- La ruta de PEST1 se reescribe EN EL LUGAR (update de sus pasos), sin borrarla.
-- Idempotente: se puede volver a correr. Respaldo previo en zz_backups.*_20261001_94xe.
-- =====================================================================

-- ---------- 0) respaldo ----------
create table if not exists zz_backups."GP2_bkp_articulo_20261001_94xe" as
  select * from "GP2".articulo where codigo in ('941E','942E','943E','944E','945E','946E','948E');
create table if not exists zz_backups."GP2_bkp_articulo_componente_20261001_94xe" as
  select ac.* from "GP2".articulo_componente ac join "GP2".articulo a on a.id = ac.articulo_id
   where a.codigo in ('941E','942E','943E','944E','945E','946E','948E');
create table if not exists zz_backups."GP2_bkp_ruta_20261001_94xe" as
  select r.* from "GP2".ruta r join "GP2".articulo a on a.id = r.articulo_id
   where a.codigo in ('941E','942E','943E','944E','945E','946E','948E');
create table if not exists zz_backups."GP2_bkp_ruta_paso_20261001_94xe" as
  select rp.* from "GP2".ruta_paso rp join "GP2".ruta r on r.id = rp.ruta_id join "GP2".articulo a on a.id = r.articulo_id
   where a.codigo in ('941E','942E','943E','944E','945E','946E','948E');
create table if not exists zz_backups."GP2_bkp_componente_20261001_94xe" as
  select * from "GP2".componente where codigo in ('941E','946E','PEST1') and sector_id in (6,12);
create table if not exists zz_backups."GP2_bkp_matriz_20261001_94xe" as
  select * from "GP2".matriz where n_matriz ~ '^505';
do $$ declare t text; begin
  foreach t in array array['GP2_bkp_articulo_20261001_94xe','GP2_bkp_articulo_componente_20261001_94xe',
    'GP2_bkp_ruta_20261001_94xe','GP2_bkp_ruta_paso_20261001_94xe','GP2_bkp_componente_20261001_94xe',
    'GP2_bkp_matriz_20261001_94xe'] loop
    execute format('alter table zz_backups.%I enable row level security', t);
    execute format('revoke insert, update, delete, truncate on zz_backups.%I from anon, authenticated', t);
  end loop;
end $$;


-- ---------- 1..5) aplicado el 2026-10-01 (sin DELETE) ----------
do $$
declare
  v_fab constant bigint := 3;            -- tallerista Fábrica
  r record; v_art bigint; v_term bigint; v_mat bigint; v_pieza bigint; v_inter bigint; v_ruta bigint;
  v_mgo bigint; v_pest bigint; v_ent bigint; v_grj bigint;
begin
  update "GP2".componente set descripcion = 'Insertos Sonrisa' where codigo = 'PEST1' and sector_id = 6;
  select id into v_pest from "GP2".componente where codigo = 'PEST1' and sector_id = 6;
  update "GP2".matriz set activa = false where n_matriz in ('505E','505G');
  update "GP2".articulo set discontinuado = true where codigo in ('941E','946E');
  update "GP2".componente set discontinuado = true where codigo in ('941E','946E') and sector_id = 12;

  select id into v_mgo from "GP2".componente where codigo in ('Z46','MGOMAD') and sector_id = 2;
  if v_mgo is null then
    insert into "GP2".componente (codigo, descripcion, sector_id, unidad_medida, proveedor, estado_compra, remito_unidad, recibe_en_cajas)
    values ('Z46', 'Mgo Madera', 2, 'unidad', 'Importado', 'importado', 'uni', false) returning id into v_mgo;
  end if;
  insert into "GP2".inventario (componente_id, ubicacion_id, cantidad) values (v_mgo, 2, 0) on conflict (componente_id, ubicacion_id) do nothing;

  for r in select * from (values
      ('942E','Z47','Cuchara Inox',         '505D','Armado Cuchara Inox Imp',          '942P'),
      ('943E','Z44','Cucharon Inox',        '505C','Armado Cucharon Inox Imp',         '943P'),
      ('944E','Z48','Cuchara Fideos Inox',  '505', 'Armado Cuchara Fideos Inox Imp',   '944P'),
      ('945E','Z49','Espátula Calada Inox', '505F','Armado Espátula Calada Inox Imp',  '945P'),
      ('948E','Z50','Espumadera Inox',      '505B','Armado Espumadera Inox Imp',       '948P')
    ) as x(art, pieza, pdesc, mat, mdesc, gv) loop
    select id into v_art from "GP2".articulo where codigo = r.art;
    select id into v_term from "GP2".componente where codigo = r.art and sector_id = 12;
    select id into v_mat from "GP2".matriz where n_matriz = r.mat;
    if v_art is null or v_term is null or v_mat is null then raise exception 'falta % / %', r.art, r.mat; end if;
    update "GP2".matriz set descripcion = r.mdesc, activa = true where id = v_mat;

    select id into v_pieza from "GP2".componente where codigo = r.pieza and sector_id = 2;
    if v_pieza is null then
      insert into "GP2".componente (codigo, descripcion, sector_id, unidad_medida, proveedor, estado_compra, remito_unidad, recibe_en_cajas)
      values (r.pieza, r.pdesc, 2, 'unidad', 'Importado', 'importado', 'uni', false) returning id into v_pieza;
    elsif (select estado_compra from "GP2".componente where id = v_pieza) is distinct from 'importado' then
      raise exception 'el código % ya existe en Procesado y no es la pieza importada', r.pieza;
    end if;
    insert into "GP2".inventario (componente_id, ubicacion_id, cantidad) values (v_pieza, 2, 0) on conflict (componente_id, ubicacion_id) do nothing;
    insert into "GP2".importado_virgilio_componente (cod_virgilio, componente_id, nota, creado_por)
    values (r.gv, v_pieza, 'Parte ' || r.pdesc || ' (GV ' || r.gv || ') -> ' || r.pieza || ' [deducido 01/10: Importados_Stock_Parte ' || r.art || ' -> ' || r.gv || ']', 'claude 2026-10-01')
      on conflict (cod_virgilio) do nothing;

    -- intermedio tras la matriz (molde D5-M78 / E6-M194): Sector Movimiento + Tallerista Fábrica
    select id into v_inter from "GP2".componente where codigo = r.pieza || '-M' || r.mat and sector_id = 3;
    if v_inter is null then
      insert into "GP2".componente (codigo, descripcion, sector_id, unidad_medida)
      values (r.pieza || '-M' || r.mat, r.pdesc || ' tras M' || r.mat, 3, 'unidad') returning id into v_inter;
    end if;
    insert into "GP2".inventario (componente_id, ubicacion_id, cantidad) values (v_inter, 3, 0), (v_inter, 23, 0) on conflict (componente_id, ubicacion_id) do nothing;

    -- receta: PEST1 (ya estaba) + pieza + mango, ×1. La caja A9B ya estaba.
    insert into "GP2".articulo_componente (articulo_id, componente_id, cantidad)
      select v_art, c, 1 from unnest(array[v_pest, v_pieza, v_mgo]) c
       where not exists (select 1 from "GP2".articulo_componente ac where ac.articulo_id = v_art and ac.componente_id = c);

    -- ruta de PEST1: insumo → matriz → Fábrica → Virgilio, reescrita en el lugar
    select id into v_ruta from "GP2".ruta where articulo_id = v_art and nombre = 'Insumo PEST1 -> Art ' || r.art;
    if v_ruta is not null and not exists (select 1 from "GP2".ruta_paso where ruta_id = v_ruta and tipo_paso = 'matriz') then
      update "GP2".ruta_paso set orden = orden + 10 where ruta_id = v_ruta and orden in (2,3);
      update "GP2".ruta_paso set orden = 2, tipo_paso = 'matriz', matriz_id = v_mat, tallerista_id = null,
             comp_entrada_id = v_pest, comp_salida_id = v_inter, cantidad = 1 where ruta_id = v_ruta and orden = 12;
      update "GP2".ruta_paso set orden = 3, tipo_paso = 'tallerista', matriz_id = null, tallerista_id = v_fab,
             comp_entrada_id = v_inter, comp_salida_id = v_term, cantidad = 1 where ruta_id = v_ruta and orden = 13;
      insert into "GP2".ruta_paso (ruta_id, orden, tipo_paso, comp_entrada_id, cantidad) values (v_ruta, 4, 'virgilio', v_term, 1);
    end if;

    foreach v_ent in array array[v_pieza, v_mgo] loop
      if not exists (select 1 from "GP2".ruta rr where rr.articulo_id = v_art
                       and rr.nombre = 'Insumo ' || (select codigo from "GP2".componente where id = v_ent) || ' -> Art ' || r.art) then
        insert into "GP2".ruta (nombre, articulo_id)
        values ('Insumo ' || (select codigo from "GP2".componente where id = v_ent) || ' -> Art ' || r.art, v_art) returning id into v_ruta;
        insert into "GP2".ruta_paso (ruta_id, orden, tipo_paso, matriz_id, tallerista_id, comp_entrada_id, comp_salida_id, cantidad) values
          (v_ruta, 1, 'insumo',     null,  null,  v_ent,   v_ent,   1),
          (v_ruta, 2, 'matriz',     v_mat, null,  v_ent,   v_inter, 1),
          (v_ruta, 3, 'tallerista', null,  v_fab, v_inter, v_term,  1),
          (v_ruta, 4, 'virgilio',   null,  null,  v_term,  null,    1);
      end if;
    end loop;
  end loop;

  select id into v_grj from "GP2".componente where codigo = 'GRJ33' and sector_id = 9;
  if v_grj is null then
    insert into "GP2".componente (codigo, descripcion, sector_id, unidad_medida, proveedor, estado_compra, remito_unidad, recibe_en_cajas)
    values ('GRJ33', 'Doble Aleta Premium', 9, 'unidad', 'Importado', 'importado', 'uni', false) returning id into v_grj;
  end if;
  insert into "GP2".inventario (componente_id, ubicacion_id, cantidad) values (v_grj, 9, 0) on conflict (componente_id, ubicacion_id) do nothing;
  insert into "GP2".importado_virgilio_componente (cod_virgilio, componente_id, nota, creado_por) values
    ('522E',  v_grj, 'Sac. Doble Aleta Premium -> GRJ33 (molde 599E/599ES -> GRJ32)', 'claude 2026-10-01'),
    ('522ES', v_grj, 'Sac. Doble Aleta Premium Suelto -> GRJ33', 'claude 2026-10-01')
    on conflict (cod_virgilio) do nothing;
end $$;

-- D1 (01/10): MGOMAD -> Z46 (aplicado):
--   update "GP2".componente set codigo = 'Z46' where codigo = 'MGOMAD' and sector_id = 2;
--   update "GP2".ruta set nombre = replace(nombre, 'Insumo MGOMAD ', 'Insumo Z46 ') where nombre like 'Insumo MGOMAD -> %';

-- ---------- 2-bis) borrar 941E y 946E: el dueño dijo SÍ (D2, 01/10) pero el MCP retiene los DELETE.
--            Correr este bloque a mano en el SQL editor de Supabase (descomentado). ----------
-- Medido el 01/10: 0 inventario, 0 movimientos, 0 producción, 0 reparto. Respaldo en zz_backups.
-- NO toca GP2.articulo_familia (941E→338, 946E→335): es espejo de public."Equivalencias_Familia"
-- de Gestión Virgilio y el invariante AG lo vigila; esas dos filas se sacan en GV.
-- delete from "GP2".ruta_paso where ruta_id in (select r.id from "GP2".ruta r join "GP2".articulo a on a.id = r.articulo_id where a.codigo in ('941E','946E'));
-- delete from "GP2".ruta where articulo_id in (select id from "GP2".articulo where codigo in ('941E','946E'));
-- delete from "GP2".articulo_componente where articulo_id in (select id from "GP2".articulo where codigo in ('941E','946E'));
-- delete from "GP2".articulo where codigo in ('941E','946E');
-- delete from "GP2".componente c where c.codigo in ('941E','946E') and c.sector_id = 12
--    and not exists (select 1 from "GP2".inventario i where i.componente_id = c.id)
--    and not exists (select 1 from "GP2".movimiento m where c.id in (m.comp_id, m.comp_transformado_id, m.sustituye_comp_id))
--    and not exists (select 1 from "GP2".ruta_paso p where c.id in (p.comp_entrada_id, p.comp_salida_id));
