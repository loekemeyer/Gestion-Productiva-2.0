# Rediseño GP2 — estado al frenar (2026-10-08, noche)

Rama: `claude/gifted-euler-yebpqs`. **Nada de esto está en `main`.** Pedido del usuario: un solo push a
`main` con todo, incluida la Tablet Logística, cuando esté terminado y la suite en verde.
Esta carpeta (`Diseno/traspaso/`) es de trabajo: **borrarla antes del push a main**.

## Hecho
- `gp2-modulo.css` = sistema de diseño (tokens, Inter local en `fonts/`, barra fija, tablas con thead/tfoot
  pegados, chips, tabs, kpis, avisos…). `gp2-claro.css` borrado.
- `gp2-menu.js` (única copia del menú) + `gp2-nav.js` (marca GP2 → selector de módulos; mide `--bar-h`).
- `GP2_MODULOS.html` y `login.html` rediseñados (pasan `test_menu_una_pantalla`, `test_stock_sector`,
  `test_monitor_ingreso`, `test_inicio_pend`).
- `Diseno/SistemaDiseno_GP2.html` (guía viva), `DISENO_GP2.md`, sección en `CLAUDE.md`,
  `CONOCIMIENTO_GP2.md` §4kf (⚠ en main otra sesión ya usó §4kf: renumerar la mía a §4kg al mergear).
- `tests/ui/test_diseno.js` (guardia). Al frenar sólo fallaban calculadora.html, calculadora-basica.html y
  envios-only.html (ver `test_diseno_al_frenar.txt`).

## Frenado a mitad (los 9 agentes se cortaron en medio de un archivo)
Lote: último paso que estaban haciendo →
- A (Despiece, rendimiento, maestro, alertas, Disruptivas): marcado de `Disruptivas/disruptivas_GP2.js`.
- B (ABM Artículos, Proporciones, FaltantePartes, informes x2, monitor2, entrevistas): CSS+marcado de ABM Artículos.
- C (monitor, abm, tiempos, Registro, MonitorIngreso, ProblemasMatrices, UnidadesSinAccidente, VerifCajones, OrdenProduccion): corriendo tests transversales (casi terminado).
- D (RecepcionInsumos, Flejes, Rollos, control-cajas/remaches, StockSector, StockTransitoPS): ajustando una aserción de test.
- E (Programa, OC, Inyectores, Pintores, Valorizacion, Recepciones, LecturaFacturas, ControlInyectores): **reescribiendo CSS y marcado de Programa.html** — revisar a fondo.
- F1 (envios-only, calculadoras, CalcularCajones, ControlEntregaPS, tandas-popup.css, envíos/entregas x8): iba por RecepcionVirgilio; **faltan envios-only y calculadoras**.
- F2 (ControlPS/Tall/AT, ControlEnvios, CasosEspeciales, CambiarTallerista, Consumo, Faltantes, Preavisos, consumo-detalle.js, gp2-composicion.js): ajustando una aserción de test_consumo.
- G (StockGeneral, Relevamiento, ValidacionRemitos, Validacion_Stock): marcado del body de una de ellas; tenía que integrar a mano los cambios de main (commit 1d4fd8b) en Relevamiento_GP2 y Validacion_Stock.
- H (Tablet_GP2, partiendo de la versión de main con lo de Nazareno): recién empezaba a pasar los render a clases.

## Para retomar (orden)
1. Por cada página: captura 1366 y 390 (`node Diseno/traspaso/one.js "<ruta>" out.png 1366 900 1`, con
   `NODE_PATH=$(npm root -g)`; stub en `stub.js`) y los tests que la nombran. Terminar lo cortado.
2. Commit, `git merge origin/main` (conflictos esperables: Relevamiento_GP2, Validacion_Stock, Tablet_GP2,
   GP2_MODULOS/login/envios-only en la línea de version.js, CONOCIMIENTO §4kf, LOCKS.txt).
3. version.js → v1.258.0 (main está en v1.257.1) con token nuevo en las 3 páginas que lo cargan.
4. `bash tests/ui/run.sh` completo (línea base: 78/79, `test_login_flow.js` ya fallaba antes).
5. LOCKS.txt historial, borrar `Diseno/traspaso/`, push a main (`git push origin <rama>:main`).
