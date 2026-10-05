-- Enviar -> Virgilio (tablet): TODOS los terminados que produce Fabrica por MATRIZ, no solo el 280.
-- [usuario 2026-10-05: "se tienen que poder mandar no todos los art terminados sino todos los que
--  tienen stock porque produce fabrica a traves de matrices"]
--
-- Causa: el CTE `fab` de tablet_bundle (y la guarda de enviar_a_virgilio) pedian un paso del
-- tallerista Fabrica (id 3). Desde el 2026-10-02 el terminado lo cierra una MATRIZ de envasado
-- (CONOCIMIENTO 4ik/4il) y solo el 280 Manga conservo un paso tallerista 3: la tablet mostraba 1
-- terminado de 39 y, aunque se mostraran, la base rechazaba 38 ("no lo arma Fabrica").
-- stock_general_extra_bundle ya tenia el criterio correcto (4il); se iguala.
--
-- Criterio: terminado (sector 12) de un articulo activo cuya ruta tiene un paso tallerista 3
-- O un paso de matriz que lo expulsa (comp_salida = el terminado). 39 filas al 2026-10-05.
-- Cirugia sobre la definicion viva (reemplazo de texto con control): si el fragmento no esta,
-- o ya se aplico o la funcion cambio, y no se toca nada.
do $mig$
declare
  d text; d2 text;
  v_fab_old constant text := $f$fab as materialized (
  select distinct a.id art_id, a.codigo, a.articulos_por_caja uxc, c.id comp_id
    from articulo a
    join ruta r on r.articulo_id = a.id
    join ruta_paso rp on rp.ruta_id = r.id and rp.tallerista_id = 3
    join componente c on upper(c.codigo) = upper(a.codigo) and c.sector_id = 12
   where not a.discontinuado and not coalesce(c.discontinuado, false)
),$f$;
  v_fab_new constant text := $f$fab as materialized (
  -- Art. Terminado (Fabrica) = lo que se arma/envasa en casa: lo cierra una MATRIZ de envasado
  -- (modelo 2026-10-02) o el tallerista interno Fabrica (id 3, legado/Manga). MISMO criterio que el
  -- CTE fab de stock_general_extra_bundle: con solo "tallerista 3" Enviar -> Virgilio mostraba 1
  -- terminado (280) de los 39.
  select distinct a.id art_id, a.codigo, a.articulos_por_caja uxc, c.id comp_id
    from articulo a
    join componente c on upper(c.codigo) = upper(a.codigo) and c.sector_id = 12
    join ruta r on r.articulo_id = a.id
    join ruta_paso rp on rp.ruta_id = r.id
     and ( rp.tallerista_id = 3
        or (rp.tipo_paso = 'matriz' and rp.comp_salida_id = c.id) )
   where not a.discontinuado and not coalesce(c.discontinuado, false)
),$f$;
  v_g_old constant text := $f$    if not exists (select 1 from articulo a join ruta r on r.articulo_id = a.id
                     join ruta_paso rp on rp.ruta_id = r.id and rp.tallerista_id = 3
                    where upper(a.codigo) = upper(v_cod)) then
      raise exception 'El artículo % no lo arma Fábrica: no sale de acá.', v_cod;
    end if;$f$;
  v_g_new constant text := $f$    if not exists (select 1 from articulo a join ruta r on r.articulo_id = a.id
                     join ruta_paso rp on rp.ruta_id = r.id
                      and ( rp.tallerista_id = 3
                         or (rp.tipo_paso = 'matriz' and rp.comp_salida_id = p_comp_id) )
                    where upper(a.codigo) = upper(v_cod)) then
      raise exception 'El artículo % no lo produce Fábrica: no sale de acá.', v_cod;
    end if;$f$;
begin
  d := pg_get_functiondef('"GP2".tablet_bundle()'::regprocedure);
  if position(v_fab_old in d) > 0 then
    d2 := replace(d, v_fab_old, v_fab_new);
    if d2 = d then raise exception 'tablet_bundle: el reemplazo no cambio nada'; end if;
    execute d2;
  end if;

  d := pg_get_functiondef('"GP2".enviar_a_virgilio(bigint,numeric,text,timestamp with time zone,text)'::regprocedure);
  if position(v_g_old in d) > 0 then
    d2 := replace(d, v_g_old, v_g_new);
    if d2 = d then raise exception 'enviar_a_virgilio: el reemplazo no cambio nada'; end if;
    execute d2;
  end if;
end
$mig$;
