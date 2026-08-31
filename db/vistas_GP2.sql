-- =====================================================================
-- VISTAS del schema GP2 (pg_get_viewdef, exacto) — export automatico 2026-08-31 desde Supabase (hrxfctzncixxqmpfhskv)
-- Respaldo/referencia. La fuente de verdad es la base; regenerar al cambiar el schema.
-- =====================================================================

-- ---------- v_consumo_componente ----------
create or replace view "GP2".v_consumo_componente as
 SELECT c.id AS componente_id,
    c.codigo,
    c.descripcion,
    c.sector_id,
    s.nombre AS sector,
    round(sum(d.uni_mes)) AS consumo_uni_mes,
    count(DISTINCT d.articulo_id) AS en_articulos
   FROM "GP2".v_consumo_demanda d
     JOIN "GP2".componente c ON c.id = d.componente_id
     LEFT JOIN "GP2".sector s ON s.id = c.sector_id
  GROUP BY c.id, c.codigo, c.descripcion, c.sector_id, s.nombre;

-- ---------- v_consumo_demanda ----------
create or replace view "GP2".v_consumo_demanda as
 WITH RECURSIVE dem AS (
         SELECT a.id AS art_id,
            em.proy_uni_mes AS uni
           FROM "GP2".articulo a
             JOIN "GP2".est_madre em ON regexp_replace(em.cod, '^0+'::text, ''::text) = regexp_replace(a.codigo, '^0+'::text, ''::text)
          WHERE em.proy_uni_mes IS NOT NULL AND NOT a.discontinuado
        ), receta AS (
         SELECT ac.articulo_id AS art_id,
            ac.componente_id AS comp_id,
            d.uni * ac.cantidad AS qty
           FROM "GP2".articulo_componente ac
             JOIN dem d ON d.art_id = ac.articulo_id
        UNION ALL
         SELECT r.art_id,
            b.componente_hijo_id,
            r.qty * b.cantidad
           FROM receta r
             JOIN "GP2".componente_bom b ON b.componente_padre_id = r.comp_id
        ), seed AS (
         SELECT receta.art_id,
            receta.comp_id,
            sum(receta.qty) AS qty
           FROM receta
          GROUP BY receta.art_id, receta.comp_id
        ), arista AS (
         SELECT DISTINCT r.articulo_id AS art_id,
            rp.comp_salida_id AS sal,
            rp.comp_entrada_id AS ent
           FROM "GP2".ruta_paso rp
             JOIN "GP2".ruta r ON r.id = rp.ruta_id
          WHERE rp.comp_entrada_id IS NOT NULL AND rp.comp_salida_id IS NOT NULL AND r.articulo_id IS NOT NULL
        ), walk AS (
         SELECT seed.art_id,
            seed.comp_id,
            seed.comp_id AS seed
           FROM seed
        UNION
         SELECT a.art_id,
            a.ent,
            w_1.seed
           FROM walk w_1
             JOIN arista a ON a.art_id = w_1.art_id AND a.sal = w_1.comp_id
          WHERE NOT (EXISTS ( SELECT 1
                   FROM seed s2
                  WHERE s2.art_id = a.art_id AND s2.comp_id = a.ent))
        )
 SELECT w.art_id AS articulo_id,
    w.comp_id AS componente_id,
    sum(s.qty) AS uni_mes
   FROM walk w
     JOIN seed s ON s.art_id = w.art_id AND s.comp_id = w.seed
  GROUP BY w.art_id, w.comp_id;

-- ---------- v_consumo_fleje_kg ----------
create or replace view "GP2".v_consumo_fleje_kg as
 WITH RECURSIVE arranque AS (
         SELECT rp.ruta_id,
            rp.orden,
            rp.comp_salida_id AS comp,
            ce.id AS fleje_id,
            m.partes_por_kilo_de_fleje AS ppk
           FROM "GP2".ruta_paso rp
             JOIN "GP2".matriz m ON m.id = rp.matriz_id
             JOIN "GP2".componente ce ON ce.id = rp.comp_entrada_id
          WHERE ce.sector_id = 5 AND COALESCE(m.partes_por_kilo_de_fleje, 0::numeric) > 0::numeric
        ), walk AS (
         SELECT a.fleje_id,
            a.ruta_id,
            a.orden,
            a.comp,
            a.ppk,
            0 AS depth
           FROM arranque a
        UNION ALL
         SELECT w.fleje_id,
            w.ruta_id,
            rp.orden,
            rp.comp_salida_id,
            w.ppk,
            w.depth + 1
           FROM walk w
             JOIN "GP2".ruta_paso rp ON rp.ruta_id = w.ruta_id AND rp.orden = (w.orden + 1) AND rp.comp_entrada_id = w.comp
          WHERE w.depth < 12 AND rp.comp_salida_id IS NOT NULL AND NOT (EXISTS ( SELECT 1
                   FROM "GP2".v_consumo_parte cp_1
                  WHERE cp_1.componente_id = w.comp))
        ), terminales AS (
         SELECT DISTINCT w.fleje_id,
            w.comp,
            w.ppk
           FROM walk w
          WHERE (EXISTS ( SELECT 1
                   FROM "GP2".v_consumo_parte cp_1
                  WHERE cp_1.componente_id = w.comp))
        )
 SELECT f.id AS componente_id,
    f.codigo,
    f.descripcion,
    round(sum(cp.consumo_uni_mes / t.ppk), 1) AS consumo_kg_mes,
    count(*) AS piezas
   FROM terminales t
     JOIN "GP2".componente f ON f.id = t.fleje_id
     JOIN "GP2".v_consumo_parte cp ON cp.componente_id = t.comp
  GROUP BY f.id, f.codigo, f.descripcion;

-- ---------- v_consumo_fleje_kg_v2 ----------
create or replace view "GP2".v_consumo_fleje_kg_v2 as
 WITH paso AS (
         SELECT DISTINCT r.articulo_id AS art_id,
            rp.comp_entrada_id AS fleje_id,
            rp.comp_salida_id AS sal,
            m.partes_por_kilo_de_fleje AS ppk
           FROM "GP2".ruta_paso rp
             JOIN "GP2".ruta r ON r.id = rp.ruta_id
             JOIN "GP2".componente ce ON ce.id = rp.comp_entrada_id AND ce.sector_id = 5
             JOIN "GP2".matriz m ON m.id = rp.matriz_id
          WHERE r.articulo_id IS NOT NULL AND rp.comp_salida_id IS NOT NULL AND COALESCE(m.partes_por_kilo_de_fleje, 0::numeric) > 0::numeric
        )
 SELECT f.id AS componente_id,
    f.codigo,
    f.descripcion,
    round(sum(d.uni_mes / p.ppk), 1) AS consumo_kg_mes,
    count(*) AS piezas
   FROM paso p
     JOIN "GP2".v_consumo_demanda d ON d.articulo_id = p.art_id AND d.componente_id = p.sal
     JOIN "GP2".componente f ON f.id = p.fleje_id
  GROUP BY f.id, f.codigo, f.descripcion;

-- ---------- v_consumo_parte ----------
create or replace view "GP2".v_consumo_parte as
 SELECT ac.componente_id,
    c.codigo,
    c.descripcion,
    c.sector_id,
    round(sum(em.proy_uni_mes * ac.cantidad)) AS consumo_uni_mes,
    count(DISTINCT ac.articulo_id) AS en_articulos
   FROM "GP2".articulo_componente ac
     JOIN "GP2".articulo a ON a.id = ac.articulo_id
     JOIN "GP2".est_madre em ON regexp_replace(em.cod, '^0+'::text, ''::text) = regexp_replace(a.codigo, '^0+'::text, ''::text)
     JOIN "GP2".componente c ON c.id = ac.componente_id
  GROUP BY ac.componente_id, c.codigo, c.descripcion, c.sector_id;

-- ---------- v_control_pallet ----------
create or replace view "GP2".v_control_pallet as
 WITH p AS (
         SELECT max(parametro.valor) FILTER (WHERE parametro.clave = 'tara_pallet_min'::text) AS tmin,
            max(parametro.valor) FILTER (WHERE parametro.clave = 'tara_pallet_max'::text) AS tmax,
            max(parametro.valor) FILTER (WHERE parametro.clave = 'tol_ctrl_peso_pct'::text) AS tolpct
           FROM "GP2".parametro
        ), r AS (
         SELECT recepcion_control_rollo.control_id,
            sum(recepcion_control_rollo.cantidad) AS rollos,
            sum(recepcion_control_rollo.cantidad::numeric * recepcion_control_rollo.kg_por_rollo) AS kg,
            count(*) AS tipos
           FROM "GP2".recepcion_control_rollo
          GROUP BY recepcion_control_rollo.control_id
        )
 SELECT ctl.id AS control_id,
    ctl.recepcion_id,
    ctl.nro_pallet,
    ctl.peso_balanza,
    ctl.controlado_por,
    ctl.controlado_en,
    COALESCE(r.rollos, 0::bigint) AS rollos,
    COALESCE(r.kg, 0::numeric) AS kg_rollos,
    COALESCE(r.tipos, 0::bigint) AS tipos_de_peso,
    ctl.peso_balanza - COALESCE(r.kg, 0::numeric) AS sobrante_kg,
    p.tmin AS sobrante_min,
    p.tmax AS sobrante_max,
        CASE
            WHEN COALESCE(pi.modo_control, 'ninguno'::text) = 'peso_total'::text THEN
            CASE
                WHEN abs(ctl.peso_balanza - ri.cantidad) <= GREATEST(ri.cantidad * COALESCE(p.tolpct, 2::numeric) / 100.0, 0.5) THEN 'ok'::text
                ELSE 'peso distinto al remito'::text
            END
            WHEN COALESCE(r.rollos, 0::bigint) = 0 THEN 'sin rollos cargados'::text
            WHEN (ctl.peso_balanza - COALESCE(r.kg, 0::numeric)) < p.tmin THEN 'sobrante bajo'::text
            WHEN (ctl.peso_balanza - COALESCE(r.kg, 0::numeric)) > p.tmax THEN 'sobrante alto'::text
            ELSE 'ok'::text
        END AS estado
   FROM "GP2".recepcion_control ctl
     JOIN "GP2".recepcion_insumo ri ON ri.id = ctl.recepcion_id
     LEFT JOIN "GP2".proveedor_insumo pi ON pi.nombre = ri.proveedor
     LEFT JOIN r ON r.control_id = ctl.id
     CROSS JOIN p;

-- ---------- v_costo_componente ----------
create or replace view "GP2".v_costo_componente as
 WITH RECURSIVE par AS (
         SELECT ( SELECT parametro.valor
                   FROM "GP2".parametro
                  WHERE parametro.clave = 'costo_segundo_pesos'::text) AS costo_seg,
            ( SELECT parametro.valor
                   FROM "GP2".parametro
                  WHERE parametro.clave = 'tipo_cambio_usd_pesos'::text) AS tc
        ), pc AS (
         SELECT DISTINCT ON (precio_proveedor.componente_id) precio_proveedor.componente_id,
                CASE
                    WHEN precio_proveedor.precio_por_kg THEN precio_proveedor.precio * (( SELECT c9.kg_x_uni
                       FROM "GP2".componente c9
                      WHERE c9.id = precio_proveedor.componente_id))
                    ELSE precio_proveedor.precio
                END AS precio,
                CASE
                    WHEN upper(COALESCE(precio_proveedor.moneda, 'USD'::text)) ~~ '%US%'::text OR upper(COALESCE(precio_proveedor.moneda, 'USD'::text)) = 'USD'::text THEN 'USD'::text
                    ELSE 'ARS'::text
                END AS moneda
           FROM "GP2".precio_proveedor
          WHERE precio_proveedor.componente_id IS NOT NULL AND precio_proveedor.precio IS NOT NULL
          ORDER BY precio_proveedor.componente_id, precio_proveedor.fecha_lista DESC NULLS LAST, precio_proveedor.id DESC
        ), psrv AS (
         SELECT precio_servicio.proveedor_servicio_id,
            precio_servicio.precio_uni,
                CASE
                    WHEN upper(COALESCE(precio_servicio.moneda, 'USD'::text)) ~~ '%US%'::text OR upper(COALESCE(precio_servicio.moneda, 'USD'::text)) = 'USD'::text THEN 'USD'::text
                    ELSE 'ARS'::text
                END AS moneda
           FROM "GP2".precio_servicio
        ), comprado AS (
         SELECT c_1.id,
            c_1.sector_id,
            pc.precio,
            pc.moneda
           FROM "GP2".componente c_1
             LEFT JOIN pc ON pc.componente_id = c_1.id
          WHERE ((c_1.sector_id = ANY (ARRAY[5::bigint, 6::bigint, 7::bigint, 8::bigint, 10::bigint, 11::bigint])) OR pc.precio IS NOT NULL AND NOT (EXISTS ( SELECT 1
                   FROM "GP2".ruta_paso rp2
                  WHERE rp2.comp_salida_id = c_1.id AND (rp2.tipo_paso = ANY (ARRAY['matriz'::text, 'proveedor_servicio'::text, 'tallerista'::text]))))) AND c_1.estado_compra IS NULL
        ), edges AS (
         SELECT DISTINCT rp.comp_entrada_id AS ent,
            rp.comp_salida_id AS sal,
            rp.tipo_paso,
            rp.matriz_id,
            rp.proveedor_id
           FROM "GP2".ruta_paso rp
          WHERE rp.comp_entrada_id IS NOT NULL AND rp.comp_salida_id IS NOT NULL AND rp.comp_entrada_id <> rp.comp_salida_id AND (rp.tipo_paso = ANY (ARRAY['matriz'::text, 'proveedor_servicio'::text, 'tallerista'::text]))
        ), selfsrv AS (
         SELECT DISTINCT rp.comp_salida_id AS comp,
            rp.proveedor_id
           FROM "GP2".ruta_paso rp
          WHERE rp.tipo_paso = 'proveedor_servicio'::text AND rp.proveedor_id IS NOT NULL AND rp.comp_entrada_id = rp.comp_salida_id
        ), fabricado AS (
         SELECT c_1.id,
            c_1.kg_x_uni
           FROM "GP2".componente c_1
          WHERE NOT (c_1.id IN ( SELECT comprado.id
                   FROM comprado))
        ), w AS (
         SELECT f.id AS comp_id,
            e.ent,
            e.sal,
            e.tipo_paso,
            e.matriz_id,
            e.proveedor_id,
            f.kg_x_uni AS kg_ref,
            1 AS depth
           FROM fabricado f
             JOIN edges e ON e.sal = f.id
        UNION
         SELECT w.comp_id,
            e.ent,
            e.sal,
            e.tipo_paso,
            e.matriz_id,
            e.proveedor_id,
            COALESCE(ce.kg_x_uni, w.kg_ref) AS "coalesce",
            w.depth + 1
           FROM w
             JOIN "GP2".componente ce ON ce.id = w.ent
             JOIN edges e ON e.sal = w.ent
          WHERE w.depth < 40 AND NOT (w.ent IN ( SELECT comprado.id
                   FROM comprado))
        ), wd AS (
         SELECT w.comp_id,
            w.ent,
            w.sal,
            w.tipo_paso,
            w.matriz_id,
            w.proveedor_id,
            max(w.kg_ref) AS kg_ref
           FROM w
          GROUP BY w.comp_id, w.ent, w.sal, w.tipo_paso, w.matriz_id, w.proveedor_id
        ), mat AS (
         SELECT x.comp_id,
            COALESCE(sum(x.val) FILTER (WHERE x.moneda = 'USD'::text), 0::numeric) AS usd,
            COALESCE(sum(x.val) FILTER (WHERE x.moneda = 'ARS'::text), 0::numeric) AS ars,
            count(*) FILTER (WHERE x.precio IS NULL) AS sin_precio,
            count(*) FILTER (WHERE x.precio IS NOT NULL AND x.val IS NULL) AS sin_kg
           FROM ( SELECT wd.comp_id,
                    cb_1.precio,
                    cb_1.moneda,
                        CASE
                            WHEN cb_1.sector_id = 5 THEN cb_1.precio * COALESCE(wd.kg_ref, 1::numeric / NULLIF(m.partes_por_kilo_de_fleje, 0::numeric))
                            ELSE cb_1.precio
                        END AS val
                   FROM wd
                     JOIN comprado cb_1 ON cb_1.id = wd.ent
                     LEFT JOIN "GP2".matriz m ON m.id = wd.matriz_id) x
          GROUP BY x.comp_id
        ), lab AS (
         SELECT y.comp_id,
            COALESCE(sum(m.tiempo_historico), 0::numeric) AS segundos,
            count(*) FILTER (WHERE m.tiempo_historico IS NULL) AS sin_tiempo
           FROM ( SELECT DISTINCT wd.comp_id,
                    wd.matriz_id
                   FROM wd
                  WHERE wd.tipo_paso = 'matriz'::text AND wd.matriz_id IS NOT NULL) y
             JOIN "GP2".matriz m ON m.id = y.matriz_id
          GROUP BY y.comp_id
        ), nodos AS (
         SELECT f.id AS comp_id,
            f.id AS nodo
           FROM fabricado f
        UNION
         SELECT wd.comp_id,
            wd.ent
           FROM wd
        UNION
         SELECT wd.comp_id,
            wd.sal
           FROM wd
        ), srv AS (
         SELECT z.comp_id,
            COALESCE(sum(COALESCE(pz.precio_kg * cz.kg_x_uni, pz.precio_uni, ts.precio_kg * cz.kg_x_uni, ts.precio_uni, p.precio_uni)) FILTER (WHERE COALESCE(pz.moneda, ts.moneda, p.moneda) = 'USD'::text), 0::numeric) AS usd,
            COALESCE(sum(COALESCE(pz.precio_kg * cz.kg_x_uni, pz.precio_uni, ts.precio_kg * cz.kg_x_uni, ts.precio_uni, p.precio_uni)) FILTER (WHERE COALESCE(pz.moneda, ts.moneda, p.moneda) = 'ARS'::text), 0::numeric) AS ars,
            count(*) FILTER (WHERE COALESCE(pz.precio_kg * cz.kg_x_uni, pz.precio_uni, ts.precio_kg * cz.kg_x_uni, ts.precio_uni, p.precio_uni) IS NULL) AS sin_precio
           FROM ( SELECT DISTINCT wd.comp_id,
                    wd.sal AS pieza,
                    wd.proveedor_id
                   FROM wd
                  WHERE wd.tipo_paso = 'proveedor_servicio'::text AND wd.proveedor_id IS NOT NULL
                UNION
                 SELECT n.comp_id,
                    s_1.comp,
                    s_1.proveedor_id
                   FROM nodos n
                     JOIN selfsrv s_1 ON s_1.comp = n.nodo) z
             LEFT JOIN "GP2".precio_servicio_pieza pz ON pz.proveedor_servicio_id = z.proveedor_id AND pz.componente_id = z.pieza
             LEFT JOIN "GP2".componente cz ON cz.id = z.pieza
             LEFT JOIN "GP2".tarifa_servicio ts ON ts.proveedor_servicio_id = z.proveedor_id AND ts.proceso = pz.proceso
             LEFT JOIN psrv p ON p.proveedor_servicio_id = z.proveedor_id
          GROUP BY z.comp_id
        ), bomx AS (
         SELECT b.componente_padre_id AS comp_id,
            COALESCE(sum(b.cantidad * pc.precio) FILTER (WHERE pc.moneda = 'USD'::text), 0::numeric) AS usd,
            COALESCE(sum(b.cantidad * pc.precio) FILTER (WHERE pc.moneda = 'ARS'::text), 0::numeric) AS ars,
            count(*) FILTER (WHERE pc.precio IS NULL) AS sin_precio
           FROM "GP2".componente_bom b
             JOIN "GP2".componente ch ON ch.id = b.componente_hijo_id
             LEFT JOIN pc ON pc.componente_id = ch.id
          WHERE (ch.sector_id = ANY (ARRAY[6::bigint, 7::bigint, 8::bigint, 10::bigint, 11::bigint])) AND NOT (EXISTS ( SELECT 1
                   FROM edges e
                  WHERE e.ent = b.componente_hijo_id AND e.sal = b.componente_padre_id))
          GROUP BY b.componente_padre_id
        ), talx AS (
         SELECT n.comp_id,
            COALESCE(sum(pt.precio_uni) FILTER (WHERE upper(COALESCE(pt.moneda, 'ARS'::text)) ~~ '%US%'::text), 0::numeric) AS usd,
            COALESCE(sum(pt.precio_uni) FILTER (WHERE NOT upper(COALESCE(pt.moneda, 'ARS'::text)) ~~ '%US%'::text), 0::numeric) AS ars
           FROM ( SELECT DISTINCT n0.comp_id,
                    t.comp,
                    t.tallerista_id
                   FROM "GP2".ruta_paso rp0
                     JOIN LATERAL ( SELECT rp0.comp_salida_id AS comp,
                            rp0.tallerista_id) t ON true
                     JOIN ( SELECT nodos.comp_id,
                            nodos.nodo
                           FROM nodos) n0 ON n0.nodo = t.comp
                  WHERE rp0.tipo_paso = 'tallerista'::text AND rp0.tallerista_id IS NOT NULL AND rp0.comp_salida_id IS NOT NULL) n
             JOIN "GP2".precio_tallerista pt ON pt.tallerista_id = n.tallerista_id AND pt.componente_id = n.comp
          GROUP BY n.comp_id
        )
 SELECT c.id AS comp_id,
    c.codigo,
    c.descripcion,
    c.sector_id,
    s.nombre AS sector,
    s.tipo AS sector_tipo,
        CASE
            WHEN cb.id IS NOT NULL THEN 'precio'::text
            ELSE 'ruta'::text
        END AS origen,
        CASE
            WHEN cb.id IS NOT NULL THEN
            CASE
                WHEN cb.moneda = 'USD'::text THEN COALESCE(cb.precio, 0::numeric)
                ELSE 0::numeric
            END
            ELSE COALESCE(mat.usd, 0::numeric) + COALESCE(bx.usd, 0::numeric)
        END AS material_usd,
        CASE
            WHEN cb.id IS NOT NULL THEN
            CASE
                WHEN cb.moneda = 'ARS'::text THEN COALESCE(cb.precio, 0::numeric)
                ELSE 0::numeric
            END
            ELSE COALESCE(mat.ars, 0::numeric) + COALESCE(bx.ars, 0::numeric)
        END AS material_pesos,
        CASE
            WHEN cb.id IS NOT NULL THEN 0::numeric
            ELSE COALESCE(srv.usd, 0::numeric) + COALESCE(tx.usd, 0::numeric)
        END AS servicios_usd,
        CASE
            WHEN cb.id IS NOT NULL THEN 0::numeric
            ELSE COALESCE(srv.ars, 0::numeric) + COALESCE(tx.ars, 0::numeric)
        END AS servicios_pesos,
        CASE
            WHEN cb.id IS NOT NULL THEN 0::numeric
            ELSE COALESCE(lab.segundos, 0::numeric)
        END AS segundos_matriz,
        CASE
            WHEN cb.id IS NOT NULL THEN 0::numeric
            ELSE round(COALESCE(lab.segundos, 0::numeric) * COALESCE(par.costo_seg, 0::numeric), 4)
        END AS mano_obra_pesos,
        CASE
            WHEN par.tc IS NULL THEN NULL::numeric
            ELSE round(
            CASE
                WHEN cb.id IS NOT NULL THEN
                CASE
                    WHEN cb.moneda = 'USD'::text THEN COALESCE(cb.precio, 0::numeric)
                    ELSE 0::numeric
                END
                ELSE COALESCE(mat.usd, 0::numeric) + COALESCE(bx.usd, 0::numeric) + COALESCE(srv.usd, 0::numeric) + COALESCE(tx.usd, 0::numeric)
            END * par.tc +
            CASE
                WHEN cb.id IS NOT NULL THEN
                CASE
                    WHEN cb.moneda = 'ARS'::text THEN COALESCE(cb.precio, 0::numeric)
                    ELSE 0::numeric
                END
                ELSE COALESCE(mat.ars, 0::numeric) + COALESCE(bx.ars, 0::numeric) + COALESCE(srv.ars, 0::numeric) + COALESCE(tx.ars, 0::numeric) + round(COALESCE(lab.segundos, 0::numeric) * COALESCE(par.costo_seg, 0::numeric), 4)
            END, 2)
        END AS total_pesos,
        CASE
            WHEN cb.id IS NOT NULL THEN (cb.precio IS NULL)::integer::bigint
            ELSE COALESCE(mat.sin_precio, 0::bigint) + COALESCE(srv.sin_precio, 0::bigint) + COALESCE(bx.sin_precio, 0::bigint)
        END AS faltan_precios,
        CASE
            WHEN cb.id IS NOT NULL THEN 0::bigint
            ELSE COALESCE(mat.sin_kg, 0::bigint)
        END AS faltan_kg,
        CASE
            WHEN cb.id IS NOT NULL THEN 0::bigint
            ELSE COALESCE(lab.sin_tiempo, 0::bigint)
        END AS faltan_tiempos
   FROM "GP2".componente c
     JOIN "GP2".sector s ON s.id = c.sector_id
     CROSS JOIN par
     LEFT JOIN comprado cb ON cb.id = c.id
     LEFT JOIN mat ON mat.comp_id = c.id AND cb.id IS NULL
     LEFT JOIN lab ON lab.comp_id = c.id AND cb.id IS NULL
     LEFT JOIN srv ON srv.comp_id = c.id AND cb.id IS NULL
     LEFT JOIN bomx bx ON bx.comp_id = c.id AND cb.id IS NULL
     LEFT JOIN talx tx ON tx.comp_id = c.id AND cb.id IS NULL;

-- ---------- v_faltante_estado ----------
create or replace view "GP2".v_faltante_estado as
 WITH umbral AS (
         SELECT COALESCE(( SELECT parametro.valor
                   FROM "GP2".parametro
                  WHERE parametro.clave = 'faltante_cajones_umbral'::text), 1::numeric) AS caj
        )
 SELECT c.id AS componente_id,
    c.codigo,
    c.descripcion,
    c.sector_id,
    s.nombre AS sector,
    i.cantidad AS stock_uni,
    c.uni_x_cajon,
        CASE
            WHEN c.uni_x_cajon > 0::numeric THEN round(i.cantidad / c.uni_x_cajon, 2)
            ELSE NULL::numeric
        END AS cajones_stock,
    COALESCE(cp.consumo_uni_mes, 0::numeric) AS consumo_uni_mes,
    i.maximo,
    i.maximo_origen,
        CASE
            WHEN COALESCE(cp.consumo_uni_mes, 0::numeric) > 0::numeric THEN round(i.cantidad / (cp.consumo_uni_mes / 30.0), 1)
            ELSE NULL::numeric
        END AS cobertura_dias,
        CASE
            WHEN COALESCE(cp.consumo_uni_mes, 0::numeric) > 0::numeric AND i.maximo IS NOT NULL THEN round(i.maximo / (cp.consumo_uni_mes / 30.0), 1)
            ELSE NULL::numeric
        END AS cobertura_llena_dias,
    c.uni_x_cajon > 0::numeric AND i.cantidad < (u2.caj * c.uni_x_cajon) AS faltante_auto,
    u2.caj AS umbral_cajones,
    COALESCE(cp.consumo_uni_mes, 0::numeric) > 0::numeric AND i.maximo IS NOT NULL AND (i.maximo / (cp.consumo_uni_mes / 30.0)) < 30::numeric AS ubicacion_corta
   FROM "GP2".componente c
     JOIN "GP2".sector s ON s.id = c.sector_id
     JOIN "GP2".ubicacion u ON u.tipo = 'sector'::text AND u.ref_id = c.sector_id
     JOIN "GP2".inventario i ON i.componente_id = c.id AND i.ubicacion_id = u.id
     LEFT JOIN "GP2".v_consumo_componente cp ON cp.componente_id = c.id
     CROSS JOIN umbral u2
  WHERE c.sector_id = ANY (ARRAY[1::bigint, 2::bigint]);

-- ---------- v_punto_stock ----------
create or replace view "GP2".v_punto_stock as
 SELECT c.id AS componente_id,
    c.codigo,
    c.descripcion,
    s.nombre AS sector,
    u.id AS ubicacion_id,
    u.nombre AS ubicacion,
    u.tipo AS ubicacion_tipo,
    u.meses_stock,
        CASE
            WHEN c.sector_id = 5 THEN fk.consumo_kg_mes
            ELSE cp.consumo_uni_mes
        END AS consumo_uni_mes,
    round(
        CASE
            WHEN c.sector_id = 5 THEN fk.consumo_kg_mes
            ELSE cp.consumo_uni_mes
        END * u.meses_stock) AS punto_stock_uni,
    i.maximo AS maximo_fisico,
    i.cantidad AS online,
        CASE
            WHEN u.meses_stock IS NULL THEN 'sin meses definidos'::text
            WHEN COALESCE(
            CASE
                WHEN c.sector_id = 5 THEN fk.consumo_kg_mes
                ELSE cp.consumo_uni_mes
            END, 0::numeric) = 0::numeric THEN 'sin consumo'::text
            WHEN i.maximo IS NULL THEN 'sin maximo fisico'::text
            WHEN i.maximo < (
            CASE
                WHEN c.sector_id = 5 THEN fk.consumo_kg_mes
                ELSE cp.consumo_uni_mes
            END * u.meses_stock) THEN 'maximo insuficiente'::text
            ELSE 'ok'::text
        END AS estado,
        CASE
            WHEN c.sector_id = 5 THEN 'kg'::text
            ELSE 'uni'::text
        END AS unidad,
    i.maximo_origen
   FROM "GP2".inventario i
     JOIN "GP2".ubicacion u ON u.id = i.ubicacion_id
     JOIN "GP2".componente c ON c.id = i.componente_id
     JOIN "GP2".sector s ON s.id = c.sector_id
     LEFT JOIN "GP2".v_consumo_componente cp ON cp.componente_id = c.id AND c.sector_id <> 5
     LEFT JOIN "GP2".v_consumo_fleje_kg_v2 fk ON fk.componente_id = c.id AND c.sector_id = 5;

-- ---------- v_recepcion_control ----------
create or replace view "GP2".v_recepcion_control as
 WITH a AS (
         SELECT v_control_pallet.recepcion_id,
            count(*) AS pallets_pesados,
            sum(v_control_pallet.rollos) AS rollos_contados,
            sum(v_control_pallet.kg_rollos) AS kg_rollos,
            sum(v_control_pallet.peso_balanza) AS peso_balanza_total,
            count(*) FILTER (WHERE v_control_pallet.estado <> 'ok'::text) AS pallets_con_problema,
            string_agg(DISTINCT v_control_pallet.estado, ', '::text) FILTER (WHERE v_control_pallet.estado <> 'ok'::text) AS problemas
           FROM "GP2".v_control_pallet
          GROUP BY v_control_pallet.recepcion_id
        )
 SELECT ri.id AS recepcion_id,
    ri.fecha,
    ri.proveedor,
    ri.remito,
    c.codigo,
    c.descripcion,
    ri.cantidad AS kg_remito,
    ri.rollos AS rollos_remito,
    ri.pallets AS pallets_remito,
    COALESCE(a.pallets_pesados, 0::bigint) AS pallets_pesados,
    COALESCE(a.rollos_contados, 0::numeric) AS rollos_contados,
    COALESCE(a.kg_rollos, 0::numeric) AS kg_rollos,
    a.peso_balanza_total,
    COALESCE(ri.rollos, 0)::numeric - COALESCE(a.rollos_contados, 0::numeric) AS rollos_sin_clasificar,
    COALESCE(ri.pallets, 0) - COALESCE(a.pallets_pesados, 0::bigint) AS pallets_sin_pesar,
    COALESCE(a.kg_rollos, 0::numeric) - ri.cantidad AS dif_kg_vs_remito,
    COALESCE(a.pallets_con_problema, 0::bigint) AS pallets_con_problema,
    a.problemas,
        CASE
            WHEN a.recepcion_id IS NULL THEN 'sin controlar'::text
            WHEN ri.pallets IS NOT NULL AND (COALESCE(ri.pallets, 0) - COALESCE(a.pallets_pesados, 0::bigint)) <> 0 THEN 'faltan pallets por pesar'::text
            WHEN ri.rollos IS NOT NULL AND (COALESCE(ri.rollos, 0)::numeric - COALESCE(a.rollos_contados, 0::numeric)) <> 0::numeric THEN 'rollos sin clasificar'::text
            WHEN COALESCE(a.pallets_con_problema, 0::bigint) > 0 THEN a.problemas
            ELSE 'ok'::text
        END AS estado
   FROM "GP2".recepcion_insumo ri
     JOIN "GP2".componente c ON c.id = ri.componente_id
     LEFT JOIN a ON a.recepcion_id = ri.id;

-- ---------- v_rollo_evolucion ----------
create or replace view "GP2".v_rollo_evolucion as
 SELECT e.id,
    e.fecha,
    e.componente_id,
    c.codigo,
    e.kg_por_rollo,
    e.delta,
    e.motivo,
    e.legajo,
    emp.nombre AS operario,
    e.nota,
    sum(e.delta) OVER (PARTITION BY e.componente_id, e.kg_por_rollo ORDER BY e.fecha, e.id) AS saldo
   FROM "GP2".rollo_evento e
     JOIN "GP2".componente c ON c.id = e.componente_id
     LEFT JOIN "GP2".empleado emp ON emp.legajo = e.legajo;

-- ---------- v_rollo_saldo ----------
create or replace view "GP2".v_rollo_saldo as
 SELECT e.componente_id,
    c.codigo,
    c.descripcion,
    e.kg_por_rollo,
    sum(e.delta) AS rollos,
    sum(e.delta)::numeric * e.kg_por_rollo AS kg_total,
    sum(e.delta) FILTER (WHERE e.delta > 0) AS ingresos,
    - sum(e.delta) FILTER (WHERE e.delta < 0) AS egresos,
    max(e.fecha) AS ultimo_mov
   FROM "GP2".rollo_evento e
     JOIN "GP2".componente c ON c.id = e.componente_id
  GROUP BY e.componente_id, c.codigo, c.descripcion, e.kg_por_rollo;

-- ---------- v_tara_pallet_real ----------
create or replace view "GP2".v_tara_pallet_real as
 SELECT rc.id AS control_id,
    ri.proveedor,
    rc.controlado_en,
    rc.peso_balanza - COALESCE(( SELECT sum(cr.cantidad::numeric * cr.kg_por_rollo) AS sum
           FROM "GP2".recepcion_control_rollo cr
          WHERE cr.control_id = rc.id), 0::numeric) AS tara
   FROM "GP2".recepcion_control rc
     JOIN "GP2".recepcion_insumo ri ON ri.id = rc.recepcion_id
  WHERE (EXISTS ( SELECT 1
           FROM "GP2".recepcion_control_rollo cr
          WHERE cr.control_id = rc.id));

-- ---------- v_valor_pedido ----------
create or replace view "GP2".v_valor_pedido as
 WITH ped AS (
         SELECT i.componente_id,
            sum(GREATEST(0::numeric, COALESCE(i.maximo, 0::numeric) - COALESCE(i.cantidad, 0::numeric))) AS pedido
           FROM "GP2".inventario i
          GROUP BY i.componente_id
        )
 SELECT cc.comp_id,
    cc.codigo,
    cc.descripcion,
    cc.sector_id,
    cc.sector,
    p.pedido,
    round(p.pedido * cc.material_usd, 2) AS valor_material_usd,
    round(p.pedido * cc.servicios_usd, 2) AS valor_servicios_usd,
    round(p.pedido * (cc.material_pesos + cc.servicios_pesos), 2) AS valor_material_pesos,
    round(p.pedido * cc.mano_obra_pesos, 2) AS valor_mano_obra_pesos,
    round(p.pedido * (cc.material_usd + cc.servicios_usd), 2) AS valor_usd,
    round(p.pedido * cc.total_pesos, 2) AS valor_total_pesos
   FROM ped p
     JOIN "GP2".v_costo_componente cc ON cc.comp_id = p.componente_id
  WHERE p.pedido > 0::numeric;

-- ---------- v_valor_stock ----------
create or replace view "GP2".v_valor_stock as
 SELECT i.componente_id AS comp_id,
    cc.codigo,
    cc.descripcion,
    cc.sector_id,
    cc.sector,
    i.ubicacion_id,
    u.nombre AS ubicacion,
    i.cantidad AS stock,
    round(i.cantidad * cc.material_usd, 2) AS valor_material_usd,
    round(i.cantidad * cc.servicios_usd, 2) AS valor_servicios_usd,
    round(i.cantidad * (cc.material_pesos + cc.servicios_pesos), 2) AS valor_material_pesos,
    round(i.cantidad * cc.mano_obra_pesos, 2) AS valor_mano_obra_pesos,
    round(i.cantidad * (cc.material_usd + cc.servicios_usd), 2) AS valor_usd,
    round(i.cantidad * cc.total_pesos, 2) AS valor_total_pesos
   FROM "GP2".inventario i
     JOIN "GP2".v_costo_componente cc ON cc.comp_id = i.componente_id
     JOIN "GP2".ubicacion u ON u.id = i.ubicacion_id
  WHERE i.cantidad <> 0::numeric;
