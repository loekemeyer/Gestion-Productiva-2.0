-- =====================================================================
-- VISTAS del schema GP2 (pg_get_viewdef, exacto) — export automatico 2026-08-29 desde Supabase (hrxfctzncixxqmpfhskv)
-- Respaldo/referencia. La fuente de verdad es la base; regenerar al cambiar el schema.
-- =====================================================================

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
     LEFT JOIN "GP2".v_consumo_parte cp ON cp.componente_id = c.id AND c.sector_id <> 5
     LEFT JOIN "GP2".v_consumo_fleje_kg fk ON fk.componente_id = c.id AND c.sector_id = 5;

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
