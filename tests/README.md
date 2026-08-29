# Tests GP2

Suite creada 2026-08-29. Dos capas:

## 1) `tests/ui/` — pantallas (Playwright + Chromium)

Cada `test_*.js` abre la pantalla real del repo con **Supabase stubeado** (no tocan la
base): verifican payloads de RPC, filtros, cálculos en pantalla y flujos completos.

| Test | Pantalla / flujo |
|---|---|
| test_op_e2e.js | App Operarios entera: legajo → E con rollo → C → RM → baja vía RPC → cola ✓. El stub **revienta** si la app toca una tabla directo. |
| test_botones_fuera.js | Botones sacados 2026-08-29 (RD/CM/REM) fuera y el resto presente; menú sin los candados muertos |
| test_login_flow.js | GP2_MODULOS con auth-guard, Cerrar sesión, redirect de la landing vieja |
| test_oc.js / test_oc_print.js | Órdenes de Compra: sugeridos, reglas de cartón C/LOKE/8, crear, imprimir |
| test_dev.js | Devolución Cervantes (sector / Para Analizar) |
| test_ctrl.js | Control Envíos y Entregas (pivote, medidas Kg/Uni/Cajas) |
| test_pm.js | Problemas con Matrices (RM/PM, uni acumuladas, golpes) |
| test_mon2.js | Cierres del Día · Premios, ex "Monitor 2.0" (premio espejo y calculado, alertas ±3) |
| test_bom.js | Editor de BOM del ABM Artículos |
| test_ps_em.js | Punto de Stock: tag EM en máximos derivados de Est Madre |
| test_inicio_pend.js | Alerta de cargas de Virgilio sin aplicar (espejo_pend) |
| test_inyectores.js | Inyectores: botonera por proveedor, asignar/desasignar (payload de la RPC), aviso de partes que fabrica un tallerista, resumen y chips de rubro |

**Correr**: `bash tests/ui/run.sh`
Requiere `node` + `playwright` (local o global: `npm i -g playwright`). Si Chromium no
está en `/opt/pw-browsers/chromium` (entorno remoto), instalarlo con
`npx playwright install chromium` o apuntar `CHROMIUM_PATH` al ejecutable.

## 2) BD — pruebas con rollback

Las pruebas del motor (circuito E2E completo, cruce OC, premio nativo, RLS como anon,
triggers de máximos) se corren como bloques `DO $$ ... $$` que SIEMPRE terminan en
`raise exception 'OK_ROLLBACK ...'` para revertir todo. Ver los detalles y resultados en
`LOCKS.txt` [HISTORIAL] (entradas 2026-08-29). Patrón: armar el escenario con las RPCs
reales, verificar deltas contra snapshot, y abortar con OK_ROLLBACK — la base queda intacta.
