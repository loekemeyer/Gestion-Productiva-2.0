# db/ — Respaldo del schema GP2

Export automático **2026-08-29** desde Supabase (`hrxfctzncixxqmpfhskv`). Antes de esto,
el schema vivía SOLO en la base (las migraciones se aplican por MCP y no quedan en el repo).

| Archivo | Contenido | Exactitud |
|---|---|---|
| `tablas_GP2.sql` | 41 tablas (columnas, identity, defaults, constraints) + 41 índices + 6 triggers + RLS + 43 policies | DDL reconstruido de `pg_catalog` (constraints/índices/triggers exactos vía `pg_get_*def`) |
| `funciones_GP2.sql` | Las 82 funciones/RPCs del schema | Exacto (`pg_get_functiondef`) |
| `vistas_GP2.sql` | Las 7 vistas (`v_punto_stock`, `v_consumo_parte`, `v_consumo_fleje_kg`, etc.) | Exacto (`pg_get_viewdef`) |

**Qué NO incluye**: los DATOS (maestros e inventario viven en la base), los grants
(lectura para `anon/authenticated` en todo + insert/update en `empleado` + execute en las
RPCs — ver LOCKS.txt historial "SEGURIDAD RLS"), las secuencias sueltas viejas
(`inventario_id_seq`, `movimiento_id_seq`, etc., que quedaron como `default nextval(...)`),
ni los triggers espejo que viven sobre tablas de `public`
(`trg_virgilio_espejo_gp2`, `trg_est_madre_sync_gp2` — sus funciones sí están en
`funciones_GP2.sql`).

**Para restaurar en una base vacía**: correr en orden `tablas_GP2.sql` →
`funciones_GP2.sql` → `vistas_GP2.sql`, y después recrear los 2 triggers de `public` y
los grants. Ojo con el orden de las FKs entre tablas (si falla, correr las FKs en una
segunda pasada).

**Para regenerar este export**: pedirle a Claude "regenerá db/" — sale de queries a
`pg_catalog` (ver historial 2026-08-29).
