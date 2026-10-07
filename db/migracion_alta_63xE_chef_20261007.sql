-- =====================================================================
-- Alta de 5 gemelos CHEF de los inox importados 94xE (2026-10-07)
-- Pedido textual (CONOCIMIENTO_GP2.md §4jn): «Vamos a modelar los siguientes artículos 63XE, son
-- idénticos a los artículos que te voy a decir, lo único que cambia es que son de marca Chef»
--      633E --> 942E  Cuchara Lisa Ac. Inox
--      630E --> 943E  Cucharon Ac. Inox
--      637E --> 944E  Pinza Fideos Ac. Inox
--      636E --> 945E  Espatula Calada Ac. Inox
--      631E --> 948E  Espumadera Ac. Inox
--
-- Calco del gemelo LOEKE (molde §4bl 735←581 / §4cb 186←099 / §4bj-bis), en el orden de CLAUDE.md:
--   1) articulo               misma familia/caja/uni x caja/descripción; marca CHEF
--   2) componente terminado   sector 12, «<cod> Terminado», uni_x_cajon del gemelo.
--                             SIN fila de inventario, igual que el gemelo (nace por inv_delta al producir)
--   3) articulo_componente    misma receta: PEST1 ×1 + pieza inox ×1 + Z46 ×1 + A9B ×1/12
--   4) ruta + ruta_paso       las 4 rutas del gemelo, paso por paso; sólo cambia el terminado.
--                             Las piezas, PEST1, Z46 y el intermedio <pieza>-M505 son LOS MISMOS
--                             (la parte física es idéntica): convergen en la 505 «Armado Inox» y la
--                             401 «Env Cucharas Inox Imp» envasa en el 63xE en vez del 94xE.
--                             La ruta de la caja del gemelo no tiene nombre: el clon se nombra
--                             «Insumo A9B -> Art 63xE» (convención de la casa).
--   5) alias / espejo Virgilio: SIN cambios (las partes 942P..948P ya apuntan a Z47/Z44/Z48/Z49/Z50).
--   + articulo_linea_tallerista: la misma excepción que el gemelo (línea antes de la 505).
--   + matriz_salida_etiqueta de la 401: «<etiqueta del gemelo> Chef», orden 6..10 (molde 512:
--     323E «Loeke» / 838E «Chef»). Las 5 del gemelo NO se tocan (las dictó el dueño el 07/10).
--
-- NO se toca: GP2.est_madre (copia de la proyección de GV) ni GP2.articulo_familia (espejo de
-- public."Equivalencias_Familia", invariante AG). Precios: el gemelo no tiene ninguno colgado del
-- terminado (precio_tallerista / precio_servicio_pieza / precio_proveedor = 0 filas, medido), así
-- que no hay tarifa que copiar (lección del 760 ← 550, §1): si apareciera una, la migración aborta.
-- Sólo ALTAS: no se modifica ni se borra nada existente → no hace falta respaldo previo.
-- Idempotente: si el artículo ya existe, lo saltea.
-- =====================================================================
do $$
declare
  r record; p record; e record;
  v_gem bigint; v_gem_term bigint; v_art bigint; v_term bigint; v_ruta bigint; v_nom text;
begin
  for r in select * from (values
      ('633E','942E'), ('630E','943E'), ('637E','944E'), ('636E','945E'), ('631E','948E')
    ) as x(nuevo, gemelo) loop
    if exists (select 1 from "GP2".articulo where codigo = r.nuevo) then
      raise notice '% ya existe: se saltea', r.nuevo; continue;
    end if;
    select id into v_gem from "GP2".articulo where codigo = r.gemelo;
    select id into v_gem_term from "GP2".componente where codigo = r.gemelo and sector_id = 12;
    if v_gem is null or v_gem_term is null then raise exception 'falta el gemelo % o su terminado', r.gemelo; end if;
    if exists (select 1 from "GP2".componente where codigo = r.nuevo and sector_id = 12) then
      raise exception 'ya hay un terminado % sin artículo: revisar a mano', r.nuevo;
    end if;
    if exists (select 1 from "GP2".precio_tallerista where componente_id = v_gem_term)
       or exists (select 1 from "GP2".precio_servicio_pieza where componente_id = v_gem_term)
       or exists (select 1 from "GP2".precio_proveedor where componente_id = v_gem_term) then
      raise exception 'el gemelo % tiene precio colgado del terminado: copiarlo antes', r.gemelo;
    end if;

    -- 1) articulo
    insert into "GP2".articulo (codigo, familia, componente_caja_id, articulos_por_caja, discontinuado, descripcion, marca)
      select r.nuevo, a.familia, a.componente_caja_id, a.articulos_por_caja, false, a.descripcion, 'CHEF'
        from "GP2".articulo a where a.id = v_gem
      returning id into v_art;

    -- 2) componente terminado
    insert into "GP2".componente (codigo, descripcion, sector_id, unidad_medida, uni_x_cajon)
      select r.nuevo, r.nuevo || ' Terminado', 12, c.unidad_medida, c.uni_x_cajon
        from "GP2".componente c where c.id = v_gem_term
      returning id into v_term;

    -- 3) receta
    insert into "GP2".articulo_componente (articulo_id, componente_id, cantidad)
      select v_art, ac.componente_id, ac.cantidad from "GP2".articulo_componente ac where ac.articulo_id = v_gem;

    -- 4) rutas, paso por paso; el terminado del gemelo pasa a ser el del 63xE
    for p in select r0.id, r0.nombre from "GP2".ruta r0 where r0.articulo_id = v_gem order by r0.id loop
      v_nom := coalesce(replace(p.nombre, 'Art ' || r.gemelo, 'Art ' || r.nuevo),
                        'Insumo ' || (select c.codigo from "GP2".ruta_paso rp join "GP2".componente c on c.id = rp.comp_entrada_id
                                       where rp.ruta_id = p.id order by rp.orden limit 1) || ' -> Art ' || r.nuevo);
      insert into "GP2".ruta (nombre, articulo_id) values (v_nom, v_art) returning id into v_ruta;
      insert into "GP2".ruta_paso (ruta_id, orden, tipo_paso, matriz_id, proveedor_id, tallerista_id, proveedor_at_id,
                                   comp_entrada_id, comp_salida_id, cantidad)
        select v_ruta, rp.orden, rp.tipo_paso, rp.matriz_id, rp.proveedor_id, rp.tallerista_id, rp.proveedor_at_id,
               case when rp.comp_entrada_id = v_gem_term then v_term else rp.comp_entrada_id end,
               case when rp.comp_salida_id  = v_gem_term then v_term else rp.comp_salida_id  end,
               rp.cantidad
          from "GP2".ruta_paso rp where rp.ruta_id = p.id;
    end loop;

    -- + línea de tallerista (misma excepción que el gemelo)
    insert into "GP2".articulo_linea_tallerista (articulo_id, matriz_id, nota)
      select v_art, l.matriz_id, l.nota || ' [calcado del gemelo ' || r.gemelo || ', 07/10]'
        from "GP2".articulo_linea_tallerista l where l.articulo_id = v_gem;

    -- + etiqueta del selector de pieza en las matrices que expulsan el terminado (la 401)
    for e in select m.matriz_id, m.etiqueta from "GP2".matriz_salida_etiqueta m where m.componente_id = v_gem_term loop
      insert into "GP2".matriz_salida_etiqueta (matriz_id, componente_id, etiqueta, orden)
        values (e.matriz_id, v_term, e.etiqueta || ' Chef',
                (select coalesce(max(orden), 0) + 1 from "GP2".matriz_salida_etiqueta where matriz_id = e.matriz_id));
    end loop;
  end loop;
end $$;

-- ---------- REVERSA (correr a mano si hiciera falta; sin producción ni movimientos de los 63xE) ----------
-- delete from "GP2".matriz_salida_etiqueta where componente_id in (select id from "GP2".componente where sector_id = 12 and codigo in ('630E','631E','633E','636E','637E'));
-- delete from "GP2".articulo_linea_tallerista where articulo_id in (select id from "GP2".articulo where codigo in ('630E','631E','633E','636E','637E'));
-- delete from "GP2".ruta_paso where ruta_id in (select r.id from "GP2".ruta r join "GP2".articulo a on a.id = r.articulo_id where a.codigo in ('630E','631E','633E','636E','637E'));
-- delete from "GP2".ruta where articulo_id in (select id from "GP2".articulo where codigo in ('630E','631E','633E','636E','637E'));
-- delete from "GP2".articulo_componente where articulo_id in (select id from "GP2".articulo where codigo in ('630E','631E','633E','636E','637E'));
-- delete from "GP2".articulo where codigo in ('630E','631E','633E','636E','637E');
-- delete from "GP2".componente c where c.sector_id = 12 and c.codigo in ('630E','631E','633E','636E','637E')
--    and not exists (select 1 from "GP2".inventario i where i.componente_id = c.id)
--    and not exists (select 1 from "GP2".movimiento m where c.id in (m.comp_id, m.comp_transformado_id, m.sustituye_comp_id));
