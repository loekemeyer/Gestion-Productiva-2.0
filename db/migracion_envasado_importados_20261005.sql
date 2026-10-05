-- =====================================================================
-- Envasado de 4 importados que manda Virgilio: 522E, 323E, 838E, 599E (2026-10-05)
-- Pedido de Nazareno (05/10, textual en CONOCIMIENTO_GP2.md §4it): Virgilio los importa y Cervantes
-- los envasa. Cada uno es  <pieza importada GRJ> + <caja>  -> matriz de envasado -> <art> terminado.
--
--   522E  GRJ33 «Doble Aleta Premium» + Caja N°2  (A8)  -> matriz 510 «Reenvasado de sacacorcho chino»
--   323E  GRJ31 «Ralladores»          + Caja N°29 (A11) -> matriz 512 «Reenvasado imp rallador»
--   838E  GRJ31 «Ralladores»          + Caja N°29 (A11) -> matriz 512   (es el 323E con otro cartón, Chef)
--   599E  GRJ32 «Pelador Mgo Madera»  + Caja N°1  (A1)  -> matriz 509 «Env Pelador Mgo Madera»
--
-- Cadena normalizada, en el orden de CLAUDE.md (solo ALTAS: no se toca ni se borra nada existente,
-- por eso no hay respaldo previo; las matrices 509/510/512 y GRJ31/32/33 ya existían, sin pasos):
--   1) articulo               (4)  familia/marca de los hermanos; 12 por caja [usuario: «12 en los 4»]
--   2) componente terminado   (4)  sector 12, «<cod> Terminado», uni_x_cajon = articulos_por_caja
--   3) articulo_componente    (8)  receta: GRJ x1 + caja x1/12  (invariante AA: el paso de insumo
--                                  tiene que decir lo mismo que la receta)
--   4) ruta + ruta_paso       (8 rutas x 3 pasos)  molde 507 / 942E: una ruta por entrada,
--                                  insumo -> matriz -> virgilio. Nombre «Insumo <cod> -> Art <art>».
--   5) alias / espejo Virgilio: SIN cambios. GRJ31/32/33 ya tienen su vínculo GV
--      (323ES->GRJ31, 599E/599ES->GRJ32, 522E/522ES->GRJ33) y el resolutor mira sólo esa tabla,
--      nunca componente.codigo: el terminado 599E/522E de GP2 no le pisa el GRJ al aviso de ingreso.
--
-- SIN fila de inventario para el terminado, igual que 942E y otros 118: el stock nace solo por
-- inv_delta (upsert) cuando la tablet registra la producción (ubic art_terminado 3).
-- ⚠ Molde heredado: el paso `matriz` de la CAJA lleva cantidad 1 (no 1/12), igual que los 38
--   hermanos; fabricar_stock descuenta uni x cantidad del paso (ver CONOCIMIENTO §4it, decisión 1).
-- ⚠ matrices 509/512 sin tiempo_historico y las tres con cuenta_mo=true: el costo de los 4 saldrá
--   con faltan_tiempos / MO distinta de las otras 20 matrices de envasado (cuenta_mo=false).
-- Idempotente: se puede volver a correr (cada alta se guarda con un not-exists / select previo).
-- =====================================================================
do $$
declare
  c_apc constant int := 12;                      -- articulos por caja, los 4 [usuario 05/10]
  r record; q record;
  v_art bigint; v_term bigint; v_in bigint; v_caja bigint; v_mat bigint; v_ruta bigint;
  v_sec_caja bigint; v_sec_garage bigint;
begin
  select id into v_sec_caja   from "GP2".sector where nombre = 'Sector Caja';
  select id into v_sec_garage from "GP2".sector where nombre = 'Sector Garage';
  if v_sec_caja is null or v_sec_garage is null then raise exception 'falta Sector Caja / Sector Garage'; end if;

  for r in select * from (values
      ('522E', 'Sacacorcho Doble Aleta Premium', 'Sacacorchos', 'LOEKE', 'GRJ33', 'A8',  '510'),
      ('323E', 'Rallador 4 Lados Mini',          'Ralladores',  'LOEKE', 'GRJ31', 'A11', '512'),
      ('838E', 'Rallador 4 Lados Mini',          'Ralladores',  'CHEF',  'GRJ31', 'A11', '512'),
      ('599E', 'Pelador Mgo Madera',             'Peladores',   'LOEKE', 'GRJ32', 'A1',  '509')
    ) as x(cod, descr, fam, marca, grj, caja, mat) loop

    select id into v_in   from "GP2".componente where codigo = r.grj  and sector_id = v_sec_garage;
    select id into v_caja from "GP2".componente where codigo = r.caja and sector_id = v_sec_caja;
    select id into v_mat  from "GP2".matriz     where n_matriz = r.mat and activa;
    if v_in is null or v_caja is null or v_mat is null then
      raise exception 'falta GRJ % / caja % / matriz %', r.grj, r.caja, r.mat;
    end if;

    -- 1) articulo
    select id into v_art from "GP2".articulo where codigo = r.cod;
    if v_art is null then
      insert into "GP2".articulo (codigo, descripcion, familia, marca, componente_caja_id, articulos_por_caja, discontinuado)
      values (r.cod, r.descr, r.fam, r.marca, v_caja, c_apc, false) returning id into v_art;
    end if;

    -- 2) componente terminado (sector 12), molde 507 / 942E
    select id into v_term from "GP2".componente where codigo = r.cod and sector_id = 12;
    if v_term is null then
      insert into "GP2".componente (codigo, descripcion, sector_id, unidad_medida, uni_x_cajon, recibe_en_cajas)
      values (r.cod, r.cod || ' Terminado', 12, 'unidad', c_apc, false) returning id into v_term;
    end if;

    -- 3) receta: la pieza importada x1 y la caja x1/12
    insert into "GP2".articulo_componente (articulo_id, componente_id, cantidad)
    select v_art, v_in, 1 where not exists
      (select 1 from "GP2".articulo_componente where articulo_id = v_art and componente_id = v_in);
    insert into "GP2".articulo_componente (articulo_id, componente_id, cantidad)
    select v_art, v_caja, 1::numeric / c_apc where not exists
      (select 1 from "GP2".articulo_componente where articulo_id = v_art and componente_id = v_caja);

    -- 4) una ruta por entrada: insumo -> matriz -> virgilio
    for q in select * from (values (v_in, 1::numeric, r.grj), (v_caja, 1::numeric / c_apc, r.caja)) as y(comp, qty, cod) loop
      select id into v_ruta from "GP2".ruta
       where articulo_id = v_art and nombre = 'Insumo ' || q.cod || ' -> Art ' || r.cod;
      if v_ruta is null then
        insert into "GP2".ruta (nombre, articulo_id)
        values ('Insumo ' || q.cod || ' -> Art ' || r.cod, v_art) returning id into v_ruta;
        insert into "GP2".ruta_paso (ruta_id, orden, tipo_paso, comp_entrada_id, comp_salida_id, cantidad)
        values (v_ruta, 1, 'insumo', q.comp, q.comp, q.qty);
        insert into "GP2".ruta_paso (ruta_id, orden, tipo_paso, matriz_id, comp_entrada_id, comp_salida_id, cantidad)
        values (v_ruta, 2, 'matriz', v_mat, q.comp, v_term, 1);
        insert into "GP2".ruta_paso (ruta_id, orden, tipo_paso, comp_entrada_id, cantidad)
        values (v_ruta, 3, 'virgilio', v_term, 1);
      end if;
    end loop;
  end loop;
end $$;
