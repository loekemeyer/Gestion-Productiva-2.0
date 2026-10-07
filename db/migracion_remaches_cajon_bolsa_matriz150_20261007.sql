-- =====================================================================
-- REMACHES: crudos en CAJÓN de 25 kg, niquelados en BOLSA de 2/10 kg, y la MATRIZ 150 en las rutas (2026-10-07)
-- =====================================================================
-- Pedido (no se identificó quién habla; la sesión no lo dijo): «La matriz 150 Env Remaches sirve para pasar de los
-- cajones de remaches a bolsas más chiquitas. Los remaches crudos vienen en bolsas de 25 kg → se guardan en cajones
-- de 25 kg → se mandan a Guazzaroni para niquelar → vuelve en cajones de 25 kg → se guarda en las bolsas de 2 kg/10 kg.
-- En remaches crudos (los que arrancan con C) el stock es en cajones de 25 kg; en niquelados (V) en bolsas de 2/10 kg
-- con la matriz 150. A los talleristas se les manda bolsas de remaches (nunca cajones).» Bolsa por código, dictada:
-- V1 2 · V2 2 · V3 10 · V4 2 · V5 10 · V6 2 · V7 10 · V8 10 · V9 10 · V10 2 · V11 2 · V12 2 · V13 2 · V18 2 (V18D ya era 2).
-- «En la tablet, al poner M150, tienen que aparecer las variantes: todos los V menos V18 y V18D (que no se mandan a
-- niquelar).» «Las rutas en el despiece tienen que mostrar que después del niquelado vienen ya como V, pasan por la
-- matriz 150 y van de vuelta al sector V; este trazado sirve para mandar al tallerista en bolsa.»
--
-- Aplicado el 2026-10-07 contra la base, con "Sí" del dueño, en tres tandas. Todo es DATO (sin DDL): ninguna tabla,
-- función ni vista cambió, así que db/tablas_GP2.sql y db/funciones_GP2.sql quedan como estaban.
--
-- Qué NO cambia, medido con ensayo revertido antes de aplicar (parte C): costos (11 vistas con huella idéntica,
-- entre ellas v_costo_componente), máximos de inventario, stock. El motor de costos ignora los pasos con entrada =
-- salida (edges: comp_entrada_id <> comp_salida_id), así que la 150 NO suma mano de obra al costo del remache.

-- ── A) Crudos CV*: cajón de 25 kg (13 filas; el CV18D ya no existe).
--    Antes (uni_x_cajon): CV1 57143 · CV11 27285 · CV12 20683 · CV13 100000 · CV14 28571 · CV2 38685 · CV3 25543
--    · CV4 8450 · CV5 5155 · CV6 909.0909 · CV7 19361 · CV8 14631 · CV9 16666.6667  (20 kg los 10 primeros salvo
--    CV13 11 kg, CV9 10 kg y CV6 2 kg).
update "GP2".componente set uni_x_cajon = round(25 / kg_x_uni, 4)
 where codigo ~ '^CV[0-9]' and kg_x_uni > 0;

-- ── B1) Bolsa de V9 = 10 kg (antes 2 kg: 3527 uni) y de V18 = 2 kg (antes 11,01 kg: 766 uni). Las otras 12 ya
--    coincidían con lo dictado.
update "GP2".componente set uni_x_cajon = round(case codigo when 'V9' then 10 else 2 end / kg_x_uni, 4)
 where codigo in ('V9', 'V18');

-- ── B2) Los niquelados se ENVÍAN en bolsas (14 filas; V18D ya lo tenía): mismo mecanismo que GRJ5/GRJ6 y el plástico
--    (componente.entrega_unidad / entrega_uni_x sobreescriben el default cajones + uni_x_cajon).
update "GP2".componente set entrega_unidad = 'bolsas', entrega_uni_x = uni_x_cajon
 where codigo ~ '^V[0-9]' and codigo <> 'V18D' and entrega_unidad is null;

-- ⚠ SUPERADO el mismo 07/10 por db/migracion_remaches_se_matriz150_20261007.sql: la 150 ya NO es V → V, ahora toma VxSE (en
--    tránsito, cajón de 25 kg) y expulsa Vx, carga en bolsas y fabricar_stock convierte a remaches. La parte C queda como historia
--    (su guarda de idempotencia impide volver a correrla). Las partes A, B1 y B2 siguen vigentes.
-- ── C) La matriz 150 en las rutas: un paso 'matriz' V → [150] → V (entrada = salida) justo después del niquelado
--    (53 rutas con V1..V9, V11..V13) y, para V10 —que se compra ya como V—, justo después del paso 'insumo'
--    (rutas 373 y 375). 55 pasos nuevos, 118 pasos existentes corridos un lugar. Efecto: la 150 sale con 13 salidas
--    (V1..V13) en reg_prod_3_0_bundle → matriz_salidas, o sea el selector de variantes de la tablet de operarios.
--    Bloque de control: guarda la foto de 11 vistas y de inventario.maximo, aplica, vuelve a medir y ABORTA SOLO
--    (no guarda nada) si cambió una vista o un máximo, o si quedó un orden repetido o un paso sin actor.
--    v_modo='dry' siempre revierte e informa.
do $$
declare
  v_modo text := 'real';
  v_m bigint; v_n int; v_shift int; v_ins int;
  vistas text[] := array['v_costo_componente','v_consumo_demanda','v_oc_virgilio_demanda','v_hace_articulo','v_contraparte_parte','v_consumo_tallerista','v_componente_muerto','v_stock_mp_ps','v_consumo_fleje_kg_articulo','v_oc_virgilio_partes_tallerista','v_reparto_efectivo'];
  v text; i int := 0; n1 bigint; n2 bigint; rep text := ''; diffs int := 0;
  u int; w int; nsel int; csel text; nmax int;
begin
  select id into v_m from "GP2".matriz where n_matriz = '150';
  if v_m is null then raise exception 'no existe la matriz 150'; end if;
  -- guarda de idempotencia (agregada al guardar el archivo; la corrida del 07/10 partió de la 150 sin pasos)
  if exists (select 1 from "GP2".ruta_paso where matriz_id = v_m) then raise exception 'la 150 ya tiene pasos en las rutas: no se vuelve a aplicar'; end if;
  foreach v in array vistas loop
    i := i + 1;
    execute format('create temp table _b%s on commit drop as select x::text as t from "GP2".%I x', i, v);
  end loop;
  create temp table _bmax on commit drop as select componente_id, ubicacion_id, maximo::text mx, maximo_origen from "GP2".inventario;
  create temp table _tgt on commit drop as
    select rp.ruta_id, rp.orden as k, rp.comp_salida_id as v_id
      from "GP2".ruta_paso rp
      join "GP2".componente ce on ce.id = rp.comp_entrada_id
      join "GP2".componente cs on cs.id = rp.comp_salida_id
     where rp.tipo_paso = 'proveedor_servicio' and ce.codigo ~ '^CV[0-9]+$' and cs.codigo ~ '^V[0-9]+$'
    union all
    select rp.ruta_id, rp.orden, rp.comp_salida_id
      from "GP2".ruta_paso rp join "GP2".componente c on c.id = rp.comp_salida_id
     where rp.tipo_paso = 'insumo' and c.codigo = 'V10';
  select count(*) into v_n from _tgt;
  if v_n <> 55 or (select count(distinct ruta_id) from _tgt) <> 55 then raise exception 'objetivos inesperados: % filas', v_n; end if;
  update "GP2".ruta_paso rp set orden = rp.orden + 1 from _tgt t where rp.ruta_id = t.ruta_id and rp.orden > t.k;
  get diagnostics v_shift = row_count;
  insert into "GP2".ruta_paso (ruta_id, orden, tipo_paso, matriz_id, comp_entrada_id, comp_salida_id, cantidad)
    select t.ruta_id, t.k + 1, 'matriz', v_m, t.v_id, t.v_id, 1 from _tgt t;
  get diagnostics v_ins = row_count;
  set constraints all immediate;
  i := 0;
  foreach v in array vistas loop
    i := i + 1;
    execute format('select count(*) from (select x::text t from "GP2".%I x except select t from _b%s) a', v, i) into n1;
    execute format('select count(*) from (select t from _b%s except select x::text from "GP2".%I x) a', i, v) into n2;
    if n1 + n2 > 0 then diffs := diffs + 1; end if;
    rep := rep || format(E'\n  %s: +%s / -%s filas distintas', v, n1, n2);
  end loop;
  select count(*) into nmax from "GP2".inventario i2 join _bmax b on b.componente_id = i2.componente_id and b.ubicacion_id = i2.ubicacion_id where b.mx is distinct from i2.maximo::text or b.maximo_origen is distinct from i2.maximo_origen;
  select count(*) into u from (select ruta_id, orden from "GP2".ruta_paso group by 1,2 having count(*) > 1) d;
  select count(*) into w from "GP2".ruta_paso rp where rp.tipo_paso in ('matriz','proveedor_servicio','tallerista') and coalesce(rp.matriz_id, rp.proveedor_id, rp.tallerista_id) is null;
  select count(distinct rp.comp_salida_id), string_agg(distinct c.codigo, ',') into nsel, csel from "GP2".ruta_paso rp join "GP2".componente c on c.id = rp.comp_salida_id where rp.tipo_paso = 'matriz' and rp.matriz_id = v_m;
  rep := format(E'objetivos=%s desplazados=%s insertados=%s | orden_repetido=%s paso_sin_actor=%s | maximos_distintos=%s | salidas de la 150: %s (%s)', v_n, v_shift, v_ins, u, w, nmax, nsel, csel) || rep;
  if v_modo = 'dry' then raise exception E'ENSAYO REVERTIDO — %', rep; end if;
  if diffs > 0 or nmax > 0 or u > 0 or w > 0 then raise exception E'ABORTADO, nada se guardó — %', rep; end if;
end $$;

-- ── Verificación (resultado del 2026-10-07): CV* 25,00 kg · V3/V5/V7/V8/V9 10,00 kg · el resto de V 2,00 kg ·
--    14 V con entrega_unidad='bolsas' · 55 pasos de la 150 en 55 rutas · 13 salidas V1..V13 · 0 órdenes repetidos ·
--    0 rutas con huecos · ruta 237 = 1 ingreso CV9 | 2 proveedor_servicio CV9>V9 | 3 matriz V9>V9 M150 | 4 tallerista
--    V9>043 | 5 virgilio.
select codigo, round(kg_x_uni * uni_x_cajon, 2) kg, uni_x_cajon, entrega_unidad, entrega_uni_x
  from "GP2".componente where codigo ~ '^C?V[0-9]' order by (codigo ~ '^CV') desc, codigo;
select count(*) pasos_150, count(distinct rp.ruta_id) rutas, string_agg(distinct c.codigo, ',') salidas
  from "GP2".ruta_paso rp join "GP2".matriz m on m.id = rp.matriz_id join "GP2".componente c on c.id = rp.comp_salida_id
 where m.n_matriz = '150';

-- ↩ REVERTIR (en este orden; el DELETE de la parte C puede quedar colgado en el conector de la sesión, correrlo en el
--   SQL Editor):
-- C)  begin;
--     create temp table _d on commit drop as select ruta_id, orden k from "GP2".ruta_paso
--       where matriz_id = (select id from "GP2".matriz where n_matriz = '150');
--     delete from "GP2".ruta_paso where matriz_id = (select id from "GP2".matriz where n_matriz = '150');
--     update "GP2".ruta_paso rp set orden = rp.orden - 1 from _d d where rp.ruta_id = d.ruta_id and rp.orden > d.k;
--     commit;
-- B2) update "GP2".componente set entrega_unidad = null, entrega_uni_x = null
--      where codigo in ('V1','V2','V3','V4','V5','V6','V7','V8','V9','V10','V11','V12','V13','V18');
-- B1) update "GP2".componente set uni_x_cajon = 3527 where codigo = 'V9';
--     update "GP2".componente set uni_x_cajon = 766  where codigo = 'V18';
-- A)  update "GP2".componente c set uni_x_cajon = v.u from (values ('CV1',57143),('CV11',27285),('CV12',20683),
--       ('CV13',100000),('CV14',28571),('CV2',38685),('CV3',25543),('CV4',8450),('CV5',5155),('CV6',909.0909),
--       ('CV7',19361),('CV8',14631),('CV9',16666.6667)) v(c, u) where c.codigo = v.c;
