-- =====================================================================
-- Alta de los coladores LOKE 110 y 111, gemelos del 026 y del 027 (2026-10-08)
-- Pedido textual (CONOCIMIENTO_GP2.md §4ke): «Agregá los artículos 110 y 111. El 110 es igual al 026 y
-- el 111 es igual al 027. Lo único que cambia es la marca: es LOKE no Loeke.»
--      110 --> 026  Colador Ø 8cm   (36 x Caja N°2)
--      111 --> 027  Colador Ø 10cm  (24 x Caja N°2)
--
-- Calco del gemelo (molde §4cb 186←099 / §4jn 63xE←94xE), en el orden de CLAUDE.md:
--   1) componente             · terminado: sector 12, «<cod> Terminado», SIN inventario (igual que el gemelo)
--                             · CARTÓN PROPIO: «Cartón 110» / «Cartón 111», código provisorio CART110 /
--                               CART111 (la posición de estantería no está en ninguna planilla; precedente
--                               CART186). Mismos atributos que el cartón del gemelo (Pol, formato 8, marca
--                               LOEKE, 2.500 x paquete, mínimo 12.000): «el formato lo dicta el gemelo, no
--                               la marca» [usuario 2026-09-09, §1-nonies] y «la marca loke no va» en
--                               componentes [usuario 2026-09-08, §4g]. SIN precio, igual que el gemelo.
--   2) inventario             el cartón nuevo en las mismas ubicaciones que el del gemelo, en 0
--   3) articulo + receta      misma familia/caja/uni x caja/descripción; marca LOKE; receta = caja 1/N +
--                             SU cartón ×1
--   4) ruta + ruta_paso       las 2 rutas del gemelo (cartón y caja → Lopez Jose → Virgilio), paso por
--                             paso; cambian el cartón y el terminado. Nombre «Insumo X -> Art N».
--   5) alias / espejo Virgilio: nada (el gemelo no tiene).
--
-- Por qué el cartón NO se comparte (§4cb): «lo único que un gemelo NO puede compartir es el cartón».
-- La marca va impresa en el cartón, y la planilla de costos lo confirma: hoja « Cartones» fila 307
-- (026: tipo 20, $43) contra 317 (110: tipo 17, $48); 309 (027) contra 318 (111), igual.
--
-- Ya estaba en la base y NO se toca: GP2.est_madre (110: 288 uni/mes · 111: 296), GP2.articulo_prov_at
-- (Lopez Jose ya tiene «Colador N° 8 Loke» 110 y «Colador N°10 Loke» 111, caja 2).
-- Precios: el gemelo no tiene ninguno colgado del terminado ni del cartón (medido): si apareciera
-- uno, la migración aborta. Los máximos los recalculan solos trg_maximos_receta / trg_maximos_rutas.
-- Sólo ALTAS: no se modifica ni se borra nada existente → no hace falta respaldo previo.
-- Idempotente: si el artículo ya existe, lo saltea.
-- =====================================================================
do $$
declare
  r record; p record; u record;
  v_gem bigint; v_gem_term bigint; v_gem_cart bigint;
  v_art bigint; v_term bigint; v_cart bigint; v_ruta bigint; v_nom text;
begin
  for r in select * from (values ('110','026'), ('111','027')) as x(nuevo, gemelo) loop
    if exists (select 1 from "GP2".articulo where codigo = r.nuevo) then
      raise notice '% ya existe: se saltea', r.nuevo; continue;
    end if;
    select id into v_gem from "GP2".articulo where codigo = r.gemelo;
    select id into v_gem_term from "GP2".componente where codigo = r.gemelo and sector_id = 12;
    if v_gem is null or v_gem_term is null then raise exception 'falta el gemelo % o su terminado', r.gemelo; end if;
    -- el cartón del gemelo: el único componente de Sector Cartón (10) de su receta
    select ac.componente_id into strict v_gem_cart
      from "GP2".articulo_componente ac join "GP2".componente c on c.id = ac.componente_id
     where ac.articulo_id = v_gem and c.sector_id = 10;
    if exists (select 1 from "GP2".componente where sector_id = 12 and codigo = r.nuevo)
       or exists (select 1 from "GP2".componente where sector_id = 10
                   and (codigo = 'CART' || r.nuevo or descripcion = 'Cartón ' || r.nuevo)) then
      raise exception 'ya hay un terminado o un cartón % sin artículo: revisar a mano', r.nuevo;
    end if;
    if exists (select 1 from "GP2".precio_tallerista where componente_id in (v_gem_term, v_gem_cart))
       or exists (select 1 from "GP2".precio_servicio_pieza where componente_id in (v_gem_term, v_gem_cart))
       or exists (select 1 from "GP2".precio_proveedor where componente_id in (v_gem_term, v_gem_cart))
       or exists (select 1 from "GP2".reparto_prov_at where articulo_id = v_gem)
       or exists (select 1 from "GP2".articulo_linea_tallerista where articulo_id = v_gem)
       or exists (select 1 from "GP2".matriz_salida_etiqueta where componente_id in (v_gem_term, v_gem_cart)) then
      raise exception 'el gemelo % tiene precio, reparto, línea o etiqueta: copiarlo antes', r.gemelo;
    end if;

    -- 1a) componente terminado
    insert into "GP2".componente (codigo, descripcion, sector_id, unidad_medida, uni_x_cajon)
      select r.nuevo, r.nuevo || ' Terminado', 12, c.unidad_medida, c.uni_x_cajon
        from "GP2".componente c where c.id = v_gem_term
      returning id into v_term;

    -- 1b) cartón propio, con los atributos del cartón del gemelo
    insert into "GP2".componente (codigo, descripcion, sector_id, unidad_medida, kg_x_uni, uni_x_cajon, proveedor,
                                  carton_formato, carton_categoria, estado_compra, marca, es_pliego, recibe_en_cajas,
                                  relev_solo_sueltas, pedido_minimo_uni, mb_color, discontinuado, uni_x_paquete,
                                  entrega_unidad, entrega_uni_x, remito_unidad, envio_carga, familia_pedido)
      select 'CART' || r.nuevo, 'Cartón ' || r.nuevo, c.sector_id, c.unidad_medida, c.kg_x_uni, c.uni_x_cajon, c.proveedor,
             c.carton_formato, c.carton_categoria, c.estado_compra, c.marca, c.es_pliego, c.recibe_en_cajas,
             c.relev_solo_sueltas, c.pedido_minimo_uni, c.mb_color, false, c.uni_x_paquete,
             c.entrega_unidad, c.entrega_uni_x, c.remito_unidad, c.envio_carga, c.familia_pedido
        from "GP2".componente c where c.id = v_gem_cart
      returning id into v_cart;

    -- 2) inventario del cartón, en 0, donde lo tiene el gemelo (el máximo lo pone el trigger)
    for u in select i.ubicacion_id from "GP2".inventario i where i.componente_id = v_gem_cart loop
      insert into "GP2".inventario (componente_id, ubicacion_id, cantidad) values (v_cart, u.ubicacion_id, 0);
    end loop;

    -- 3) articulo + receta (el cartón del gemelo pasa a ser el suyo)
    insert into "GP2".articulo (codigo, familia, componente_caja_id, articulos_por_caja, discontinuado, descripcion, marca)
      select r.nuevo, a.familia, a.componente_caja_id, a.articulos_por_caja, false, a.descripcion, 'LOKE'
        from "GP2".articulo a where a.id = v_gem
      returning id into v_art;
    insert into "GP2".articulo_componente (articulo_id, componente_id, cantidad)
      select v_art, case when ac.componente_id = v_gem_cart then v_cart else ac.componente_id end, ac.cantidad
        from "GP2".articulo_componente ac where ac.articulo_id = v_gem;

    -- 4) rutas, paso por paso; cartón y terminado del gemelo pasan a ser los del nuevo
    for p in select r0.id, r0.nombre from "GP2".ruta r0 where r0.articulo_id = v_gem order by r0.id loop
      v_nom := coalesce(replace(p.nombre, 'Art ' || r.gemelo, 'Art ' || r.nuevo),
                        'Insumo ' || (select case when rp.comp_entrada_id = v_gem_cart then 'CART' || r.nuevo else c.codigo end
                                        from "GP2".ruta_paso rp join "GP2".componente c on c.id = rp.comp_entrada_id
                                       where rp.ruta_id = p.id order by rp.orden limit 1) || ' -> Art ' || r.nuevo);
      insert into "GP2".ruta (nombre, articulo_id) values (v_nom, v_art) returning id into v_ruta;
      insert into "GP2".ruta_paso (ruta_id, orden, tipo_paso, matriz_id, proveedor_id, tallerista_id, proveedor_at_id,
                                   comp_entrada_id, comp_salida_id, cantidad)
        select v_ruta, rp.orden, rp.tipo_paso, rp.matriz_id, rp.proveedor_id, rp.tallerista_id, rp.proveedor_at_id,
               case rp.comp_entrada_id when v_gem_term then v_term when v_gem_cart then v_cart else rp.comp_entrada_id end,
               case rp.comp_salida_id  when v_gem_term then v_term when v_gem_cart then v_cart else rp.comp_salida_id  end,
               rp.cantidad
          from "GP2".ruta_paso rp where rp.ruta_id = p.id;
    end loop;
  end loop;
end $$;

-- ---------- REVERSA (correr a mano si hiciera falta; sin producción ni movimientos de 110/111) ----------
-- delete from "GP2".ruta_paso where ruta_id in (select r.id from "GP2".ruta r join "GP2".articulo a on a.id = r.articulo_id where a.codigo in ('110','111'));
-- delete from "GP2".ruta where articulo_id in (select id from "GP2".articulo where codigo in ('110','111'));
-- delete from "GP2".articulo_componente where articulo_id in (select id from "GP2".articulo where codigo in ('110','111'));
-- delete from "GP2".articulo where codigo in ('110','111');
-- delete from "GP2".inventario i using "GP2".componente c where c.id = i.componente_id and c.sector_id = 10 and c.codigo in ('CART110','CART111') and i.cantidad = 0;
-- delete from "GP2".componente c where ((c.sector_id = 12 and c.codigo in ('110','111')) or (c.sector_id = 10 and c.codigo in ('CART110','CART111')))
--    and not exists (select 1 from "GP2".inventario i where i.componente_id = c.id)
--    and not exists (select 1 from "GP2".movimiento m where c.id in (m.comp_id, m.comp_transformado_id, m.sustituye_comp_id));
