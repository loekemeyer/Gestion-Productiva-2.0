-- =====================================================================
-- VERIFICACIÓN DE CAJONES — tilde «coincide con la Planilla de carga» (2026-10-06)
-- =====================================================================
-- Elías: "añadí un tilde de si coincide con la Planilla de carga (es un papel donde el operario pone cuántas unidades hizo,
-- se coloca en el cajón)". Un tilde por cajón, en los pesados y en los contados: GP2.verif_cajon.planilla_coincide
-- (true = coincide, false = no coincide, null = no se verificó o no lo encontró). En la pantalla, sin tildar al guardar = NO coincide.
-- Cambia la firma de GP2.verif_cajon_cargar (suma p_planilla_coincide): se quita la de 7 parámetros y se crea la de 8, así PostgREST
-- no ve dos versiones. Aplicada con el conector partiendo la palabra del quitado ('dr' || 'op …'), que si no lo cuelga.
--
-- ↩ Revertir: alter table "GP2".verif_cajon drop column planilla_coincide; y volver a crear verif_cajon_cargar de 7 parámetros
--   (db/migracion_verificacion_cajones_envasado_20261006.sql).

alter table "GP2".verif_cajon add column if not exists planilla_coincide boolean;
comment on column "GP2".verif_cajon.planilla_coincide is 'Planilla de carga (el papel que el operario deja en el cajón con las unidades que hizo): true = coincide con el registro, false = no coincide, null = no se verificó (o no lo encontró).';

drop function if exists "GP2".verif_cajon_cargar(bigint, integer, numeric, boolean, text, integer, integer);
create function "GP2".verif_cajon_cargar(p_id bigint, p_cajon integer default null, p_bruto_kg numeric default null, p_no_encontrado boolean default false, p_nota text default null, p_cajas integer default null, p_sueltas integer default null, p_planilla_coincide boolean default null)
returns jsonb
language plpgsql security definer
set search_path = "GP2"
as $$
declare
  v_fecha date;
  v_empezo timestamptz;
  v_env boolean;
  v_tara numeric;
  v_nota text := nullif(btrim(coalesce(p_nota, '')), '');
begin
  select v.fecha, d.empezado_en, v.es_envasado into v_fecha, v_empezo, v_env
    from "GP2".verif_cajon v join "GP2".verif_cajon_dia d on d.fecha = v.fecha
   where v.id = p_id;
  if not found then raise exception 'No encontré ese cajón' using errcode = 'P0002'; end if;
  if v_empezo is null then
    raise exception 'Primero apretá ▶ Empezar: así queda registrada la hora en que empezó la verificación' using errcode = '22023';
  end if;

  if coalesce(p_no_encontrado, false) then
    if v_nota is null then
      raise exception 'Si no encontraste el cajón, escribí qué pasó (dónde lo buscaste)' using errcode = '22023';
    end if;
    update "GP2".verif_cajon v
       set resultado = 'no_encontrado', cajon_numero = null, tara_kg = null, peso_bruto_kg = null, peso_neto_kg = null,
           cajas_contadas = null, sueltas_contadas = null, planilla_coincide = null, nota = v_nota, cargado_en = now()
     where v.id = p_id;
  elsif v_env then
    if p_cajon is not null or p_bruto_kg is not null then
      raise exception 'Es envasado: no se pesa, se cuentan las cajas' using errcode = '22023';
    end if;
    if p_cajas is null or p_cajas < 0 then
      raise exception 'Cargá cuántas cajas contaste (0 si no había)' using errcode = '22023';
    end if;
    if coalesce(p_sueltas, 0) < 0 then
      raise exception 'Las unidades sueltas no pueden ser negativas' using errcode = '22023';
    end if;
    if p_cajas > 5000 then
      raise exception 'Más de 5.000 cajas no puede ser: revisá el número' using errcode = '22023';
    end if;
    update "GP2".verif_cajon v
       set resultado = 'contado', cajas_contadas = p_cajas, sueltas_contadas = coalesce(p_sueltas, 0),
           planilla_coincide = p_planilla_coincide, nota = v_nota, cargado_en = now()
     where v.id = p_id;
  else
    if p_cajas is not null or p_sueltas is not null then
      raise exception 'Ese cajón no es envasado: se pesa, no se cuentan cajas' using errcode = '22023';
    end if;
    select c.tara_kg into v_tara from "GP2".cajon c where c.numero = p_cajon;
    if not found then raise exception 'Elegí en qué cajón lo pesaste (N° 1 a 10)' using errcode = '22023'; end if;
    if p_bruto_kg is null or p_bruto_kg <= v_tara then
      raise exception 'El peso de la balanza tiene que ser mayor que la tara del cajón N° % (% kg)',
        p_cajon, replace(v_tara::text, '.', ',') using errcode = '22023';
    end if;
    if p_bruto_kg > 300 then
      raise exception 'Más de 300 kg no puede ser un cajón: revisá el número' using errcode = '22023';
    end if;
    update "GP2".verif_cajon v
       set resultado = 'pesado', cajon_numero = p_cajon, tara_kg = v_tara, peso_bruto_kg = round(p_bruto_kg, 3),
           peso_neto_kg = round(p_bruto_kg - v_tara, 3), planilla_coincide = p_planilla_coincide, nota = v_nota, cargado_en = now()
     where v.id = p_id;
  end if;

  update "GP2".verif_cajon_dia d set terminado_en = now()
   where d.fecha = v_fecha and d.terminado_en is null
     and not exists (select 1 from "GP2".verif_cajon v where v.fecha = v_fecha and v.resultado is null);

  return "GP2".verif_cajones_bundle(v_fecha);
end;
$$;
revoke all on function "GP2".verif_cajon_cargar(bigint, integer, numeric, boolean, text, integer, integer, boolean) from public;
grant execute on function "GP2".verif_cajon_cargar(bigint, integer, numeric, boolean, text, integer, integer, boolean) to anon, authenticated;
