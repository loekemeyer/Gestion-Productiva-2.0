# Ideas del agente diario de GP2

Registro canónico de propuestas, EN MAIN (el usuario no quiere ramas). Una línea por
idea, la más nueva ARRIBA.
Formato: `- [ ] **<código>** (AAAA-MM-DD) [impacto·esfuerzo] <título> — <detalle corto> — _pendiente|hecha|descartada_`

El usuario activa una idea diciendo su código en cualquier chat ("dale 4837").
Los fixes chicos y seguros el agente diario los hace DIRECTO en main, con la suite
en verde antes de pushear, y los anota acá como hechos. Lo más grande queda
pendiente hasta que el usuario lo active.

---

- [ ] **6104** (2026-08-31) [alto·medio] Motor de costos: propagar precio de insumo por ruta_paso (no solo por BOM) — Detectado en la revision del usuario 2026-08-31: V10/V14/C13/V11 estan enganchados a 570/560/546/581 via `ruta_paso` (tipo "Insumo X → Art Y"), NO por `componente_bom`. El motor `v_costo_componente` con origen='ruta' hoy NO chupa el precio del insumo (solo la MO/servicio del paso). Por eso 560 dice $470.39 con `faltan_precios=0` aunque V14 no tenga precio real. Al restaurar el placeholder USD 1 los articulos NO subieron. Definir si el motor debe: (a) sumar precio del insumo cuando el paso dice "Insumo X → Art Y", o (b) exigir que ese insumo tambien este en BOM del articulo padre. Impacto: valorizacion de stock actual esta subestimada para todos los articulos que usan remaches via ruta. — _pendiente_
- [ ] **6105** (2026-08-31) [medio·chico] Cargar BOM real de 546/560/570/581 (cuantos remaches por unidad de articulo) — El BOM esta vacio. Si el usuario confirma el motor propaga por ruta (idea 6104), esto sigue siendo util para la valorizacion cruzada. Si el motor cambia, es OBLIGATORIO. Cantidades preguntar al usuario (tipicamente 1, pero puede ser 2 o mas). — _pendiente_
- [ ] **6106** (2026-08-31) [medio·chico] Cargar articulos 546 y 581 en `GP2.articulo` — Existen los codigos pero NO figuran como articulos vendibles. Pendiente decision del usuario: son discontinuados? van al catalogo? — _pendiente_
- [ ] **6107** (2026-08-31) [chico·chico] Cargar ruta CV14 → V14 (niquelado) — El usuario dijo "CV14 seria lo mismo que V14 pero crudo". Falta la ruta de niquelado que produce V14 desde CV14. Mismo patron: CV9 → V9 ya existe (proveedor_servicio). — _pendiente_
- [x] **5921** (2026-08-31) [medio·chico] Reestilar 8 módulos de paleta oscura a la clara — El commit `168737a Tema claro global` (otra sesión) ya reestiló 6 de los 8: `Programa/Programa.html`, `Despiece x Articulo/Despiece_GP2.html`, `Stocks General/StockGeneral_GP2.html`, `Talleristas/Proporciones/Proporciones_GP2.html`, `Talleristas/Faltante Partes Tallerista/FaltantePartesTallerista_GP2.html`, `Talleristas/ABM Articulos/ABM_Articulos_GP2.html`. Los 2 de Informes usaban variables `:root{--bg:#0f172a;...}` y quedaron sin cubrir; hoy se les cambió el `:root` a paleta clara (`--bg:#ebeff4` etc.), sin tocar HTML/JS. Todo cerrado. — _hecha_
