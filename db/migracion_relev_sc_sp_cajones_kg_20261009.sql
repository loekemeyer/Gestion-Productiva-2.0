-- ============================================================================================
-- Relevamiento (el «Conteo» de la Versión Tablet Logística): entran SC y SP (2026-10-09)
-- [Thomas, 09/10: «Agregame al módulo de conteo de versión tablet logística, sc y sp. Quiero que
--  en ese módulo aparezca el stock de hoy … registrar a la derecha … cuántos cajones hay
--  realmente … me calcule cuántos kilos hay y cuántas unidades … y que yo pueda modificar … cuántos
--  kilos hay … me debe corregir a cuántas unidades hay realmente, pero mantener la cantidad de
--  cajones como un dato fijo»]
--
-- 1) relevamiento_bundle: Sector Crudo (1) y Sector Procesado (2) aparecen SIEMPRE, sin cronograma
--    («a demanda», fecha = hoy en AR). El conteo de hoy se busca por sector con cronograma_id NULL;
--    si ya se aplicó HOY sale «✓ Hecho», mañana vuelve a ofrecer «Contar».
-- 2) relev_total_uni: en SC/SP se cuenta en CAJONES + KG.
--      · kg cargado a mano (se pesó) -> uni = round(kg / kg_x_uni). Los cajones quedan como dato.
--      · si no, cajones -> uni = round(cajones × uni_x_cajon)   (kg = uni × kg_x_uni, lo muestra la pantalla)
--      · pieza sin kg_x_uni ni factor -> se cuenta suelta (sueltas = uni), igual que el resto.
--    relevamiento_item.kg guarda SOLO el kg pesado a mano; NULL = «calculado de los cajones».
-- 3) relevamiento_detalle: devuelve 'caj_kg' (true en SC/SP) para que la pantalla arme la planilla.
--    ADENDA (mismo dia) [Thomas: «Agregar también sector movimiento»]: entra el Sector Movimiento
--    (3) con la misma planilla. Sus 63 piezas no tienen kg_x_uni ni uni_x_cajon (son WIP entre
--    matrices, CONOCIMIENTO §2c-undecies), asi que hoy se cuentan en uni directo; si algun dia se
--    cargan esos datos, los cajones y el kg aparecen solos.
-- 4) relevamiento_abrir: sin cronograma, la fecha es HOY en Argentina (current_date es UTC: después
--    de las 21:00 daba mañana).
-- ============================================================================================

create or replace function "GP2".relev_total_uni(p_componente_id bigint, p_envases numeric, p_sueltas numeric, p_kg numeric)
 returns numeric
 language plpgsql
 stable
 set search_path to 'GP2'
as $function$
DECLARE f numeric; es_kg boolean; env text; um text; kxu numeric; v_sector bigint;
BEGIN
  SELECT rf.factor, rf.cuenta_kg, rf.envase INTO f, es_kg, env
  FROM "GP2".relev_factor(p_componente_id) rf;
  SELECT c.unidad_medida, nullif(c.kg_x_uni,0), c.sector_id INTO um, kxu, v_sector
  FROM "GP2".componente c WHERE c.id=p_componente_id;

  -- SC / SP: cajones + kg [Thomas 09/10]. El kg pesado manda sobre los cajones para las unidades;
  -- los cajones quedan como dato contado.
  IF v_sector IN (1, 2, 3) THEN
    IF p_kg IS NOT NULL THEN
      IF kxu IS NULL THEN RETURN NULL; END IF;
      RETURN round(p_kg / kxu);
    END IF;
    IF p_envases IS NOT NULL AND f IS NOT NULL THEN
      RETURN round(p_envases * f) + coalesce(p_sueltas,0);
    END IF;
    RETURN p_sueltas;                         -- sin factor: se cuenta suelto
  END IF;

  IF es_kg THEN
    IF p_kg IS NULL THEN RETURN NULL; END IF;
    IF um = 'kg' THEN RETURN p_kg; END IF;
    IF kxu IS NULL THEN RETURN NULL; END IF;
    RETURN round(p_kg / kxu);
  END IF;

  -- sin envase (solo sueltas): el total es lo suelto y punto
  IF env IS NULL THEN RETURN p_sueltas; END IF;

  IF coalesce(p_envases,0) = 0 THEN RETURN coalesce(p_sueltas,0); END IF;
  IF f IS NULL THEN RETURN NULL; END IF;
  RETURN p_envases * f + coalesce(p_sueltas,0);
END $function$;

create or replace function "GP2".relevamiento_abrir(p_sector_id bigint, p_crono_id bigint default null::bigint, p_encargado text default null::text)
 returns bigint
 language plpgsql
 security definer
 set search_path to 'GP2'
as $function$
DECLARE v_id bigint; v_fecha date;
BEGIN
  perform "GP2"._exigir_autorizado();  -- seguridad punto 1 fase B (2026-09-28)
  IF p_sector_id IS NULL THEN
    RAISE EXCEPTION 'Este tipo de conteo todavia no tiene sector asignado';
  END IF;

  SELECT r.id INTO v_id FROM "GP2".relevamiento r
  WHERE r.sector_id = p_sector_id AND r.estado IN ('en_curso','contado')
    AND (p_crono_id IS NULL OR r.cronograma_id IS NOT DISTINCT FROM p_crono_id)
  ORDER BY r.id DESC LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  SELECT k.fecha INTO v_fecha FROM "GP2".relevamiento_cronograma k WHERE k.id = p_crono_id;

  -- sin cronograma (SC/SP, a demanda) la fecha es HOY en Argentina (2026-10-09)
  INSERT INTO "GP2".relevamiento (sector_id, fecha, encargado, cronograma_id)
  VALUES (p_sector_id, coalesce(v_fecha, (now() at time zone 'America/Argentina/Buenos_Aires')::date),
          nullif(trim(p_encargado),''), p_crono_id)
  RETURNING id INTO v_id;

  -- La materia prima BRUTA de un PS hibrido (proveedor_servicio.mp_componente_id: ALAMBRE -> Charcas,
  -- FLEJE_DESCORAZONADOR -> Eclipse) no se cuenta: el proveedor la entrega directo al PS y nunca pasa
  -- por Cervantes; su stock vive en la ubicacion del PS [usuario 2026-09-30: "no tenemos esos flejes
  -- en cervantes"]. Contarla aca la sumaria al sector por error.
  INSERT INTO "GP2".relevamiento_item (relevamiento_id, componente_id)
  SELECT v_id, c.id FROM "GP2".componente c WHERE c.sector_id = p_sector_id
     AND NOT EXISTS (SELECT 1 FROM "GP2".proveedor_servicio ps WHERE ps.mp_componente_id = c.id)
  ON CONFLICT DO NOTHING;

  RETURN v_id;
END $function$;

create or replace function "GP2".relevamiento_detalle(p_id bigint)
 returns jsonb
 language sql
 stable security definer
 set search_path to 'GP2'
as $function$
  select jsonb_build_object(
    'relevamiento', to_jsonb(r) - 'creado_en',
    'sector', s.nombre,
    -- SC / SP se cuentan en cajones + kg (2026-10-09)
    'caj_kg', (r.sector_id in (1, 2, 3)),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'item_id', ri.id,
        'comp_id', c.id,
        'codigo', c.codigo,
        'descripcion', c.descripcion,
        'unidad', c.unidad_medida,
        'factor', rf.factor,
        'envase', rf.envase,
        'cuenta_kg', rf.cuenta_kg,
        'kg_x_uni', c.kg_x_uni,
        'envases', ri.envases,
        'sueltas', ri.sueltas,
        'kg', ri.kg,
        'total_uni', ri.total_uni,
        'contado', ri.contado,
        'stock_programa', coalesce((
          select i.cantidad from "GP2".inventario i
          where i.componente_id = c.id and i.ubicacion_id = "GP2".ubic_de('sector', r.sector_id)
          limit 1), 0)
      ) order by c.codigo)
      from "GP2".relevamiento_item ri
      join "GP2".componente c on c.id = ri.componente_id
      cross join lateral "GP2".relev_factor(c.id) rf
      where ri.relevamiento_id = r.id
    ), '[]'::jsonb)
  )
  from "GP2".relevamiento r join "GP2".sector s on s.id = r.sector_id
  where r.id = p_id;
$function$;

create or replace function "GP2".relevamiento_bundle()
 returns jsonb
 language sql
 stable security definer
 set search_path to 'GP2'
as $function$
  with base as (
    select k.*, k.sector_id::text as clave
    from "GP2".relevamiento_cronograma k
    where k.sector_id is not null                 -- sin sector no se muestra
      and not exists (                            -- ya validado: fuera, que pase el siguiente
        select 1 from "GP2".relevamiento r
        where r.cronograma_id = k.id and r.estado = 'aplicado'
      )
  ),
  prox as (
    select distinct on (b.clave) b.clave, b.tipo, b.sector_id, b.fecha, b.id crono_id
    from base b where b.fecha > current_date
    order by b.clave, b.fecha
  ),
  ult as (
    select distinct on (b.clave) b.clave, b.tipo, b.sector_id, b.fecha, b.id crono_id
    from base b
    where not exists (select 1 from prox p where p.clave = b.clave)
    order by b.clave, b.fecha desc
  ),
  fila as (select * from prox union all select * from ult),
  hoy as (select (now() at time zone 'America/Argentina/Buenos_Aires')::date d)
  select jsonb_build_object(
    'hoy', current_date,
    'cronograma', coalesce(jsonb_agg(x order by x->>'fecha'), '[]'::jsonb)
  )
  from (
    select jsonb_build_object(
      'tipo', f.tipo, 'sector_id', f.sector_id, 'sector', s.nombre,
      'crono_id', f.crono_id, 'fecha', f.fecha, 'dias', (f.fecha - current_date),
      'vencido', (f.fecha < current_date),
      -- mismo criterio que relevamiento_abrir: sin la MP bruta de los PS hibridos
      'componentes', (select count(*) from "GP2".componente c where c.sector_id = f.sector_id
                        and not exists (select 1 from "GP2".proveedor_servicio ps where ps.mp_componente_id = c.id)),
      'relevamiento', (
        select jsonb_build_object('id', r.id, 'estado', r.estado,
                 'contados', (select count(*) from "GP2".relevamiento_item ri
                              where ri.relevamiento_id = r.id and ri.contado),
                 'items', (select count(*) from "GP2".relevamiento_item ri
                           where ri.relevamiento_id = r.id))
        from "GP2".relevamiento r
        where r.cronograma_id = f.crono_id and r.estado <> 'anulado'
        order by r.id desc limit 1
      )
    ) x
    from fila f join "GP2".sector s on s.id = f.sector_id
    union all
    -- SC y SP: a demanda, sin cronograma [Thomas 09/10: «que aparezca el stock de hoy»].
    -- Su conteo es el abierto (en_curso/contado) o el que se aplico HOY; mañana vuelve «Contar».
    select jsonb_build_object(
      'tipo', case s.id when 1 then 'Crudo (SC)' when 2 then 'Procesado (SP)' else 'Movimiento' end,
      'sector_id', s.id, 'sector', s.nombre,
      'crono_id', null, 'fecha', h.d, 'dias', 0, 'vencido', false, 'a_demanda', true,
      'componentes', (select count(*) from "GP2".componente c where c.sector_id = s.id
                        and not exists (select 1 from "GP2".proveedor_servicio ps where ps.mp_componente_id = c.id)),
      'relevamiento', (
        select jsonb_build_object('id', r.id, 'estado', r.estado,
                 'contados', (select count(*) from "GP2".relevamiento_item ri
                              where ri.relevamiento_id = r.id and ri.contado),
                 'items', (select count(*) from "GP2".relevamiento_item ri
                           where ri.relevamiento_id = r.id))
        from "GP2".relevamiento r
        where r.sector_id = s.id and r.cronograma_id is null
          and (r.estado in ('en_curso','contado')
               or (r.estado = 'aplicado'
                   and (r.aplicado_en at time zone 'America/Argentina/Buenos_Aires')::date = h.d))
        order by r.id desc limit 1
      )
    ) x
    from "GP2".sector s cross join hoy h
    where s.id in (1, 2, 3)
  ) t;
$function$;
