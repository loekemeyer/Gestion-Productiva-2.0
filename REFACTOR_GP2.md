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

## Ciclo 1b — código muerto del repo (agente A3, 18:15–18:50 AR)

Auditoría de alcance desde las 7 entradas (index, login, GP2_MODULOS, envios-only, manifest,
los 2 sw.js) siguiendo todo href/src/location/MENU: **247 assets → 121 alcanzables / 126 no**.

### Archivos eliminados (74, ≈1,74 MB, ≈41.500 líneas) — todos en git si hacen falta
| Grupo | Archivos | Evidencia |
|---|---|---|
| Export generado | `Despiece x Articulo/_export/` (6; 1,12 MB) | nadie lo carga; `despiece_lib.js` leía `public` por REST con la clave anon embebida |
| Planificación vieja | `.planning/` (23; 219 KB) | GSD abril–mayo 2026 sobre un Electron que nunca existió; 0 referencias |
| Prototipo OCR | `Talleristas/Recepcion/ocr-segmentos/` (6; 74 KB) | tests de mesa y plantillas; `test-lector.html` cargaba un JS que ya no estaba ahí |
| Pantallas GP2 jubiladas hoy | `Compras/AltrakCharcas_GP2.html`, `Compras/AperamEclipse_GP2.html`, `Prov Serv/CharcasEclipse/` | menú v1.18/1.19/1.20 (2026-09-04): el flujo pasó a Recepción Insumos y Entrega PS; sin link, sin test |
| Backups y fotos | `_legacy_EntregasAT.{html,js,css}.bak`, `Produccion/InformesVirgilio/Code.gs.backup`, `Produccion/.claude/settings.json` (ruta UNC) | copias congeladas / leftovers |
| JS/CSS sin cargador | `helpers.js` (además rompía al cargarse: `PROV_AT` sin definir), `cajones-popup.js/.css` (`cajonesPopup` nunca invocado; se sacaron sus 2 etiquetas de EnviosPS.html y EnviosTall.html), `StockFlejes/flejes.js/.css` (nadie los carga; clave anon embebida) | grep en todo el repo |
| Assets | `en-stock.ico`, `en-stock.png` (favicon viejo), `Art` (0 bytes), `Produccion/ejemplo_reporte.html` | 0 referencias |
| Docs superadas | `CONTEXTO_SESION_2026-08-29.txt`, `E2E_TEST_RESULT_2026-08-28.md`, `ESTADO_MIGRACION_GP2.md`, `AUDIT_COMPLETO_2026-04-19.md`, `INFORME_AUDITORIA_SUPABASE.md`, `PROBLEMAS_CODIGOS_ISIS_2026-07-15.md`, `SC_sin_vincular_SC_Kg.txt`, `Diagrama_Sistema.html`, `Onboarding-Gestion-Productiva.html` | handoffs de agosto y auditorías del vecino (abril/julio); 0 referencias; lo vigente vive en CONOCIMIENTO/IDEAS |
| SQL y scripts one-off sobre `public` | `Cod_ISIS_Pedernera_2026-07-15.sql`, `SQL_INSERT_SP_Kg.sql`, `SQL_UNIFICAR_CP4_GRJ3.sql`, `SQL_TRIGGERS_SINCRONIZACION.sql`, `gen_sql.sh`, `envios_excel.py`, `read_conteo_*.py` (4) | ya aplicados en la casa del vecino; leen rutas `S:\` y Excel con fecha |
| Dependencias sin uso | `package.json`, `package-lock.json` | ningún archivo hace `require`; los tests usan Playwright global |
| Redirect duplicado | `Inicio/index_GP2.html` | `Inicio/index.html` hace lo mismo; se dejó ese (lo abre `test_login_flow`) reducido a 14 líneas |

### Ediciones que acompañan
- `StockFlejes/control-cajas.html` y `control-remaches.html`: el botón Atrás caía en
  `StockFlejes/index.html` (el menú VIEJO de insumos, que resucitaba 4 stocks de `public`);
  ahora vuelve a `GP2_MODULOS.html`.
- `tests/ui/test_tokens_cache.js`: la clave anon ya no tiene excepciones (solo `supabase-config.js`).
- `tests/README.md`: la tabla listaba 16 tests (uno inexistente) y omitía 17; ahora los 33.
- `CLAUDE.md` (referencia a `Inicio/index_GP2.html`), `CONOCIMIENTO_GP2.md` §2i-bis (los `.bak`).

### Lo que NO se borró (decisión del usuario, ver PREGUNTAS 1–2 y 4–6)
Las ≈120 páginas del programa viejo contra `public` (29 todavía linkeadas desde la tablet o
la whitelist; 91 sin ningún link), los 5 módulos con candado del menú, los redirects de
cortesía, y las docs que todavía referencia alguien (`AUDITORIA_RUTAS_2026-04-18.md`,
`Tablas_Madre_y_Dependencias.xls`, `SQL_GP2_PENDIENTES.sql`, `ANALISIS_GP2_2026-08-28.md`,
`AUDITORIA_GP2_2026-08-31.md`, `PENDIENTES_UBICACIONES_2026-08-30.md`, `MACRO_ENTREGAS_SUPABASE.bas`).

### Duplicación de código detectada (para los ciclos siguientes)
`esc()` ×79, `fmt()` ×45 (8 variantes), `$()` ×42, 3 semánticas de "hoy" (2 en UTC),
52 `createClient` inline, 4 frameworks de popup, 9 pantallas de stock por sector 86–96 %
idénticas, `control-cajas` / `control-remaches` 74 % iguales, `gp2-modulo.css` y
`gp2-claro.css` definiendo los mismos 17 selectores. Detalle en el informe A3.

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
