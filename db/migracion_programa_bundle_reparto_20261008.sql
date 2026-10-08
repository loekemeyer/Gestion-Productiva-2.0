-- =====================================================================
-- programa_bundle + 'reparto' (2026-10-08) — Despiece x Art (Programa/Programa.html)
-- [Nazareno, textual: "todos los artículos que tienen 2 talleristas (modelado en Proporciones) quiero
--  que me aparezca en el módulo de Despiece x Art. Por ejemplo: en la imagen aparece solo Alex
--  Escalante como tallerista que ensambla y también entrega Martín Cornejo"].
--
-- Hasta hoy la pantalla, con 2+ talleristas en el artículo, mostraba un selector y dibujaba sólo las
-- rutas del elegido: el otro no aparecía en ningún lado. Ahora junta las rutas duplicadas por
-- tallerista (misma ruta, distinto tallerista) y nombra a todos con su %. El % sale de acá: la misma
-- v_reparto_efectivo de Proporciones y de los máximos (n_tall > 1 = sólo los pasos compartidos).
-- Solo agrega una clave al jsonb: ninguna otra cambia. Grants sin cambio (CREATE OR REPLACE).
-- =====================================================================

CREATE OR REPLACE FUNCTION "GP2".programa_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
with ruta_fleje as (
  select distinct on (rp.ruta_id) rp.ruta_id, rp.comp_entrada_id fl
  from "GP2".ruta_paso rp
  join "GP2".componente c on c.id = rp.comp_entrada_id and c.sector_id in (5, 13)
  where rp.tipo_paso = 'ingreso' and rp.orden = 1
  order by rp.ruta_id, rp.orden
),
rutas_full as (
  select r.id, r.nombre nom, rf.fl f, r.articulo_id a
  from "GP2".ruta r left join ruta_fleje rf on rf.ruta_id = r.id
)
select jsonb_build_object(
  'art', (select jsonb_agg(jsonb_build_object('id',id,'cod',codigo,'fam',familia,'d',descripcion,'mk',marca,'disc',discontinuado) order by id) from "GP2".articulo),
  'comp', (select jsonb_object_agg(c.id::text, jsonb_build_object('cod',c.codigo,'d',c.descripcion,'s',c.sector_id)
         /* v1.217.0: el proveedor que compra la pieza (componente.proveedor + los alternativos),
            para dibujarlo como primer paso de la ruta en Despiece x Art. Sin proveedor no viaja la clave. */
         || jsonb_strip_nulls(jsonb_build_object('pv', nullif(btrim(c.proveedor),''),
              'pva', (select jsonb_agg(distinct btrim(a.proveedor)) from "GP2".componente_proveedor_alt a
                       where a.componente_id = c.id and nullif(btrim(a.proveedor),'') is not null
                         and btrim(a.proveedor) is distinct from btrim(c.proveedor)))))
         from "GP2".componente c),
  'fl', '{}'::jsonb,
  'mat', (select jsonb_object_agg(id::text, jsonb_build_object('n',n_matriz,'d',descripcion,'t',tipo,'r',partes_por_kilo_de_fleje,'p',(partes_por_kilo_de_fleje is not null))) from "GP2".matriz),
  'prov', (select jsonb_object_agg(id::text, jsonb_build_object('n',nombre,'p',proceso)) from "GP2".proveedor_servicio),
  'provat', (select jsonb_object_agg(id::text, nombre) from "GP2".proveedor_at),
  'tall', (select jsonb_object_agg(id::text, nombre) from "GP2".tallerista),
  'bom', (select jsonb_agg(jsonb_build_object('a',articulo_id,'c',componente_id,'q',cantidad)) from "GP2".articulo_componente),
  'children', (select jsonb_object_agg(componente_padre_id::text, arr) from (
       select componente_padre_id, jsonb_agg(jsonb_build_object('c',componente_hijo_id,'q',cantidad)) arr
       from "GP2".componente_bom where componente_padre_id is not null group by componente_padre_id) x),
  'rutas', (select jsonb_agg(jsonb_build_object('id',id,'nom',nom,'f',f,'a',a) order by id) from rutas_full),
  'rp', (select jsonb_object_agg(ruta_id::text, arr) from (
       select rp.ruta_id, jsonb_agg(jsonb_build_object('o',rp.orden,'tp',rp.tipo_paso,'m',rp.matriz_id,'pr',rp.proveedor_id,'ta',rp.tallerista_id,'pat',rp.proveedor_at_id,'ce',rp.comp_entrada_id,'cs',rp.comp_salida_id,
            'fl', case when rp.tipo_paso = 'ingreso' and rp.orden = 1 and ce.sector_id = 5 then rp.comp_entrada_id end,
            'a',  case when rp.tipo_paso = 'virgilio' then r.articulo_id end) order by rp.orden) arr
       from "GP2".ruta_paso rp
       left join "GP2".componente ce on ce.id = rp.comp_entrada_id
       left join "GP2".ruta r on r.id = rp.ruta_id
       where rp.ruta_id is not null group by rp.ruta_id) x),
  'tall_art', (select jsonb_object_agg(a::text, arr) from (
       select r.articulo_id a, jsonb_agg(distinct t.nombre) arr
       from "GP2".ruta_paso rp join "GP2".ruta r on r.id = rp.ruta_id join "GP2".tallerista t on t.id = rp.tallerista_id
       join "GP2".componente cs on cs.id = rp.comp_salida_id
       where rp.tallerista_id is not null and r.articulo_id is not null and cs.sector_id = 12 group by r.articulo_id) x),
  /* 2026-10-08 [Nazareno]: el % de cada tallerista en un paso que hacen 2+ (Proporciones):
     {articulo: {comp_salida: {tallerista: {p: pct, s: es_supuesto}}}}. Despiece x Art muestra a
     TODOS los que arman, con su parte, en vez de elegir uno. Sale de v_reparto_efectivo, la misma
     vista que usan Proporciones y los maximos. */
  'reparto', (select jsonb_object_agg(a::text, m) from (
       select articulo_id a, jsonb_object_agg(comp_salida_id::text, t) m from (
         select articulo_id, comp_salida_id,
                jsonb_object_agg(tallerista_id::text, jsonb_build_object('p', pct, 's', es_supuesto)) t
         from "GP2".v_reparto_efectivo where n_tall > 1 group by articulo_id, comp_salida_id) x
       group by articulo_id) y),
  'sect', (select jsonb_object_agg(id::text, jsonb_build_object('t',tipo)) from "GP2".sector),
  'rutas_by_art', (select jsonb_object_agg(a::text, arr) from (
       select a, jsonb_agg(jsonb_build_object('id',id,'nom',nom,'f',f,'a',a) order by id) arr
       from rutas_full where a is not null group by a) x)
);
$function$
;
