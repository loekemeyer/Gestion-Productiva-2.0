-- =====================================================================
-- 2026-09-30 — El aviso de Gestión Virgilio pasa de la PORTADA a Recepción de Insumos > Importados
-- con Sí / No por componente (GP2 v1.216.0, Gestión Virgilio v25.34).
--
-- [usuario 30/09] "El cartel amarillo de GP2 quiero que lo elimines de donde está ahora y que en el
-- módulo de recepción de insumos (dentro de importados) me aparezca una notificación en el sector
-- correspondiente diciendo «Gestión Virgilio notificó que recibiste 3000 unidades de GRJ31: Sí/No».
-- Sí: sumar stock a ese componente. No: en el mismo lugar que se cargaron las 3000 uni … que vuelvan
-- a aparecer con un cartelito de «Denegado por Cervantes»".
-- Decidido en la charla: Sí = recepción de Importado + control en kg (la regla de Thomas del 28/09,
-- "remito en unidades y control en kg"); No = el pedido vuelve a «en viaje» en Gestión Virgilio.
--
-- Lo que es de GP2 está acá (sólo lee y escribe el schema GP2, Regla 0). Lo que hace Gestión
-- Virgilio con el «No» (volver a poner el pedido en viaje) vive del lado de Virgilio:
-- sql/gv_ingreso_cervantes_denegado_v2534.sql del repo gestion-virgilio.
-- =====================================================================

-- ---------- 1) qué código de Virgilio es qué componente de GP2 ----------
-- En Virgilio el importado es un código de artículo (323ES); en GP2 la misma pieza es un código de
-- sector (GRJ31). Una fila por código de Virgilio (importado o insumo): varios pueden ir al mismo
-- componente (1000900, H201Part y 007 son todos el espiral D1). NO se usa componente.codigo_virgilio:
-- ésa es de las bolsas de material del sector 14 y tiene índice único (un componente, un código).
create table if not exists "GP2".importado_virgilio_componente (
  cod_virgilio text primary key,
  componente_id bigint not null references "GP2".componente(id),
  nota text,
  creado_en timestamptz not null default now(),
  creado_por text,
  constraint importado_virgilio_componente_cod_check check (cod_virgilio = upper(btrim(cod_virgilio)) and cod_virgilio <> '')
);
comment on table "GP2".importado_virgilio_componente is
  '2026-09-30: qué código de Gestión Virgilio (importado o insumo, en MAYÚSCULAS) es qué componente de GP2. '
  'Lo usa el aviso de Virgilio (ingreso_virgilio) para saber en qué tarjeta de Recepción de Insumos > Importados '
  'mostrarlo y a qué componente sumarle el stock cuando Cervantes dice Sí. Varios códigos de Virgilio pueden ir al '
  'mismo componente. Alta de un vínculo nuevo = un insert.';
alter table "GP2".importado_virgilio_componente enable row level security;
drop policy if exists p_gp2_select on "GP2".importado_virgilio_componente;
create policy p_gp2_select on "GP2".importado_virgilio_componente for select to anon, authenticated using (true);
revoke all on "GP2".importado_virgilio_componente from anon, authenticated;
grant select on "GP2".importado_virgilio_componente to anon, authenticated;

-- Los 8 que confirmó el usuario el 30/09 ("Los 8 de la tabla"). Z23A <- 505C era el único adivinado.
insert into "GP2".importado_virgilio_componente (cod_virgilio, componente_id, nota, creado_por) values
  ('323ES',    949, 'Rallador 4 Lados Mini suelto -> GRJ31 Ralladores (usuario 30/09)', 'claude 30/09'),
  ('599E',     950, 'Pelador Mgo Madera -> GRJ32', 'claude 30/09'),
  ('599ES',    950, 'Pelador Mgo Madera suelto -> GRJ32', 'claude 30/09'),
  ('1000900',  163, 'espiral (importado) -> D1 Espiral Sacacorcho', 'claude 30/09'),
  ('H201PART', 163, 'espiral TN (insumo de Virgilio del 1000900) -> D1', 'claude 30/09'),
  ('007',      163, 'espiral Chef (insumo de Virgilio del 1000900) -> D1', 'claude 30/09'),
  ('1546903',  547, 'Parte Corta Queso -> C13 Corta Queso Bastidor c/Cilindro', 'claude 30/09'),
  ('546P',     547, 'Vastidor cortaqueso (insumo de Virgilio del 1546903) -> C13', 'claude 30/09'),
  ('523C',     219, 'Cremallera -> E13', 'claude 30/09'),
  ('587C',     162, 'cuchilla pelapapas laser -> Z23B Cuchilla Laser', 'claude 30/09'),
  ('590ES',    910, 'Pincel Silicona 11 Gms suelto -> PINCEL590 (granel)', 'claude 30/09'),
  ('505C',     160, 'cuchilla pelador -> Z23A Cuch China (el unico adivinado; confirmado por el usuario 30/09)', 'claude 30/09')
on conflict (cod_virgilio) do nothing;

-- ---------- 2) ingreso_virgilio: lo que hace falta para resolver Sí / No ----------
alter table "GP2".ingreso_virgilio
  add column if not exists unidades numeric,
  add column if not exists recepcion_insumo_id bigint references "GP2".recepcion_insumo(id),
  add column if not exists denegado_en timestamptz,
  add column if not exists denegado_por text,
  add column if not exists denegado_motivo text,
  add column if not exists virgilio_revertido_en timestamptz,
  add column if not exists virgilio_revertido_error text;
alter table "GP2".ingreso_virgilio drop constraint if exists ingreso_virgilio_estado_check;
alter table "GP2".ingreso_virgilio add constraint ingreso_virgilio_estado_check
  check (estado = any (array['pendiente'::text, 'confirmado'::text, 'denegado'::text, 'anulado'::text]));
comment on table "GP2".ingreso_virgilio is
  'v25.10 (Luis 30/09): lo que Gestion Virgilio mando a Cervantes (recepcion de importados con destino Cervantes). '
  'Lo escribe public.gv_imp_recibir (SECURITY DEFINER). Desde el 30/09 (GP2 v1.216.0) ya NO sale en la portada: '
  'aparece en Recepcion de Insumos > Importados, en la tarjeta del componente (importado_virgilio_componente), '
  'con Si / No (resolver_ingreso_virgilio). Si = recepcion de Importado + control en kg; No = estado denegado y '
  'Gestion Virgilio vuelve a poner el pedido en viaje (trigger gv_ingreso_virgilio_denegado, del lado de Virgilio).';
comment on column "GP2".ingreso_virgilio.unidades is 'Unidades que suma GP2 si Cervantes dice Si. La escribe Virgilio al insertar (cajas x unidades por caja de su recepcion).';
comment on column "GP2".ingreso_virgilio.recepcion_insumo_id is 'La recepcion_insumo que creo el Si (queda pendiente del control en kg, como cualquier Importado).';
comment on column "GP2".ingreso_virgilio.denegado_motivo is 'Por que Cervantes dijo No (opcional).';
comment on column "GP2".ingreso_virgilio.virgilio_revertido_en is 'Cuando Gestion Virgilio volvio a poner el pedido en viaje por el No. NULL con estado denegado = no se pudo (ver virgilio_revertido_error).';

-- ---------- 3) de qué componente es un aviso ----------
create or replace function "GP2".importado_virgilio_componente_de(p_cod_insumo text, p_cod_importado text)
 returns bigint
 language sql
 stable
 set search_path to 'GP2'
as $function$
  -- primero el insumo (es la pieza que viaja: 323ES, H201Part), después el importado del pedido
  select coalesce(
    (select m.componente_id from "GP2".importado_virgilio_componente m where m.cod_virgilio = upper(btrim(p_cod_insumo))),
    (select m.componente_id from "GP2".importado_virgilio_componente m where m.cod_virgilio = upper(btrim(p_cod_importado))));
$function$;
revoke execute on function "GP2".importado_virgilio_componente_de(text, text) from public, anon, authenticated;

create or replace function "GP2".fn_ingreso_virgilio_componente()
 returns trigger
 language plpgsql
 set search_path to 'GP2'
as $function$
begin
  if new.componente_id is null then
    new.componente_id := "GP2".importado_virgilio_componente_de(new.cod_insumo, new.cod_importado);
  end if;
  if new.unidades is null and lower(coalesce(new.unidad, '')) in ('unidades', 'uni', 'u') then
    new.unidades := new.cantidad;
  end if;
  return new;
end $function$;
revoke execute on function "GP2".fn_ingreso_virgilio_componente() from public, anon, authenticated;
drop trigger if exists trg_ingreso_virgilio_componente on "GP2".ingreso_virgilio;
create trigger trg_ingreso_virgilio_componente before insert on "GP2".ingreso_virgilio
  for each row execute function "GP2".fn_ingreso_virgilio_componente();

-- ---------- 4) lo que ve la pantalla ----------
-- El componente se resuelve AL LEER también: un vínculo cargado después de que llegó el aviso lo
-- ubica en su tarjeta sin tocar la fila.
create or replace function "GP2".ingreso_virgilio_pendientes()
 returns jsonb
 language sql
 stable security definer
 set search_path to 'GP2'
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', i.id, 'creado_en', i.creado_en, 'creado_por', i.creado_por,
           'cod_importado', i.cod_importado, 'cod_insumo', i.cod_insumo, 'descripcion', i.descripcion,
           'cantidad', i.cantidad, 'unidad', i.unidad, 'unidades', i.unidades,
           'proveedor', i.proveedor, 'pedido_ref', i.pedido_ref, 'nota', i.nota,
           'componente_id', c.id, 'codigo', c.codigo, 'comp_descripcion', c.descripcion,
           'sector_id', c.sector_id, 'comp_proveedor', c.proveedor)
         order by i.creado_en, i.id), '[]'::jsonb)
    from "GP2".ingreso_virgilio i
    left join "GP2".componente c
      on c.id = coalesce(i.componente_id, "GP2".importado_virgilio_componente_de(i.cod_insumo, i.cod_importado))
   where i.estado = 'pendiente';
$function$;
revoke execute on function "GP2".ingreso_virgilio_pendientes() from public;
grant execute on function "GP2".ingreso_virgilio_pendientes() to anon, authenticated, service_role;

-- ---------- 5) Sí / No ----------
create or replace function "GP2".resolver_ingreso_virgilio(p_id bigint, p_acepta boolean, p_motivo text DEFAULT NULL::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'GP2'
as $function$
declare r "GP2".ingreso_virgilio%rowtype; c record; v_comp bigint; v_uni numeric; v_por text;
        v_rec jsonb; v_rec_id bigint; v_remito text;
begin
  perform "GP2"._exigir_autorizado();
  if p_acepta is null then raise exception 'Falta decir si llegó (Sí) o no (No).'; end if;
  select * into r from "GP2".ingreso_virgilio where id = p_id for update;
  if not found then raise exception 'Ese aviso de Gestión Virgilio ya no existe: recargá la pantalla.'; end if;
  if r.estado <> 'pendiente' then
    raise exception 'Ese aviso ya se resolvió (%): recargá la pantalla.', r.estado;
  end if;
  v_por := coalesce(nullif(lower(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'email'), ''), current_user);

  if p_acepta then
    v_comp := coalesce(r.componente_id, "GP2".importado_virgilio_componente_de(r.cod_insumo, r.cod_importado));
    if v_comp is null then
      raise exception 'El código % de Gestión Virgilio no está vinculado a ningún componente de GP2: avisá para vincularlo.',
        coalesce(r.cod_insumo, r.cod_importado);
    end if;
    select id, codigo, sector_id, proveedor into c from "GP2".componente where id = v_comp;
    v_uni := coalesce(r.unidades, case when lower(coalesce(r.unidad, '')) in ('unidades', 'uni', 'u') then r.cantidad end);
    if v_uni is null or v_uni <= 0 then
      raise exception 'Gestión Virgilio lo mandó en % sin decir cuántas unidades son: avisá a Virgilio.', r.unidad;
    end if;
    -- Igual que un Importado cargado a mano: suma en la ubicación de su sector y queda la recepción
    -- pendiente del control en kg (GP2CI la manda a su pantalla de control).
    v_remito := 'Virgilio #' || r.id;
    v_rec := "GP2".crear_recepcion_insumo(v_comp, c.proveedor, v_uni, 'uni', v_remito, now());
    v_rec_id := (v_rec->>'recepcion_id')::bigint;
    update "GP2".ingreso_virgilio
       set estado = 'confirmado', confirmado_en = now(), confirmado_por = v_por,
           componente_id = v_comp, ubicacion_id = "GP2".ubic_de('sector', c.sector_id),
           recepcion_insumo_id = v_rec_id, unidades = v_uni
     where id = p_id;
    return jsonb_build_object('ok', true, 'estado', 'confirmado', 'recepcion_id', v_rec_id, 'remito', v_remito,
      'componente_id', v_comp, 'codigo', c.codigo, 'sector_id', c.sector_id, 'proveedor', c.proveedor, 'unidades', v_uni);
  end if;

  -- No: GP2 sólo marca su fila. Gestión Virgilio escucha (trigger gv_ingreso_virgilio_denegado) y
  -- vuelve a poner el pedido en viaje con el chip «Denegado por Cervantes».
  update "GP2".ingreso_virgilio
     set estado = 'denegado', denegado_en = now(), denegado_por = v_por,
         denegado_motivo = nullif(btrim(coalesce(p_motivo, '')), '')
   where id = p_id;
  select * into r from "GP2".ingreso_virgilio where id = p_id;
  return jsonb_build_object('ok', true, 'estado', 'denegado',
    'virgilio_revertido', r.virgilio_revertido_en is not null, 'virgilio_error', r.virgilio_revertido_error);
end $function$;
revoke execute on function "GP2".resolver_ingreso_virgilio(bigint, boolean, text) from public, anon;
grant execute on function "GP2".resolver_ingreso_virgilio(bigint, boolean, text) to authenticated, service_role;

-- ---------- 6) la fila que ya estaba (3.000 u de 323ES del 30/09) ----------
update "GP2".ingreso_virgilio
   set componente_id = coalesce(componente_id, "GP2".importado_virgilio_componente_de(cod_insumo, cod_importado)),
       unidades = coalesce(unidades, case when lower(unidad) in ('unidades', 'uni', 'u') then cantidad end)
 where estado = 'pendiente';
