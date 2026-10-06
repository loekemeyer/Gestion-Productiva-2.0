-- ============================================================================
-- v3.3.0 (2026-10-06) - EDITOR DE EQUIVALENCIAS DE CÓDIGOS
--   (Stock General, pestaña Virgilio: tabla "Insumos de Virgilio sin asignar")
--
-- La parte GP2 YA la aplicó la sesión de Claude (execute_sql no se cuelga con eso):
--   · alter importado_virgilio_componente: componente_id NULLABLE + columna `isis`
--   · RPC GP2.virgilio_equivalencia_guardar(cod_virgilio, cod_cervantes, isis)
--   · GP2.virgilio_insumos_sin_match_bundle(): excluye SOLO los que ya tienen
--     componente, y trae el isis (de la equivalencia o del espejo).
--   (El CREATE de las dos RPC está en db/funciones_GP2.sql.)
--
-- Lo de ABAJO (lado GV = schema public) hay que correrlo UNA SOLA VEZ en el
-- SQL EDITOR de Supabase: el conector de la sesión de Claude cuelga el DDL de
-- trigger (lo frena el clasificador de permisos en Auto; no es un lock ni un
-- timeout de Postgres). En el SQL Editor no hay clasificador y corre directo.
-- ============================================================================

-- 1) ESPEJO: agregar `isis` y que el sync lo traiga de Insumos.isis (vista_insumos.isis)
alter table "GP2".virgilio_insumo_stock add column if not exists isis text;

do $mig$
declare d text;
begin
  d := pg_get_functiondef('public.gv_gp2_espejo_sync()'::regprocedure);
  d := replace(d, 'concat_ws(''|'',cod,unidad,nombre,categoria,saldo,ubicacion)',
                  'concat_ws(''|'',cod,unidad,nombre,categoria,saldo,ubicacion,isis)');
  d := replace(d, 'round(sum(m.delta),4) saldo, max(nullif(vi.ubicacion,'''')) ubicacion',
                  'round(sum(m.delta),4) saldo, max(nullif(vi.ubicacion,'''')) ubicacion, max(vi.isis) isis');
  d := replace(d, 'virgilio_insumo_stock(cod, unidad, nombre, categoria, saldo, ubicacion)',
                  'virgilio_insumo_stock(cod, unidad, nombre, categoria, saldo, ubicacion, isis)');
  d := replace(d, 'select m.cod_art, coalesce(m.unidad,''''), max(vi.nombre), max(vi.categoria), round(sum(m.delta),4), max(nullif(vi.ubicacion,''''))',
                  'select m.cod_art, coalesce(m.unidad,''''), max(vi.nombre), max(vi.categoria), round(sum(m.delta),4), max(nullif(vi.ubicacion,'''')), max(vi.isis)');
  if (length(d) - length(replace(d, 'max(vi.isis)', ''))) / length('max(vi.isis)') >= 2 then
    execute d;
  end if;  -- si ya está aplicado, no hace nada (idempotente)
end $mig$;

-- 2) TRIGGER de sincronización de rename (lo que pidió Luis el 06/10):
--    si se renombra un Cod V en Insumos.cod, la equivalencia sigue al código.
--    (El Cod C no necesita trigger: la equivalencia guarda componente_id, no el string,
--     así que un rename de componente.codigo se refleja solo.)
create or replace function public.gv_insumo_cod_sync_equiv() returns trigger
language plpgsql security definer set search_path to 'public' as $b$
begin
  if old.cod is not null and coalesce(new.cod,'') is distinct from coalesce(old.cod,'') then
    update "GP2".importado_virgilio_componente
       set cod_virgilio = upper(btrim(new.cod))
     where upper(btrim(cod_virgilio)) = upper(btrim(old.cod));
  end if;
  return new;
end $b$;

drop trigger if exists zz_gv_insumo_cod_sync_equiv on public."Insumos";
create trigger zz_gv_insumo_cod_sync_equiv after update of cod on public."Insumos"
  for each row execute function public.gv_insumo_cod_sync_equiv();

-- 3) poblar isis en el espejo ahora (si no, se puebla solo en el próximo cron, ≤ 10 min)
select public.gv_gp2_espejo_sync();

-- verificación
select (position('max(vi.isis)' in pg_get_functiondef('public.gv_gp2_espejo_sync()'::regprocedure))>0) as espejo_ok,
       exists(select 1 from pg_trigger where tgname='zz_gv_insumo_cod_sync_equiv' and not tgisinternal) as trigger_ok,
       (select count(*) filter (where isis is not null) from "GP2".virgilio_insumo_stock) as isis_poblado;
