-- =====================================================================
-- Cambiar Tallerista / Prov. A.T. (2026-10-05)
-- Pedido del dueño (05/10, textual en CONOCIMIENTO_GP2.md §4iu): un módulo en Herramientas para
-- cambiar el tallerista o el prov. A.T. de un artículo. «El tema es cuando un art se envasa acá en
-- fábrica: ahí tendrías que mandar las partes al nuevo tallerista (la línea imaginaria estaría
-- antes de la matriz de envasado, excepto…)».
--
-- La LÍNEA IMAGINARIA = la matriz desde la cual lo haría un tallerista. Hasta ahí es Fábrica como
-- fábrica; de ahí al terminado es lo que el tallerista hace en su taller (él no registra matriz:
-- se lo controla por lo que entrega en Virgilio).
--   · por defecto: la matriz de ENVASADO (la que expulsa el terminado, sector 12);
--   · excepciones (13 artículos, las cargó el dueño): la línea va antes de otra matriz, y desde
--     ella TODA la cadena hasta el envasado pasa al tallerista:
--        942E 943E 944E 945E 948E -> matriz 505 (Armado Inox)
--        542 543 720 722          -> matriz 261 (Colocar Mgo a Ahueca Papa)   [la 237/237B sigue acá]
--        570 858                  -> matriz 194 (Remachado Pala Canelones)
--        507 707                  -> matriz 78  (Remachado Rompenuez)
--
-- Qué agrega:
--   1) GP2.articulo_linea_tallerista   las 13 excepciones (el resto usa el envasado)
--   2) GP2.contraparte_cambio          bitácora: cada cambio guarda los ruta_paso de antes y de después
--                                      (así se puede volver atrás a mano; nada se pierde)
--   3) GP2._linea_tallerista(art)      por ruta: dónde empieza lo del tallerista y qué parte entra
--   4) GP2._contrapartes_articulo(art) quién lo hace hoy (talleristas, prov. A.T., o Fábrica)
--   5) GP2._cambiar_contraparte(...)   el motor: valida, previsualiza y aplica (atómico)
--   6) GP2.cambiar_contraparte_preview / _aplicar / _bundle   lo que llama la pantalla
--
-- Cambios que hace al aplicar (todo en una transacción):
--   · tallerista -> tallerista : ruta_paso.tallerista_id de ESE tallerista en el artículo,
--                                reparto_tallerista, firma de ruta_revision (Despiece), y fila de
--                                inventario (0) de cada parte en la casa del nuevo.
--   · Fábrica -> tallerista    : en cada ruta, los pasos de matriz desde la línea hasta virgilio se
--                                reemplazan por UN paso tallerista (molde del 116); la matriz de la
--                                línea y todo lo posterior dejan de hacerse acá PARA ESE ARTÍCULO
--                                (la matriz sigue viva para los otros).
--   · prov. A.T. -> prov. A.T. : ruta_paso.proveedor_at_id, el padrón articulo_prov_at (el viejo
--                                queda activo=false, no se borra), reparto_prov_at e inventario.
-- NO toca: precios (precio_tallerista), stock existente, componentes, matrices ni recetas.
-- Avisa (no bloquea): el nuevo no tiene precio cargado para el artículo, no tiene ubicación de stock,
-- el que sale todavía tiene stock de esas partes.
-- Idempotente: se puede volver a correr.
-- =====================================================================

-- 1) Línea imaginaria: las excepciones --------------------------------
create table if not exists "GP2".articulo_linea_tallerista (
  articulo_id bigint not null,
  matriz_id bigint not null,
  nota text,
  creado_en timestamp with time zone not null default now(),
  constraint articulo_linea_tallerista_pkey PRIMARY KEY (articulo_id),
  constraint articulo_linea_tallerista_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES "GP2".articulo(id) ON DELETE CASCADE,
  constraint articulo_linea_tallerista_matriz_id_fkey FOREIGN KEY (matriz_id) REFERENCES "GP2".matriz(id)
);
comment on table "GP2".articulo_linea_tallerista is 'Excepciones de la LINEA IMAGINARIA: matriz desde la cual un tallerista haria lo que hoy hace Fabrica, para los articulos donde NO es la matriz de envasado. Sin fila = la linea es el envasado (la matriz que expulsa el terminado). Desde esa matriz TODA la cadena hasta el envasado pasa al tallerista. Lo usa _linea_tallerista. [dueno 2026-10-05]';
alter table "GP2".articulo_linea_tallerista enable row level security;
drop policy if exists p_gp2_select on "GP2".articulo_linea_tallerista;
create policy p_gp2_select on "GP2".articulo_linea_tallerista for select to anon, authenticated using (true);

insert into "GP2".articulo_linea_tallerista (articulo_id, matriz_id, nota)
select a.id, m.id, x.nota
  from (values
    ('942E', '505', 'dueno 05/10: la linea va antes de la 505 (Armado Inox): PEST1 + mango + pieza inox'),
    ('943E', '505', 'dueno 05/10: la linea va antes de la 505 (Armado Inox)'),
    ('944E', '505', 'dueno 05/10: la linea va antes de la 505 (Armado Inox)'),
    ('945E', '505', 'dueno 05/10: la linea va antes de la 505 (Armado Inox)'),
    ('948E', '505', 'dueno 05/10: la linea va antes de la 505 (Armado Inox)'),
    ('542',  '261', 'dueno 05/10: la linea va antes de la 261; el capuchon (237) lo pone Fabrica y se manda PC10-M237'),
    ('543',  '261', 'dueno 05/10: la linea va antes de la 261; el capuchon (237) lo pone Fabrica y se manda PC10-M237'),
    ('720',  '261', 'dueno 05/10: la linea va antes de la 261; insertos y ojales (237B) los pone Fabrica'),
    ('722',  '261', 'dueno 05/10: la linea va antes de la 261; insertos y ojales (237B) los pone Fabrica'),
    ('570',  '194', 'dueno 05/10: la linea va antes de la 194 (remachado de la pala)'),
    ('858',  '194', 'dueno 05/10: la linea va antes de la 194 (remachado de la pala)'),
    ('507',  '78',  'dueno 05/10: la linea va antes de la 78 (remachado del rompenuez)'),
    ('707',  '78',  'dueno 05/10: la linea va antes de la 78 (remachado del rompenuez)')
  ) as x(cod, n, nota)
  join "GP2".articulo a on a.codigo = x.cod
  join "GP2".matriz m on m.n_matriz = x.n
on conflict (articulo_id) do nothing;

-- 2) Bitácora ---------------------------------------------------------
create table if not exists "GP2".contraparte_cambio (
  id bigint generated by default as identity not null,
  articulo_id bigint not null,
  tipo text not null,
  desde_id bigint,
  hasta_id bigint not null,
  usuario text,
  en timestamp with time zone not null default now(),
  pasos_antes jsonb not null default '[]'::jsonb,
  pasos_despues jsonb not null default '[]'::jsonb,
  resumen jsonb,
  constraint contraparte_cambio_pkey PRIMARY KEY (id),
  constraint contraparte_cambio_tipo_chk CHECK ((tipo = ANY (ARRAY['tallerista'::text, 'prov_at'::text, 'fabrica_a_tallerista'::text])))
);
comment on table "GP2".contraparte_cambio is 'Bitacora de Cambiar Tallerista / Prov. A.T.: cada cambio guarda los ruta_paso de ANTES y de DESPUES (fila entera en jsonb) y quien lo hizo. desde_id null = lo hacia Fabrica (matrices). Solo la escribe _cambiar_contraparte; no se borra. 2026-10-05.';
create index if not exists contraparte_cambio_articulo_idx on "GP2".contraparte_cambio using btree (articulo_id, en desc);
alter table "GP2".contraparte_cambio enable row level security;
drop policy if exists p_gp2_select on "GP2".contraparte_cambio;
create policy p_gp2_select on "GP2".contraparte_cambio for select to anon, authenticated using (true);

-- 3) _linea_tallerista: por ruta, donde empieza lo del tallerista --------
create or replace function "GP2"._linea_tallerista(p_articulo bigint)
 returns table (o_ruta bigint, o_ini integer, o_vir integer, o_entra bigint, o_sale bigint, o_pasos bigint[], o_mats bigint[])
 language plpgsql
 stable security definer
 set search_path to 'GP2', 'pg_temp'
as $function$
declare
  v_terms bigint[]; v_term bigint; v_seeds bigint[]; v_excep bigint; v_reg bigint[];
  v_ruta record; v_ini integer; v_vir integer;
begin
  select array_agg(distinct rp.comp_entrada_id) into v_terms
    from ruta r join ruta_paso rp on rp.ruta_id = r.id
   where r.articulo_id = p_articulo and rp.tipo_paso = 'virgilio';
  if v_terms is null then
    raise exception 'El articulo % no tiene paso virgilio en sus rutas.', p_articulo;
  end if;
  if cardinality(v_terms) > 1 then
    raise exception 'El articulo % termina en mas de un componente.', p_articulo;
  end if;
  v_term := v_terms[1];

  select l.matriz_id into v_excep from articulo_linea_tallerista l where l.articulo_id = p_articulo;
  if v_excep is not null then
    v_seeds := array[v_excep];
  else
    select array_agg(distinct rp.matriz_id) into v_seeds
      from ruta r join ruta_paso rp on rp.ruta_id = r.id
     where r.articulo_id = p_articulo and rp.tipo_paso = 'matriz' and rp.comp_salida_id = v_term;
  end if;
  if v_seeds is null then
    raise exception 'El articulo % no se cierra con una matriz de Fabrica: no hay nada que mandar a un tallerista.', p_articulo;
  end if;

  -- region = la matriz de la linea + toda matriz que consume lo que ella (o las siguientes) expulsa
  with recursive paso as (
    select rp.tipo_paso, rp.matriz_id, rp.comp_entrada_id, rp.comp_salida_id
      from ruta r join ruta_paso rp on rp.ruta_id = r.id
     where r.articulo_id = p_articulo
  ), reg(matriz_id) as (
    select unnest(v_seeds)
    union
    select p2.matriz_id
      from reg
      join paso p1 on p1.tipo_paso = 'matriz' and p1.matriz_id = reg.matriz_id
      join paso p2 on p2.tipo_paso = 'matriz' and p2.comp_entrada_id = p1.comp_salida_id
  )
  select array_agg(reg.matriz_id) into v_reg from reg;

  for v_ruta in select r.id from ruta r where r.articulo_id = p_articulo order by r.id loop
    select min(rp.orden) into v_ini from ruta_paso rp
     where rp.ruta_id = v_ruta.id and rp.tipo_paso = 'matriz' and rp.matriz_id = any(v_reg);
    select min(rp.orden) into v_vir from ruta_paso rp
     where rp.ruta_id = v_ruta.id and rp.tipo_paso = 'virgilio';
    if v_vir is null then
      raise exception 'La ruta % del articulo % no termina en virgilio.', v_ruta.id, p_articulo;
    end if;
    if v_ini is null then
      raise exception 'La ruta % del articulo % no pasa por la linea del tallerista.', v_ruta.id, p_articulo;
    end if;
    if exists (select 1 from ruta_paso rp
                where rp.ruta_id = v_ruta.id and rp.orden >= v_ini and rp.orden < v_vir
                  and not (rp.tipo_paso = 'matriz' and rp.matriz_id = any(v_reg))) then
      raise exception 'La ruta % del articulo % tiene un paso que no es de matriz entre la linea y virgilio.', v_ruta.id, p_articulo;
    end if;
    o_ruta := v_ruta.id; o_ini := v_ini; o_vir := v_vir;
    select rp.comp_entrada_id into o_entra from ruta_paso rp where rp.ruta_id = v_ruta.id and rp.orden = v_ini;
    select rp.comp_salida_id into o_sale from ruta_paso rp
     where rp.ruta_id = v_ruta.id and rp.orden < v_vir order by rp.orden desc limit 1;
    if o_sale is distinct from v_term then
      raise exception 'La ruta % del articulo % no termina en su terminado.', v_ruta.id, p_articulo;
    end if;
    select array_agg(rp.id order by rp.orden), array_agg(rp.matriz_id order by rp.orden)
      into o_pasos, o_mats
      from ruta_paso rp where rp.ruta_id = v_ruta.id and rp.orden >= v_ini and rp.orden < v_vir;
    return next;
  end loop;
end $function$;

-- 4) _contrapartes_articulo: quien lo hace hoy ------------------------
create or replace function "GP2"._contrapartes_articulo(p_art bigint)
 returns jsonb
 language sql
 stable security definer
 set search_path to 'GP2', 'pg_temp'
as $function$
with term as (
  select min(rp.comp_entrada_id) comp_id
    from ruta r join ruta_paso rp on rp.ruta_id = r.id
   where r.articulo_id = p_art and rp.tipo_paso = 'virgilio'
), cierre as (
  select min(m.id) matriz_id
    from ruta r join ruta_paso rp on rp.ruta_id = r.id
    join matriz m on m.id = rp.matriz_id
   where r.articulo_id = p_art and rp.tipo_paso = 'matriz' and rp.comp_salida_id = (select comp_id from term)
), tall as (
  select rp.tallerista_id,
         jsonb_agg(distinct cs.codigo) hace,
         bool_or(rp.comp_salida_id = (select comp_id from term)) final
    from ruta r join ruta_paso rp on rp.ruta_id = r.id
    join componente cs on cs.id = rp.comp_salida_id
   where r.articulo_id = p_art and rp.tipo_paso = 'tallerista'
   group by rp.tallerista_id
), pat as (
  select pa.id, pa.nombre
    from proveedor_at pa
   where pa.id in (select rp.proveedor_at_id from ruta r join ruta_paso rp on rp.ruta_id = r.id
                    where r.articulo_id = p_art and rp.tipo_paso = 'proveedor_at')
      or pa.id in (select ap.proveedor_at_id from articulo_prov_at ap join articulo a on a.codigo = ap.cod_art
                    where a.id = p_art and coalesce(ap.activo, true))
)
select jsonb_build_object(
  'tall', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'n', t.nombre, 'hace', x.hace, 'final', x.final)
                                      order by t.nombre)
                      from tall x join tallerista t on t.id = x.tallerista_id), '[]'::jsonb),
  'pat',  coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'n', p.nombre) order by p.nombre) from pat p), '[]'::jsonb),
  'fab',  ((select matriz_id from cierre) is not null
           and not exists (select 1 from tall where final)
           and not exists (select 1 from ruta r join ruta_paso rp on rp.ruta_id = r.id
                            where r.articulo_id = p_art and rp.tipo_paso = 'proveedor_at')),
  'linea', (select jsonb_build_object('n', m.n_matriz, 'd', m.descripcion,
                                      'ex', exists (select 1 from articulo_linea_tallerista l where l.articulo_id = p_art))
              from matriz m
             where m.id = coalesce((select l.matriz_id from articulo_linea_tallerista l where l.articulo_id = p_art),
                                   (select matriz_id from cierre)))
);
$function$;

-- 5) El motor ---------------------------------------------------------
create or replace function "GP2"._cambiar_contraparte(p_articulo bigint, p_tipo text, p_desde bigint, p_hasta bigint, p_usuario text, p_aplicar boolean)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'GP2', 'pg_temp'
as $function$
declare
  a record;
  v_bloq text[] := '{}';
  v_av jsonb := '[]'::jsonb;
  v_hasta_nom text; v_desde_nom text;
  v_ubic_hasta bigint; v_ubic_desde bigint;
  v_ids bigint[];
  v_comps bigint[];
  v_partes jsonb := '[]'::jsonb;
  v_dejan jsonb := '[]'::jsonb;
  v_antes jsonb := '[]'::jsonb;
  v_despues jsonb := '[]'::jsonb;
  v_sin_precio text;
  v_con_stock text;
  v_mo text;
  v_pasos int := 0;
  v_inv int := 0;
  v_pad int := 0;
  v_tipo_log text;
  v_nuevo bigint; v_log bigint;
  l record;
begin
  perform "GP2"._exigir_autorizado();
  if p_tipo not in ('tallerista', 'prov_at') then
    raise exception 'Tipo invalido: %. Tiene que ser tallerista o prov_at.', p_tipo;
  end if;
  select * into a from articulo where id = p_articulo;
  if not found then raise exception 'El articulo % no existe.', p_articulo; end if;
  if p_hasta is null then raise exception 'Falta elegir a quien pasa.'; end if;

  ---------------------------------------------------------------- TALLERISTA
  if p_tipo = 'tallerista' then
    select t.nombre into v_hasta_nom from tallerista t where t.id = p_hasta and coalesce(t.activo, true);
    if v_hasta_nom is null then
      v_bloq := array_append(v_bloq, 'El tallerista nuevo no existe o esta inactivo.');
    end if;
    if p_hasta = 3 then
      v_bloq := array_append(v_bloq, 'Fabrica no es un tallerista: para que lo siga haciendo Fabrica no hay que cambiar nada.');
    end if;
    select u.id into v_ubic_hasta from ubicacion u where u.tipo = 'tallerista' and u.ref_id = p_hasta order by u.id limit 1;
    if exists (select 1 from ruta_paso rp join ruta r on r.id = rp.ruta_id
                where r.articulo_id = p_articulo and rp.tipo_paso = 'tallerista' and rp.tallerista_id = p_hasta) then
      v_bloq := array_append(v_bloq, format('El articulo ya tiene a %s en su ruta: no se puede repetir.', coalesce(v_hasta_nom, p_hasta::text)));
    end if;
    if exists (select 1 from reparto_tallerista rt where rt.articulo_id = p_articulo and rt.tallerista_id = p_hasta) then
      v_bloq := array_append(v_bloq, format('Hay un reparto viejo cargado para %s en este articulo: hay que sacarlo antes.', coalesce(v_hasta_nom, p_hasta::text)));
    end if;

    if p_desde is not null then
      -- ===== tallerista -> tallerista
      v_tipo_log := 'tallerista';
      select t.nombre into v_desde_nom from tallerista t where t.id = p_desde;
      if p_desde = p_hasta then v_bloq := array_append(v_bloq, 'Elegi un tallerista distinto del actual.'); end if;
      select array_agg(rp.id order by rp.id) into v_ids
        from ruta_paso rp join ruta r on r.id = rp.ruta_id
       where r.articulo_id = p_articulo and rp.tipo_paso = 'tallerista' and rp.tallerista_id = p_desde;
      if v_ids is null then
        v_bloq := array_append(v_bloq, format('El articulo no lo hace %s.', coalesce(v_desde_nom, p_desde::text)));
        v_ids := '{}';
      end if;
      v_pasos := cardinality(v_ids);
      select array_agg(distinct rp.comp_entrada_id) into v_comps from ruta_paso rp
       where rp.id = any(v_ids) and rp.comp_entrada_id is not null;
      select u.id into v_ubic_desde from ubicacion u where u.tipo = 'tallerista' and u.ref_id = p_desde order by u.id limit 1;
      select string_agg(distinct cs.codigo, ', ') into v_sin_precio
        from ruta_paso rp join componente cs on cs.id = rp.comp_salida_id
       where rp.id = any(v_ids)
         and not exists (select 1 from precio_tallerista pt where pt.tallerista_id = p_hasta and pt.componente_id = rp.comp_salida_id);
    else
      -- ===== Fabrica -> tallerista (las partes salen de la linea imaginaria)
      v_tipo_log := 'fabrica_a_tallerista';
      v_ids := '{}';
      if exists (select 1 from ruta_paso rp join ruta r on r.id = rp.ruta_id join componente cs on cs.id = rp.comp_salida_id
                  where r.articulo_id = p_articulo and rp.tipo_paso = 'tallerista' and cs.sector_id = 12) then
        v_bloq := array_append(v_bloq, 'El articulo ya lo termina un tallerista: usa "Cambiar" sobre ese tallerista.');
      elsif exists (select 1 from ruta_paso rp join ruta r on r.id = rp.ruta_id
                     where r.articulo_id = p_articulo and rp.tipo_paso = 'proveedor_at') then
        v_bloq := array_append(v_bloq, 'El articulo lo entrega un prov. A.T., no Fabrica: usa "Cambiar" sobre ese prov. A.T.');
      elsif to_regprocedure('"GP2"._cc_quitar_pasos(bigint[])') is null then
        v_bloq := array_append(v_bloq, 'Falta crear la funcion _cc_quitar_pasos (db/migracion_cambiar_contraparte_20261005.sql, seccion 8): hay que correrla una vez en el SQL Editor.');
      else
        begin
          select array_agg(distinct x.o_entra), count(*)
            into v_comps, v_pasos
            from "GP2"._linea_tallerista(p_articulo) x;
        exception when others then
          v_bloq := array_append(v_bloq, sqlerrm);
          v_comps := null; v_pasos := 0;
        end;
        if v_pasos is null or v_pasos = 0 then v_comps := null; end if;
      end if;
    end if;

    -- partes que recibe el nuevo tallerista
    select coalesce(jsonb_agg(jsonb_build_object(
             'comp_id', c.id, 'cod', c.codigo, 'd', c.descripcion,
             'cantidad', coalesce((select ac.cantidad from articulo_componente ac
                                    where ac.articulo_id = p_articulo and ac.componente_id = c.id), 1))
             order by c.codigo), '[]'::jsonb)
      into v_partes from componente c where c.id = any(coalesce(v_comps, '{}'));

    if p_desde is null and cardinality(v_bloq) = 0 then
      -- matrices que dejan de hacerse aca para este articulo
      select coalesce(jsonb_agg(jsonb_build_object('n', m.n_matriz, 'd', m.descripcion, 'mo', m.cuenta_mo, 't', m.tiempo_historico) order by m.n_matriz), '[]'::jsonb)
        into v_dejan
        from matriz m
       where m.id in (select unnest(x.o_mats) from "GP2"._linea_tallerista(p_articulo) x);
      -- la mano de obra de las matrices que cuentan MO deja de sumarse: pasa a ser el precio del tallerista
      select string_agg(m.n_matriz || ' (' || trim(to_char(m.tiempo_historico, 'FM999990.##')) || ' s)', ', ' order by m.n_matriz)
        into v_mo
        from matriz m
       where m.id in (select unnest(x.o_mats) from "GP2"._linea_tallerista(p_articulo) x)
         and m.cuenta_mo and m.tiempo_historico is not null;
      if v_mo is not null then
        v_av := v_av || jsonb_build_object('nivel', 'warn', 'txt',
          'Deja de contarse la mano de obra de las matrices ' || v_mo || ': pasa a ser el precio del tallerista, que se carga aparte.');
      end if;
    end if;

    if v_ubic_hasta is null then
      v_av := v_av || jsonb_build_object('nivel', 'warn', 'txt',
        format('%s no tiene ubicacion de stock: se le puede cambiar el articulo, pero no se le pueden registrar envios hasta crearla.', coalesce(v_hasta_nom, 'El nuevo')));
    end if;
    if p_desde is not null and v_sin_precio is not null then
      v_av := v_av || jsonb_build_object('nivel', 'warn', 'txt',
        format('%s no tiene precio cargado para %s: el costo va a salir SIN su mano de obra hasta que se cargue.', coalesce(v_hasta_nom, 'El nuevo'), v_sin_precio));
    elsif p_desde is null and not exists (select 1 from precio_tallerista pt join componente c on c.id = pt.componente_id
                                           where pt.tallerista_id = p_hasta and c.codigo = a.codigo and c.sector_id = 12) then
      v_av := v_av || jsonb_build_object('nivel', 'warn', 'txt',
        format('%s no tiene precio cargado para el %s: el costo va a salir SIN su mano de obra hasta que se cargue.', coalesce(v_hasta_nom, 'El nuevo'), a.codigo));
    end if;
    if p_desde is not null and v_ubic_desde is not null and v_comps is not null then
      select string_agg(c.codigo || ' (' || trim(to_char(i.cantidad, 'FM999999990.##')) || ')', ', ' order by c.codigo)
        into v_con_stock
        from inventario i join componente c on c.id = i.componente_id
       where i.ubicacion_id = v_ubic_desde and i.componente_id = any(v_comps) and coalesce(i.cantidad, 0) > 0;
      if v_con_stock is not null then
        v_av := v_av || jsonb_build_object('nivel', 'info', 'txt',
          format('%s todavia tiene en su casa: %s. Ese stock no se mueve.', coalesce(v_desde_nom, 'El que sale'), v_con_stock));
      end if;
    end if;

    if p_aplicar and cardinality(v_bloq) = 0 then
      if p_desde is not null then
        select coalesce(jsonb_agg(to_jsonb(rp) order by rp.id), '[]'::jsonb) into v_antes from ruta_paso rp where rp.id = any(v_ids);
        update ruta_paso set tallerista_id = p_hasta where id = any(v_ids);
        select coalesce(jsonb_agg(to_jsonb(rp) order by rp.id), '[]'::jsonb) into v_despues from ruta_paso rp where rp.id = any(v_ids);
        update reparto_tallerista set tallerista_id = p_hasta, actualizado_en = now()
         where articulo_id = p_articulo and tallerista_id = p_desde;
        -- Despiece guarda las rutas revisadas por firma, y la firma lleva el nombre del tallerista
        update ruta_revision rv set firma = x.nueva
          from (select id, rtrim(replace(firma || '|', '|tallerista:' || v_desde_nom || '|', '|tallerista:' || v_hasta_nom || '|'), '|') nueva
                  from ruta_revision
                 where articulo = a.codigo and position('|tallerista:' || v_desde_nom || '|' in firma || '|') > 0) x
         where rv.id = x.id and not exists (select 1 from ruta_revision y where y.firma = x.nueva);
      else
        for l in select * from "GP2"._linea_tallerista(p_articulo) loop
          v_antes := v_antes || coalesce((select jsonb_agg(to_jsonb(rp) order by rp.orden) from ruta_paso rp
                                           where rp.id = any(l.o_pasos) or (rp.ruta_id = l.o_ruta and rp.orden = l.o_vir)), '[]'::jsonb);
          perform "GP2"._cc_quitar_pasos(l.o_pasos);
          insert into ruta_paso (ruta_id, orden, tipo_paso, tallerista_id, comp_entrada_id, comp_salida_id, cantidad)
          values (l.o_ruta, l.o_ini, 'tallerista', p_hasta, l.o_entra, l.o_sale, 1)
          returning id into v_nuevo;
          update ruta_paso set orden = l.o_ini + 1 where ruta_id = l.o_ruta and orden = l.o_vir;
          v_despues := v_despues || coalesce((select jsonb_agg(to_jsonb(rp) order by rp.orden) from ruta_paso rp
                                               where rp.id = v_nuevo or (rp.ruta_id = l.o_ruta and rp.orden = l.o_ini + 1)), '[]'::jsonb);
        end loop;
      end if;
      if v_ubic_hasta is not null and v_comps is not null then
        insert into inventario (componente_id, ubicacion_id, cantidad)
        select c, v_ubic_hasta, 0 from unnest(v_comps) c
         where not exists (select 1 from inventario i where i.componente_id = c and i.ubicacion_id = v_ubic_hasta);
        get diagnostics v_inv = row_count;
      end if;
    end if;

  ---------------------------------------------------------------- PROV. A.T.
  else
    v_tipo_log := 'prov_at';
    select pa.nombre into v_hasta_nom from proveedor_at pa where pa.id = p_hasta and coalesce(pa.activo, true);
    if v_hasta_nom is null then v_bloq := array_append(v_bloq, 'El prov. A.T. nuevo no existe o esta inactivo.'); end if;
    select u.id into v_ubic_hasta from ubicacion u where u.tipo = 'proveedor_at' and u.ref_id = p_hasta order by u.id limit 1;
    if p_desde is null then
      v_bloq := array_append(v_bloq, 'Falta elegir el prov. A.T. actual.');
      v_ids := '{}';
    else
      select pa.nombre into v_desde_nom from proveedor_at pa where pa.id = p_desde;
      if p_desde = p_hasta then v_bloq := array_append(v_bloq, 'Elegi un prov. A.T. distinto del actual.'); end if;
      select array_agg(rp.id order by rp.id) into v_ids
        from ruta_paso rp join ruta r on r.id = rp.ruta_id
       where r.articulo_id = p_articulo and rp.tipo_paso = 'proveedor_at' and rp.proveedor_at_id = p_desde;
      select count(*) into v_pad from articulo_prov_at ap where ap.cod_art = a.codigo and ap.proveedor_at_id = p_desde;
      if v_ids is null and v_pad = 0 then
        v_bloq := array_append(v_bloq, format('El articulo no lo entrega %s.', coalesce(v_desde_nom, p_desde::text)));
      end if;
      v_ids := coalesce(v_ids, '{}');
      if exists (select 1 from ruta_paso rp join ruta r on r.id = rp.ruta_id
                  where r.articulo_id = p_articulo and rp.tipo_paso = 'proveedor_at' and rp.proveedor_at_id = p_hasta) then
        v_bloq := array_append(v_bloq, format('El articulo ya lo entrega %s en su ruta: no se puede repetir.', coalesce(v_hasta_nom, p_hasta::text)));
      end if;
      if exists (select 1 from reparto_prov_at rt where rt.articulo_id = p_articulo and rt.proveedor_at_id = p_hasta) then
        v_bloq := array_append(v_bloq, format('Hay un reparto viejo cargado para %s en este articulo: hay que sacarlo antes.', coalesce(v_hasta_nom, p_hasta::text)));
      end if;
    end if;
    v_pasos := cardinality(v_ids);
    select array_agg(distinct rp.comp_entrada_id) into v_comps from ruta_paso rp
     where rp.id = any(v_ids) and rp.comp_entrada_id is not null;
    select coalesce(jsonb_agg(jsonb_build_object(
             'comp_id', c.id, 'cod', c.codigo, 'd', c.descripcion,
             'cantidad', coalesce((select ac.cantidad from articulo_componente ac
                                    where ac.articulo_id = p_articulo and ac.componente_id = c.id), 1))
             order by c.codigo), '[]'::jsonb)
      into v_partes from componente c where c.id = any(coalesce(v_comps, '{}'));
    if v_ubic_hasta is null then
      v_av := v_av || jsonb_build_object('nivel', 'warn', 'txt',
        format('%s no tiene ubicacion de stock: se le puede cambiar el articulo, pero no se le pueden registrar envios hasta crearla.', coalesce(v_hasta_nom, 'El nuevo')));
    end if;
    if v_pad > 0 then
      v_av := v_av || jsonb_build_object('nivel', 'info', 'txt',
        'Tambien se cambia en el padron de Control / Entregas de Prov. A.T.; el renglon del anterior queda inactivo, no se borra.');
    end if;

    if p_aplicar and cardinality(v_bloq) = 0 then
      select coalesce(jsonb_agg(to_jsonb(rp) order by rp.id), '[]'::jsonb) into v_antes from ruta_paso rp where rp.id = any(v_ids);
      update ruta_paso set proveedor_at_id = p_hasta where id = any(v_ids);
      select coalesce(jsonb_agg(to_jsonb(rp) order by rp.id), '[]'::jsonb) into v_despues from ruta_paso rp where rp.id = any(v_ids);
      if v_pad > 0 then
        if exists (select 1 from articulo_prov_at ap where ap.cod_art = a.codigo and ap.proveedor_at_id = p_hasta) then
          update articulo_prov_at set activo = true where cod_art = a.codigo and proveedor_at_id = p_hasta;
          update articulo_prov_at set activo = false where cod_art = a.codigo and proveedor_at_id = p_desde;
        else
          update articulo_prov_at set proveedor_at_id = p_hasta where cod_art = a.codigo and proveedor_at_id = p_desde;
        end if;
      end if;
      update reparto_prov_at set proveedor_at_id = p_hasta, actualizado_en = now()
       where articulo_id = p_articulo and proveedor_at_id = p_desde;
      if v_ubic_hasta is not null and v_comps is not null then
        insert into inventario (componente_id, ubicacion_id, cantidad)
        select c, v_ubic_hasta, 0 from unnest(v_comps) c
         where not exists (select 1 from inventario i where i.componente_id = c and i.ubicacion_id = v_ubic_hasta);
        get diagnostics v_inv = row_count;
      end if;
    end if;
  end if;

  ---------------------------------------------------------------- cierre
  if p_aplicar then
    if cardinality(v_bloq) > 0 then
      raise exception '%', v_bloq[1];
    end if;
    insert into contraparte_cambio (articulo_id, tipo, desde_id, hasta_id, usuario, pasos_antes, pasos_despues, resumen)
    values (p_articulo, v_tipo_log, p_desde, p_hasta, coalesce(nullif(btrim(coalesce(p_usuario, '')), ''), nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'email'), v_antes, v_despues,
            jsonb_build_object('partes', v_partes, 'dejan', v_dejan, 'avisos', v_av, 'inventario_nuevo', v_inv))
    returning id into v_log;
  end if;

  return jsonb_build_object(
    'ok', cardinality(v_bloq) = 0,
    'aplicado', p_aplicar and cardinality(v_bloq) = 0,
    'tipo', v_tipo_log,
    'articulo', jsonb_build_object('id', a.id, 'cod', a.codigo, 'd', a.descripcion),
    'desde', jsonb_build_object('id', p_desde, 'n', coalesce(v_desde_nom, case when p_desde is null then 'Fabrica' end)),
    'hasta', jsonb_build_object('id', p_hasta, 'n', v_hasta_nom),
    'pasos', v_pasos,
    'partes', v_partes,
    'dejan', v_dejan,
    'avisos', v_av,
    'bloqueos', to_jsonb(v_bloq),
    'inventario_nuevo', v_inv,
    'cambio_id', v_log,
    'despues', case when p_aplicar then "GP2"._contrapartes_articulo(p_articulo) end
  );
end $function$;

-- 6) Lo que llama la pantalla -----------------------------------------
create or replace function "GP2".cambiar_contraparte_preview(p_articulo bigint, p_tipo text, p_desde bigint, p_hasta bigint)
 returns jsonb
 language sql
 security definer
 set search_path to 'GP2', 'pg_temp'
as $function$
  select "GP2"._cambiar_contraparte(p_articulo, p_tipo, p_desde, p_hasta, null, false);
$function$;

create or replace function "GP2".cambiar_contraparte_aplicar(p_articulo bigint, p_tipo text, p_desde bigint, p_hasta bigint, p_usuario text)
 returns jsonb
 language sql
 security definer
 set search_path to 'GP2', 'pg_temp'
as $function$
  select "GP2"._cambiar_contraparte(p_articulo, p_tipo, p_desde, p_hasta, p_usuario, true);
$function$;

create or replace function "GP2".cambiar_contraparte_bundle()
 returns jsonb
 language sql
 stable security definer
 set search_path to 'GP2', 'pg_temp'
as $function$
select jsonb_build_object(
  'art', (select coalesce(jsonb_agg(
            jsonb_build_object('id', a.id, 'cod', a.codigo, 'd', a.descripcion, 'fam', a.familia, 'mk', a.marca)
            || "GP2"._contrapartes_articulo(a.id) order by a.codigo), '[]'::jsonb)
            from articulo a
           where not coalesce(a.discontinuado, false)
             and exists (select 1 from ruta r where r.articulo_id = a.id)),
  'tall', (select coalesce(jsonb_agg(jsonb_build_object(
              'id', t.id, 'n', t.nombre,
              'ub', exists (select 1 from ubicacion u where u.tipo = 'tallerista' and u.ref_id = t.id)) order by t.nombre), '[]'::jsonb)
             from tallerista t where coalesce(t.activo, true) and t.id <> 3),
  'pat',  (select coalesce(jsonb_agg(jsonb_build_object(
              'id', p.id, 'n', p.nombre,
              'ub', exists (select 1 from ubicacion u where u.tipo = 'proveedor_at' and u.ref_id = p.id)) order by p.nombre), '[]'::jsonb)
             from proveedor_at p where coalesce(p.activo, true))
);
$function$;

-- 7) Permisos: leer = como los demas bundles; escribir = solo sesion habilitada ---------
revoke all on function "GP2"._linea_tallerista(bigint) from public, anon, authenticated;
revoke all on function "GP2"._contrapartes_articulo(bigint) from public, anon, authenticated;
revoke all on function "GP2"._cambiar_contraparte(bigint, text, bigint, bigint, text, boolean) from public, anon, authenticated;
revoke all on function "GP2".cambiar_contraparte_preview(bigint, text, bigint, bigint) from public, anon;
revoke all on function "GP2".cambiar_contraparte_aplicar(bigint, text, bigint, bigint, text) from public, anon;
grant execute on function "GP2".cambiar_contraparte_preview(bigint, text, bigint, bigint) to authenticated, service_role;
grant execute on function "GP2".cambiar_contraparte_aplicar(bigint, text, bigint, bigint, text) to authenticated, service_role;
grant execute on function "GP2".cambiar_contraparte_bundle() to anon, authenticated, service_role;

-- 8) A CORRER UNA VEZ EN EL SQL EDITOR (no por el conector) --------------------------------
-- El conector de Claude retiene cualquier texto con "delete" esperando una confirmacion humana que
-- en una sesion remota nunca llega (se cuelga a los 60 s), igual que paso con el borrado de la
-- matriz 0 el 02/10. Por eso el UNICO borrado de todo esto vive aca, aislado en 3 lineas.
-- Sin esta funcion: tallerista -> tallerista y prov. A.T. funcionan igual; Fabrica -> tallerista
-- queda bloqueado con un cartel que lo explica (no falla a medias).
create or replace function "GP2"._cc_quitar_pasos(p_ids bigint[])
 returns integer
 language plpgsql
 security definer
 set search_path to 'GP2', 'pg_temp'
as $function$
declare v_n integer;
begin
  perform "GP2"._exigir_autorizado();
  delete from ruta_paso where id = any(p_ids);
  get diagnostics v_n = row_count;
  return v_n;
end $function$;
revoke all on function "GP2"._cc_quitar_pasos(bigint[]) from public, anon, authenticated;
