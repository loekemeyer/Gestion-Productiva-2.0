-- =====================================================================
-- PROPORCIONES: el % vuelve a editarse en la pantalla, y cada número es de ESTE artículo (2026-09-30)
-- [usuario 2026-09-30, sobre Proporciones_GP2: "la proporcion en porcentaje la puedo cambiar
--  escribiendo" -> confirmado "Sí, con Guardar"; y "no entiendo los números"].
--
-- 1) proporciones_bundle manda lo que hace falta para mostrar (y recalcular a la vista, mientras se
--    escribe el %) el máximo que le toca a cada tallerista POR ESTE ARTÍCULO:
--      demanda del artículo para esa parte (dem_mes, de v_consumo_demanda) x su % x meses de su casa.
--    Hasta hoy la celda era inventario.maximo, que es el TOTAL de esa parte en la casa del
--    tallerista sumando TODOS sus artículos: en el 123 al 50/50, A11 decía Danica 1.224 / Lucho
--    1.508, cuando del 123 les toca 96 a cada uno (el resto es del 505 y otros). Ese total sigue
--    viajando (maximo) y la pantalla lo muestra chico abajo cuando es distinto.
--    Además: las partes se toman del PASO compartido (comp_salida), no de cualquier paso del
--    tallerista en ese artículo, y tiene_fila dice si la parte existe en su inventario (sin fila,
--    la tablet no sabe que se la tiene que mandar).
-- 2) reparto_guardar: exige usuario habilitado (seguridad fase B) y EXECUTE sólo para
--    authenticated; además pide el % de TODOS los que hacen el paso (con uno solo, v_reparto_efectivo
--    lo tomaba como "sin definir" y lo repartía mitad y mitad).
--
-- POR QUÉ SE VUELVE A ABRIR (el 15-09 se cerró, CONOCIMIENTO 4dw): el incidente fue un Guardar
-- que grabó el 50/50 que la pantalla mostraba de DEFAULT. Ahora el botón Guardar arranca apagado y
-- sólo se prende cuando alguien ESCRIBIÓ un % en ese paso y la suma da 100, y pide confirmación.
-- Un default nunca se graba sin que alguien lo haya tipeado.
-- =====================================================================

CREATE OR REPLACE FUNCTION "GP2".proporciones_bundle()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
with pasos as (
  select distinct r.articulo_id, a.codigo art_codigo, a.familia,
         rp.comp_salida_id, cs.codigo paso_cod, cs.descripcion paso_desc,
         rp.tallerista_id, t.nombre tallerista
    from ruta_paso rp
    join ruta r        on r.id = rp.ruta_id
    join articulo a    on a.id = r.articulo_id
    join componente cs on cs.id = rp.comp_salida_id
    join tallerista t  on t.id = rp.tallerista_id
   where rp.tallerista_id is not null
), compartidos as (
  select articulo_id, comp_salida_id
    from pasos group by 1, 2 having count(distinct tallerista_id) >= 2
), filas as (
  select p.*, re.pct, re.es_supuesto, u.meses_stock meses
    from pasos p
    join compartidos c on c.articulo_id = p.articulo_id and c.comp_salida_id = p.comp_salida_id
    left join v_reparto_efectivo re on re.articulo_id = p.articulo_id
     and re.comp_salida_id = p.comp_salida_id and re.tallerista_id = p.tallerista_id
    left join ubicacion u on u.tipo = 'tallerista' and u.ref_id = p.tallerista_id
), entradas as (
  -- que parte recibe cada tallerista PARA ESE PASO, y cuanto puede tener en su casa (total, todos
  -- sus articulos)
  select distinct r.articulo_id, rp.comp_salida_id, rp.tallerista_id, rp.comp_entrada_id,
         ce.codigo parte_cod, ce.descripcion parte_desc,
         i.id inv_id, i.maximo, i.cantidad, i.maximo_origen
    from ruta_paso rp
    join ruta r        on r.id = rp.ruta_id
    join componente ce on ce.id = rp.comp_entrada_id
    left join ubicacion u on u.tipo = 'tallerista' and u.ref_id = rp.tallerista_id
    left join inventario i on i.componente_id = rp.comp_entrada_id and i.ubicacion_id = u.id
   where rp.tallerista_id is not null and rp.comp_entrada_id is not null and r.articulo_id is not null
), partes_por_paso as (
  select e.articulo_id, e.comp_salida_id, e.comp_entrada_id, e.parte_cod, e.parte_desc,
         max(d.uni_mes) dem_mes,
         jsonb_agg(jsonb_build_object('tall_id', e.tallerista_id, 'maximo', e.maximo,
                                      'stock', e.cantidad, 'origen', e.maximo_origen,
                                      'tiene_fila', e.inv_id is not null)
                   order by e.tallerista_id) por_tall
    from entradas e
    join filas ff on ff.articulo_id = e.articulo_id and ff.comp_salida_id = e.comp_salida_id
                 and ff.tallerista_id = e.tallerista_id
    left join v_consumo_demanda d on d.articulo_id = e.articulo_id and d.componente_id = e.comp_entrada_id
   group by e.articulo_id, e.comp_salida_id, e.comp_entrada_id, e.parte_cod, e.parte_desc
)
select jsonb_build_object(
  'generado_en', now(),
  'pasos', coalesce((
     select jsonb_agg(x order by x->>'art_codigo', x->>'paso_cod') from (
       select jsonb_build_object(
         'articulo_id', f.articulo_id, 'art_codigo', f.art_codigo, 'familia', f.familia,
         'comp_salida_id', f.comp_salida_id, 'paso_cod', f.paso_cod, 'paso_desc', f.paso_desc,
         'n_talleristas', count(*),
         'suma_pct', round(sum(f.pct), 2),
         'talleristas', jsonb_agg(jsonb_build_object(
            'tall_id', f.tallerista_id, 'tallerista', f.tallerista, 'meses', f.meses,
            'pct', f.pct, 'es_supuesto', coalesce(f.es_supuesto, false)) order by f.tallerista),
         'partes', coalesce((
            select jsonb_agg(jsonb_build_object('comp_id', pp.comp_entrada_id, 'cod', pp.parte_cod,
                                                'desc', pp.parte_desc, 'dem_mes', pp.dem_mes,
                                                'por_tall', pp.por_tall) order by pp.parte_cod)
              from partes_por_paso pp
             where pp.articulo_id = f.articulo_id and pp.comp_salida_id = f.comp_salida_id), '[]'::jsonb)
       ) x
       from filas f
       group by f.articulo_id, f.art_codigo, f.familia, f.comp_salida_id, f.paso_cod, f.paso_desc
     ) s), '[]'::jsonb)
);
$function$
;
comment on function "GP2".proporciones_bundle() is 'Pantalla Proporciones: los pasos (articulo + comp_salida) que hacen 2 o mas talleristas, el % de cada uno (v_reparto_efectivo, que se edita con reparto_guardar) y las PARTES que recibe cada uno PARA ESE PASO: dem_mes (demanda del articulo para esa parte) para calcular lo que le toca de este articulo (dem_mes x % x meses), y el maximo TOTAL de su casa (todos sus articulos) con tiene_fila.';

CREATE OR REPLACE FUNCTION "GP2".reparto_guardar(p_articulo_id bigint, p_comp_salida_id bigint, p_filas jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'GP2'
AS $function$
declare v_suma numeric; v_n int; v_intruso text; v_falta text; v_cero int; v_max jsonb;
begin
  perform "GP2"._exigir_autorizado();  -- seguridad punto 1 fase B (2026-09-28)
  if p_articulo_id is null or p_comp_salida_id is null then
    raise exception 'Falta el articulo o el paso';
  end if;

  select count(*), coalesce(sum((f->>'pct')::numeric), 0),
         count(*) filter (where coalesce((f->>'pct')::numeric, 0) <= 0)
    into v_n, v_suma, v_cero from jsonb_array_elements(coalesce(p_filas, '[]'::jsonb)) f;

  if v_n > 0 then
    if v_cero > 0 then
      raise exception 'Un %% en 0 es que no hace el paso: eso se cambia en la ruta, no en Proporciones';
    end if;
    if abs(v_suma - 100) > 0.01 then
      raise exception 'Los porcentajes de un paso tienen que sumar 100 (suman %)', v_suma;
    end if;
    select string_agg(t.nombre, ', ') into v_intruso
      from jsonb_array_elements(p_filas) f
      join tallerista t on t.id = (f->>'tallerista_id')::bigint
     where not exists (
       select 1 from ruta_paso rp join ruta r on r.id = rp.ruta_id
        where r.articulo_id = p_articulo_id and rp.comp_salida_id = p_comp_salida_id
          and rp.tallerista_id = (f->>'tallerista_id')::bigint);
    if v_intruso is not null then
      raise exception 'Segun las rutas, % no hace ese paso', v_intruso;
    end if;
    -- con el % de uno solo, v_reparto_efectivo lo toma como "sin definir" y va mitad y mitad
    select string_agg(distinct t.nombre, ', ') into v_falta
      from ruta_paso rp join ruta r on r.id = rp.ruta_id
      join tallerista t on t.id = rp.tallerista_id
     where r.articulo_id = p_articulo_id and rp.comp_salida_id = p_comp_salida_id
       and not exists (select 1 from jsonb_array_elements(p_filas) f
                        where (f->>'tallerista_id')::bigint = rp.tallerista_id);
    if v_falta is not null then
      raise exception 'Falta el %% de %', v_falta;
    end if;
  end if;

  delete from reparto_tallerista
   where articulo_id = p_articulo_id and comp_salida_id = p_comp_salida_id;

  if v_n > 0 then
    insert into reparto_tallerista (articulo_id, comp_salida_id, tallerista_id, pct)
    select p_articulo_id, p_comp_salida_id, (f->>'tallerista_id')::bigint, (f->>'pct')::numeric
      from jsonb_array_elements(p_filas) f;
  end if;

  -- el maximo de cada tallerista sale de lo que le toca hacer: si cambia el reparto, cambia
  v_max := recalcular_maximos_talleristas(true);
  return jsonb_build_object('ok', true, 'filas', v_n, 'maximos', v_max);
end $function$
;
comment on function "GP2".reparto_guardar(bigint, bigint, jsonb) is 'Graba el % de cada tallerista en un paso compartido (articulo + comp_salida) y recalcula los maximos de tallerista. La llama Proporciones_GP2 (Guardar, que solo se prende si alguien escribio el % y suma 100). Valida: todos los que hacen el paso, ninguno en 0, suman 100, y ninguno que no haga el paso segun las rutas.';

revoke all on function "GP2".reparto_guardar(bigint, bigint, jsonb) from public, anon;
grant execute on function "GP2".reparto_guardar(bigint, bigint, jsonb) to authenticated, service_role;
