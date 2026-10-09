-- OC: PRIORIDAD POR RENGLON (2026-10-09) [Thomas: "quiero que me aparezca una columna de PRIORIDAD.
-- Todos los componentes que escribi en la columna de Pedir quiero que me obligue a ponerle una
-- prioridad. Es decir, si en la columna pedir complete 3 campos (3 componentes) tengo que poner cual
-- es prioridad 1, cual 2 y cual 3"].
--
-- 1) orden_compra_item.prioridad (1 = lo primero que tiene que entregar el proveedor). Nullable: las
--    OC anteriores a hoy no la tienen y no se inventa. No se repite dentro de la misma OC.
-- 2) crear_oc la EXIGE en cada renglon (entero > 0, sin repetir). La pantalla pide 1..N exactos sobre
--    todo lo cargado; la base frena lo minimo para que nadie la saltee llamando la RPC a mano. La OC
--    gemela (Altrak / Aperam) tiene un solo renglon: prioridad 1.
-- 3) oc_bundle devuelve la prioridad de cada renglon y los ordena por ella (los viejos, sin prioridad,
--    siguen por codigo).
-- Se aplica con replace() sobre la definicion VIVA y cada reemplazo se verifica: si un ancla no
-- esta, la migracion aborta entera y no cambia nada.

alter table "GP2".orden_compra_item
  add column if not exists prioridad integer;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'orden_compra_item_prioridad_chk') then
    alter table "GP2".orden_compra_item
      add constraint orden_compra_item_prioridad_chk check (prioridad is null or prioridad > 0);
  end if;
end $$;
create unique index if not exists orden_compra_item_oc_prioridad_uq
  on "GP2".orden_compra_item (oc_id, prioridad) where prioridad is not null;
comment on column "GP2".orden_compra_item.prioridad is
  'Orden de entrega pedido al proveedor (1 = primero). Obligatoria desde 2026-10-09 (crear_oc); null en las OC anteriores.';

do $mig$
declare
  d text; n text;
  a1 text := $a$v_err_carton := "GP2"._oc_validar_carton(coalesce(p->'items','[]'::jsonb));$a$;
  a2 text := $a$insert into orden_compra_item (oc_id, componente_id, cantidad, unidad, precio_uni, moneda)
      select v_oc, (it->>'comp_id')::bigint, v_cant, v_u,$a$;
  a3 text := $a$insert into orden_compra_item (oc_id, componente_id, cantidad, unidad, precio_uni, moneda)
    select v_oc_mp, v_mp_id, v_kg_mp, 'kg', pv.precio,$a$;
  a4 text := $a$'subtotal',case when oi.precio_uni is null then null else round(oi.cantidad*oi.precio_uni,2) end
               ) order by c2.codigo)$a$;
begin
  -- ---- crear_oc ----
  select pg_get_functiondef('"GP2".crear_oc(jsonb)'::regprocedure) into d;
  if position('prioridad' in d) > 0 then raise notice 'crear_oc ya tiene prioridad'; else
    if position(a1 in d)=0 or position(a2 in d)=0 or position(a3 in d)=0 then
      raise exception 'crear_oc: ancla no encontrada, no se aplica nada';
    end if;
    n := replace(d, a1, $r$-- PRIORIDAD (2026-10-09): cada renglon con cantidad lleva su prioridad, entera > 0 y sin repetir.
  if exists (select 1 from jsonb_array_elements(coalesce(p->'items','[]'::jsonb)) e
              where coalesce((e->>'cantidad')::numeric,0) > 0
                and coalesce(nullif(e->>'prioridad','')::numeric,0) <= 0) then
    raise exception 'Cada renglon de la OC necesita su prioridad (1, 2, 3...)';
  end if;
  if exists (select 1 from jsonb_array_elements(coalesce(p->'items','[]'::jsonb)) e
              where coalesce((e->>'cantidad')::numeric,0) > 0
              group by (e->>'prioridad')::numeric having count(*) > 1) then
    raise exception 'Hay prioridades repetidas en la OC: cada renglon lleva un numero distinto';
  end if;

  $r$ || a1);
    n := replace(n, a2, $r$insert into orden_compra_item (oc_id, componente_id, cantidad, unidad, precio_uni, moneda, prioridad)
      select v_oc, (it->>'comp_id')::bigint, v_cant, v_u,$r$);
    -- la columna nueva va al final del select: despues del case de la moneda
    n := replace(n, $a$               when upper(coalesce(pv.moneda,'USD')) like '%US%' then 'USD' else 'ARS' end
             end
      from (select 1) x$a$, $r$               when upper(coalesce(pv.moneda,'USD')) like '%US%' then 'USD' else 'ARS' end
             end,
             nullif(it->>'prioridad','')::numeric::int
      from (select 1) x$r$);
    n := replace(n, a3, $r$insert into orden_compra_item (oc_id, componente_id, cantidad, unidad, precio_uni, moneda, prioridad)
    select v_oc_mp, v_mp_id, v_kg_mp, 'kg', pv.precio,$r$);
    n := replace(n, $a$                when upper(coalesce(pv.moneda,'USD')) like '%US%' then 'USD' else 'ARS' end
    from (select 1) x$a$, $r$                when upper(coalesce(pv.moneda,'USD')) like '%US%' then 'USD' else 'ARS' end,
           1
    from (select 1) x$r$);
    if (length(n) - length(replace(n, 'prioridad)', ''))) / length('prioridad)') <> 2
       or position('nullif(it->>''prioridad'','''')::numeric::int' in n) = 0
       or position(E'end,\n           1\n' in n) = 0 then
      raise exception 'crear_oc: algun reemplazo no entro, no se aplica nada';
    end if;
    execute n;
  end if;

  -- ---- oc_bundle ----
  select pg_get_functiondef('"GP2".oc_bundle()'::regprocedure) into d;
  if position('''prioridad''' in d) > 0 then raise notice 'oc_bundle ya tiene prioridad'; else
    if position(a4 in d)=0 then raise exception 'oc_bundle: ancla no encontrada, no se aplica nada'; end if;
    n := replace(d, a4, $r$'subtotal',case when oi.precio_uni is null then null else round(oi.cantidad*oi.precio_uni,2) end,
                 'prioridad',oi.prioridad
               ) order by oi.prioridad nulls last, c2.codigo)$r$);
    execute n;
  end if;
end $mig$;

-- Reversa (no borra datos de prioridad ya cargados si no se dropea la columna):
--   restaurar crear_oc y oc_bundle desde db/funciones_GP2.sql del commit anterior y
--   alter table "GP2".orden_compra_item drop column prioridad;
