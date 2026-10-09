-- Reset de stock y movimientos — Cervantes + talleristas (Thomas, 09/10/2026):
--   "Todo lo que se recibe en Cervantes eliminá el stock y movimiento" · "Lo de los talleristas también en 0"
--   · "No apagues la entrada de Virgilio".
-- ⚠ CORRER EN EL SQL EDITOR DE SUPABASE: el conector de Claude retiene todo texto con DELETE y se corta a los 60 s.
-- Medido antes (09/10): 308 movimientos, 226 filas de inventario <> 0, 20 recepciones, 3 O.C. (7 renglones).
-- Alcance: todo movimiento que toca una ubicación de Cervantes (sector, art_terminado, virgilio_sector), de un
-- tallerista, de un P.S. (Pedernera / Carlos Aguirre es la única con movimientos que quedarían: 31, stock -22.319)
-- o de un inyector. Con las 4 juntas son los 308 movimientos: el inventario queda TODO en 0.
--   · Para dejar Pedernera afuera: sacar 'proveedor_servicio' de la lista (quedan 31 mov, Pedernera -22.319 y
--     Virgilio (Distribución) 6.336).
-- NO toca: el trigger trg_virgilio_espejo_gp2 (sigue prendido: la próxima entrega de Virgilio vuelve a mover
-- stock), las O.C. (trg_movimiento_oc_recibido les devuelve el "recibido" a 0 y deja el cruce en 0 como rastro),
-- inventario.maximo, ni la frontera ingreso_virgilio (sólo se suelta su vínculo a la recepción borrada).
-- Respaldo: GP2.bkp_reset_cervantes_20261009 (t, fila jsonb), RLS prendida sin policy (deny-all) → el invariante
-- D de db/verificar.sql da 1 mientras exista, a propósito.
begin;
create temp table _del on commit drop as
  select m.id from "GP2".movimiento m
   where m.ubic_origen_id  in (select id from "GP2".ubicacion where tipo in
                                 ('sector','art_terminado','virgilio_sector','tallerista','proveedor_servicio','inyector'))
      or m.ubic_destino_id in (select id from "GP2".ubicacion where tipo in
                                 ('sector','art_terminado','virgilio_sector','tallerista','proveedor_servicio','inyector'));
create temp table _rec on commit drop as
  select id from "GP2".recepcion_insumo where movimiento_id in (select id from _del);

create table "GP2".bkp_reset_cervantes_20261009 as
  select 'movimiento'::text t, to_jsonb(m) fila from "GP2".movimiento m where m.id in (select id from _del)
  union all select 'inventario', to_jsonb(i) from "GP2".inventario i where i.cantidad <> 0
  union all select 'recepcion_insumo', to_jsonb(r) from "GP2".recepcion_insumo r where r.id in (select id from _rec)
  union all select 'recepcion_control', to_jsonb(c) from "GP2".recepcion_control c where c.recepcion_id in (select id from _rec)
  union all select 'recepcion_control_rollo', to_jsonb(cr) from "GP2".recepcion_control_rollo cr
             where cr.control_id in (select c.id from "GP2".recepcion_control c where c.recepcion_id in (select id from _rec))
  union all select 'rollo_evento', to_jsonb(e) from "GP2".rollo_evento e
             where e.control_rollo_id in (select cr.id from "GP2".recepcion_control_rollo cr join "GP2".recepcion_control c
                                           on c.id = cr.control_id where c.recepcion_id in (select id from _rec))
  union all select 'entrega_control', to_jsonb(ec) from "GP2".entrega_control ec where ec.movimiento_id in (select id from _del)
  union all select 'alerta_recepcion', to_jsonb(a) from "GP2".alerta_recepcion a where a.movimiento_id in (select id from _del)
  union all select 'orden_compra_item', to_jsonb(oi) from "GP2".orden_compra_item oi
  union all select 'orden_compra', to_jsonb(o) from "GP2".orden_compra o
  union all select 'oc_item_recepcion', to_jsonb(x) from "GP2".oc_item_recepcion x
  union all select 'ingreso_virgilio', to_jsonb(iv) from "GP2".ingreso_virgilio iv where iv.recepcion_insumo_id in (select id from _rec);
alter table "GP2".bkp_reset_cervantes_20261009 enable row level security;

-- la frontera con Virgilio NO se borra: sólo se suelta el vínculo a la recepción que se va
update "GP2".ingreso_virgilio set recepcion_insumo_id = null,
       nota = coalesce(nota || ' | ', '') || 'reset Cervantes 09/10: recepción ' || recepcion_insumo_id || ' borrada (respaldo bkp_reset_cervantes_20261009)'
 where recepcion_insumo_id in (select id from _rec);
delete from "GP2".recepcion_insumo where id in (select id from _rec);       -- cascada: controles y rollos pesados
delete from "GP2".rollo_evento where control_rollo_id is null           -- los de esas recepciones + las reversas que agrega el trigger
   and (id in (select (fila->>'id')::bigint from "GP2".bkp_reset_cervantes_20261009 where t = 'rollo_evento')
        or (nota like 'reversa control %' and motivo = 'recepcion'
            and nota in (select 'reversa control ' || (fila->>'id') from "GP2".bkp_reset_cervantes_20261009 where t = 'recepcion_control_rollo')));
-- trg_movimiento_aplicar devuelve el stock; trg_movimiento_oc_recibido baja el "recibido" de la O.C. y deja
-- el cruce oc_item_recepcion en 0 como rastro (por eso el cruce NO se borra antes: el trigger lo necesita)
delete from "GP2".movimiento where id in (select id from _del);
commit;

-- Verificación (correr después; todo debe dar 0 salvo lo que quede afuera a propósito):
select (select count(*) from "GP2".movimiento) movimientos,
       (select count(*) from "GP2".inventario where cantidad <> 0) inventario_no_cero,
       (select count(*) from "GP2".recepcion_insumo) recepciones,
       (select count(*) from "GP2".orden_compra_item where recibido <> 0) oc_con_recibido,
       (select count(*) from "GP2".bkp_reset_cervantes_20261009) filas_respaldo;
