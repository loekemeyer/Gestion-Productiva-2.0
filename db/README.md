# db/ — Respaldo del schema GP2

Export automático **2026-08-31** desde Supabase (`hrxfctzncixxqmpfhskv`). Antes de esto,
el schema vivía SOLO en la base (las migraciones se aplican por MCP y no quedan en el repo).

| Archivo | Contenido | Exactitud |
|---|---|---|
| `tablas_GP2.sql` | 51 tablas (columnas, identity, defaults, comentarios de columna) + 128 constraints + 46 índices (los que no cuelgan de un constraint) + 8 triggers + RLS en 50 tablas + 50 policies | DDL reconstruido de `pg_catalog` (constraints/índices/triggers exactos vía `pg_get_*def`) |
| `funciones_GP2.sql` | Las 102 funciones/RPCs del schema | Exacto (`pg_get_functiondef`, verificado por md5 contra la base) |
| `vistas_GP2.sql` | Las 15 vistas (`v_costo_componente`, `v_punto_stock`, `v_consumo_parte`, `v_consumo_fleje_kg_v2`, `v_valor_stock`, etc.) | Exacto (`pg_get_viewdef`, verificado por md5 contra la base) |

Comparado con el export anterior (2026-08-29: 41 tablas / 82 funciones / 7 vistas) creció
todo lo de costos y valorización (`precio_servicio_pieza`, `precio_tallerista`,
`tarifa_servicio`, `proceso`, `tipo_cambio`, `v_costo_componente`, `v_valor_stock`,
`v_valor_pedido`), faltantes (`faltante_marcado`, `v_faltante_estado`), pintores
(`parte_proveedor_servicio`) y el agente diario (`agente_propuestas`).

**Qué NO incluye**: los DATOS (maestros e inventario viven en la base), los grants, las
secuencias sueltas viejas (`inventario_id_seq`, `movimiento_id_seq`, etc., que quedaron
como `default nextval(...)`), ni los triggers espejo que viven sobre tablas de `public`
(`trg_virgilio_espejo_gp2`, `trg_est_madre_sync_gp2` — sus funciones sí están en
`funciones_GP2.sql`).

**Ojo con los grants: cambiaron el 2026-08-31.** Ya no alcanza con la foto vieja
("lectura para `anon/authenticated` en todo + insert/update en `empleado` + execute en las
RPCs"). Lo que cambió hoy:

- **Se cerró la escritura anónima de `GP2.empleado`**: se borraron las policies
  `p_empleado_insert` / `p_empleado_update` y se revocaron los INSERT/UPDATE directos.
  El alta/edición de operarios ahora va **solo por las RPC `empleado_guardar` y
  `empleado_activar`** (SECURITY DEFINER). Hoy ninguna tabla GP2 acepta escritura anónima
  directa: todas las policies vigentes son de SELECT.
- **Se revocó el `execute` de `GP2.inv_delta`**: es interna del motor de inventario (la
  llama el trigger `fn_movimiento_aplicar`), no se expone al cliente.

**Para restaurar en una base vacía**: correr en orden `tablas_GP2.sql` →
`funciones_GP2.sql` → `vistas_GP2.sql`, y después recrear los 2 triggers de `public` y
los grants. Ojo con el orden de las FKs entre tablas (si falla, correr las FKs en una
segunda pasada). Las vistas también tienen orden entre sí (`v_consumo_demanda` antes que
`v_consumo_componente`, y `v_costo_componente` antes que `v_valor_stock` /
`v_valor_pedido`); el archivo va alfabético, así que si alguna falla, repetir la pasada.

**Puesto al dia el 2026-08-31 (registro por golpes)**: `funciones_GP2.sql` trae las 4 RPCs
que cambiaron (`registrar_evento_prod`, `registrar_produccion`, `movimientos_bundle`,
`registro_operarios_bundle`), verificadas md5 byte-exacto contra la base;
`tablas_GP2.sql` suma `produccion.golpes` / `produccion.uni_x_golpe` y pone `matriz` al dia
(le faltaban `tiempo_unidad`, `tipo_matriz`, `maquina` y los 3 CHECK — habian quedado fuera
del export anterior).

**Para regenerar este export**: pedirle a Claude "regenerá db/" — sale de queries a
`pg_catalog` (ver historial 2026-08-29 y 2026-08-31).
