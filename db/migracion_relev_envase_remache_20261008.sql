-- 2026-10-08 · Relevamiento de Sector Remache partido en 2: BOLSAS y CAJONES.
-- [usuario 2026-10-08, textual: "Dividí en 2. 1) Bolsas para los que arrancan con V pero que no
--  terminan con SE y W1P, W2P, W3P, W4, W5, W6, W7P y W9B. Todos los que arrancan con W bolsas de
--  2 kilos los de V ya sabes de cuanto son las bolsas. 2) Cajones para todo el resto"]
--
-- Qué cambia: SOLO el rótulo del envase en el relevamiento. El factor (uni por envase) no se toca:
--   * los W de la lista ya tienen uni_x_cajon = 2 kg / kg_x_uni (W1P 1.667 × 0,0012 = 2,00 kg …).
--   * los V ya tienen su bolsa (2 kg o 10 kg, CONOCIMIENTO §4eo).
-- "W9B" no existe en GP2: es W9P (el único W que falta para completar el par con su "s/envasar":
-- W1PSE, W2PSE, W3PSE, W4SE, W5SE, W6SE, W7PSE, W9PSE). W1B (Grampa Batidor) no es de la serie.
--
-- Cómo: columna nueva componente.relev_envase (mismo criterio que relev_solo_sueltas: un dato del
-- relevamiento en la pieza, no una lista escrita en el JS). relev_factor la prefiere cuando está.
-- El default del Sector Remache (8) pasa de 'Bolsas' a 'Cajones' ("cajones para todo el resto").
-- relev_factor solo lo usan relev_total y relevamiento_detalle: nada fuera del relevamiento cambia.

alter table "GP2".componente add column if not exists relev_envase text;
alter table "GP2".componente drop constraint if exists componente_relev_envase_chk;
alter table "GP2".componente add constraint componente_relev_envase_chk
  check (relev_envase is null or btrim(relev_envase) <> '');
comment on column "GP2".componente.relev_envase is
  'Rótulo del envase en el relevamiento (Bolsas, Cajones…). NULL = el del sector (relev_factor). '
  'No cambia el factor: ése sigue siendo uni_x_cajon / entrega_uni_x. 2026-10-08: Remache en bolsas y cajones.';

CREATE OR REPLACE FUNCTION "GP2".relev_factor(p_componente_id bigint)
 RETURNS TABLE(factor numeric, envase text, cuenta_kg boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'GP2'
AS $function$
  -- Fuera del carton, el envase es uni_x_cajon; si la pieza no lo tiene y SI tiene su envase de
  -- entrega (componente.entrega_uni_x + entrega_unidad: Z21 cajas de 450, GRJ13/GRJ14 cajas de
  -- 100, GRJ21A/B cajas de 5400), se cuenta en ESE envase (2026-09-25; antes quedaba sin factor y
  -- el relevamiento solo dejaba cargar sueltas, contra la planilla que cuenta "Cajon/Bulto").
  select
    case
      when coalesce(c.relev_solo_sueltas,false) then null
      when c.sector_id = 10 and coalesce(c.es_pliego,false)
        then (select valor::numeric from "GP2".parametro where clave='pliego_uni_x_paquete')
      when c.sector_id = 10
        then nullif(c.entrega_uni_x,0)
      when c.sector_id = 11
        then (select valor::numeric from "GP2".parametro where clave='caja_uni_x_paquete')
      when c.sector_id = 5 then null                      -- fleje se cuenta en kg
      else coalesce(nullif(c.uni_x_cajon, 0), nullif(c.entrega_uni_x, 0))
    end,
    case
      when coalesce(c.relev_solo_sueltas,false) then null  -- sin envase: solo sueltas
      when c.relev_envase is not null then c.relev_envase  -- la pieza dice su envase (2026-10-08)
      when c.sector_id not in (5, 10, 11) and nullif(c.uni_x_cajon, 0) is null
           and nullif(c.entrega_uni_x, 0) is not null and c.entrega_unidad is not null
        then initcap(c.entrega_unidad)
      else case c.sector_id
        when 10 then case when coalesce(c.es_pliego,false) then 'Paq. de pliegos' else 'Paquetones' end
        when 11 then 'Paquetes'
        when  6 then 'Bolsas'
        when  7 then 'Bolsas'
        when  9 then 'Cajones'
        when  8 then 'Cajones'   -- Remache: cajones salvo los marcados 'Bolsas' (2026-10-08; antes 'Bolsas')
        else 'Cajones'
      end
    end,
    (c.sector_id = 5 and not coalesce(c.relev_solo_sueltas,false))
  from "GP2".componente c
  where c.id = p_componente_id;
$function$;

-- Las 23 bolsas: 15 V sin "SE" + 8 W. Se marca por regla + lista, y se verifica el conteo.
update "GP2".componente
   set relev_envase = 'Bolsas'
 where sector_id = 8
   and ((codigo ~ '^V' and codigo !~ 'SE$')
        or codigo in ('W1P','W2P','W3P','W4','W5','W6','W7P','W9P'));

-- Verificación: 23 Bolsas / 42 Cajones en el Sector Remache.
-- select rf.envase, count(*) from "GP2".componente c cross join lateral "GP2".relev_factor(c.id) rf
--  where c.sector_id = 8 group by 1;
