# REFACTOR_GP2.md — bitácora de la auditoría de arquitectura (2026-09-04)

> Registro de los cambios de la auditoría/refactor en loop de 7 horas sobre GP2 (base +
> código). Cada bloque dice QUÉ se cambió, POR QUÉ, CÓMO se verificó y qué queda pendiente.
> Las dudas que dependen de una regla de negocio están en `PREGUNTAS_ARQUITECTURA_GP2.md`.
> Los cambios en Supabase quedan aplicados como migraciones `refactor_20260904_*` (no las
> versiona git; `db/` se regenera al final).

## Punto de partida (2026-09-04 17:44 AR)

| | Antes |
|---|---|
| Tablas GP2 | **67** (13 eran `snap_*` / backup sin ningún uso, 3 sin RLS además de esas) |
| Vistas | 16 |
| Funciones/RPC | **135** (14 sin ningún llamador: ni pantalla, ni función, ni trigger, ni cron) |
| Suite UI | 33/33 OK |
| Archivos HTML en el repo | 133 (≈50 son pantallas del programa viejo contra `public`) |

Problemas principales detectados en el mapa inicial (detalle en las secciones de cada ciclo):
- Tablas temporales de sesiones anteriores acumuladas en la base (`snap_*`, `*_backup_*`).
- Funciones huérfanas (bundles sin pantalla, trigger functions nunca colgadas, shims a `public`).
- Varias fuentes de verdad para el mismo dato: `est_madre` vs `articulo.estadistica_madre_uni_mes`;
  `tallerista.ubicacion_stock_id` vs `ubicacion(tipo, ref_id)`; `fleje_detalle.kg_x_uni` vs
  `componente.kg_x_uni`; 4 candidatas a "unidades por caja"; 3 tablas de alias; 5 tablas de precios.
- Módulo viejo de Relevamiento (schema `relevamiento_cervantes`) todavía linkeado desde la tablet.

---

## Ciclo 1 — limpieza segura de la base (17:45–18:30 AR)

### Tablas eliminadas (14)
| Tabla | Filas | Por qué | Respaldo |
|---|---|---|---|
| `snap_costo_20260903`, `snap_costo2_20260903`, `snap_costo_516`, `snap_costo_maspoli`, `snap_costo_pliegos`, `snap_costo_pliegos_0903`, `snap_costo_remaches` | 574–575 c/u | fotos de `v_costo_componente` para comparar antes/después de cambios ya cerrados (IDEAS 7218–7240). Recomputables. | no hace falta (vista) |
| `snap_recepcion_20260903`, `snap_mov_recepcion_20260903`, `snap_inventario_20260903` | 81/81/1056 | copia previa al borrado de las 81 recepciones DE PRUEBA (IDEAS 7220, aprobado por el usuario) | eran datos de prueba |
| `snap_recepcion_maspoli`, `snap_precio_mangos_maspoli` | 6/3 | copia previa del cambio Maspoli (cerrado) | — |
| `inventario_minimo_backup_20260902` | 1054 | foto previa al `recalcular_minimos()` del 2026-09-02 | **`db/respaldo_inventario_minimo_20260902.csv`** (las 378 filas que cambiaron, con mínimo anterior y recalculado) |
| `agente_propuestas` | 0 | el agente diario registra en `IDEAS-GP2.md` (git), nunca usó la tabla | — |

Verificado antes de borrar: ninguna función, vista, trigger ni archivo del repo las nombra
(regex sobre `pg_proc.prosrc`, `pg_get_viewdef`, `pg_depend` y `grep -r` en HTML/JS/SQL).
Migración: `refactor_20260904_drop_snapshots`, `refactor_20260904_drop_funciones_muertas_1`.

### Seguridad
- `relevamiento`, `relevamiento_cronograma`, `relevamiento_item` eran las únicas tablas vivas sin
  RLS (nacieron el 2026-09-04): ahora RLS + policy `p_gp2_select` (anon/authenticated) como el
  resto del schema. La escritura ya iba sólo por las RPC `relevamiento_*` (SECURITY DEFINER).
  Migración `refactor_20260904_rls_relevamiento`. **Advisor: 0 tablas sin RLS.**
- `relev_factor` y `relev_total_uni` eran las 2 únicas funciones GP2 sin `search_path` fijo
  (advisor `function_search_path_mutable`): `set search_path = 'GP2'`
  (`refactor_20260904_search_path_relev`). Advisor de seguridad para GP2: 0 hallazgos.
- Advisor de performance para GP2 (solo INFO): 10 FKs sin índice en tablas de <500 filas y 9
  índices sin uso en tablas chicas. No se agregan índices a tablas de decenas de filas; los
  índices sin uso se revisan en el ciclo de índices.

### Funciones eliminadas (14)
| Función | Por qué |
|---|---|
| `control_remaches_bundle()` | stub `select control_kg_bundle(8)`; las pantallas llaman `control_kg_bundle` directo |
| `despiece_bundle()` | reemplazada por `despiece_verif_bundle` (2026-08-30) |
| `entregas_tallerista_bundle()`, `envios_tallerista_bundle()`, `partes_por_tallerista()` | sin pantalla desde 2026-08-29 (Control Envíos y Entregas las cubre); la tercera sólo la llamaba la segunda |
| `fn_espejo_entrega_tallerista()`, `fn_espejo_produccion()` | trigger functions nunca colgadas de un trigger; producción es nativa (decisión 2026-08-29) y el espejo vivo de Virgilio es `fn_entregas_virgilio_espejo` |
| `recepcion_virgilio_bundle()` | sin pantalla (Entrega Virgilio sigue en la app vieja) |
| `stock_bundle()` | Stocks General usa `stock_sector_bundle` |
| `nuevo_codigo_propuesta()` | sólo servía a `agente_propuestas` |
| `rc_agregar_lugar`, `rc_borrar`, `rc_generar`, `rc_set_conteo` | shims de 60 chars que reenviaban a `public.rc_*` para la pantalla vieja de Relevamiento (borrada, ver abajo) |

Verificado: `grep -r` del nombre en todo HTML/JS (sin tests) = 0 llamadas; ningún trigger
(`pg_trigger.tgfoid`), ningún `cron.job`, ninguna otra función las nombra.

### Código eliminado
- `Relevamiento/relevamiento.html` + `relevamiento.js` (84 KB, schema `relevamiento_cervantes`
  vía `public.rc_*`), `Relevamiento/_backup_relevamiento_20260731.{html,js}` (foto de backup con la
  clave anon embebida) y `Relevamiento/db.sql` (DDL del schema viejo). Decisión del usuario
  2026-09-04: *"borrá relevamientos (viejo) y dejá solo relevamiento gp2 (nuevo)"*. La tablet
  (`envios-only.html`) y la lista del rol `envios` en `auth-guard.js` pasan a
  `Relevamiento/Relevamiento_GP2.html`.
- `tests/ui/test_tokens_cache.js`: el backup deja de estar en la lista de archivos permitidos con
  la clave.

### Docs
- `CONOCIMIENTO_GP2.md` §2e-bis y §4q actualizados (dónde vive el respaldo de mínimos; el módulo
  viejo de Relevamiento ya no existe).

### Estado tras el ciclo 1
53 tablas · 16 vistas · 121 funciones · 0 tablas sin RLS.

---

## Decisiones arquitectónicas (acumuladas)

1. **Las copias de datos no viven en la base.** Un snapshot "por si hay que volver atrás" va a
   `db/` en git (CSV chico) o se recomputa; nunca queda como tabla `snap_*`/`_bak_*` en el schema.
2. **Una función sin llamador se borra**, no se guarda "por si acaso": está en git
   (`db/funciones_GP2.sql`) si hace falta recuperarla.
3. **Toda tabla GP2 tiene RLS + policy de lectura**; escritura sólo por RPC SECURITY DEFINER.

## Riesgos pendientes
- `auth-guard.js` tiene la lista de páginas del rol `envios` apuntando a pantallas del programa
  viejo (login apagado hoy, así que no aplica; si se prende, la tablet queda restringida a las
  viejas). Se resuelve con la respuesta a la pregunta 1 de `PREGUNTAS_ARQUITECTURA_GP2.md`.
