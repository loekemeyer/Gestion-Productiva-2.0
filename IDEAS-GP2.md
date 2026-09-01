# Ideas del agente diario de GP2

Registro canónico de propuestas, EN MAIN (el usuario no quiere ramas). Una línea por
idea, la más nueva ARRIBA.
Formato: `- [ ] **<código>** (AAAA-MM-DD) [impacto·esfuerzo] <título> — <detalle corto> — _pendiente|hecha|descartada_`

El usuario activa una idea diciendo su código en cualquier chat ("dale 4837").
Los fixes chicos y seguros el agente diario los hace DIRECTO en main, con la suite
en verde antes de pushear, y los anota acá como hechos. Lo más grande queda
pendiente hasta que el usuario lo active.

---

- [x] **6104** (2026-08-31) [alto·medio] Motor de costos: propagar precio de insumo por ruta_paso (no solo por BOM) — RESUELTO. La vista `v_costo_componente` sumaba solo BOM directo y materiales via ruta matriz/servicio/tallerista. Ignoraba los pasos `tipo_paso='insumo'` (ent=X, sal=null) que declaran insumos del armado. Se agrego un CTE `insumox` que suma esos insumos al articulo padre (comp_salida no-null de la misma ruta). Migracion `v_costo_componente_propagar_insumo_ruta`. Diff post-cambio: 88 articulos subieron su costo (0 bajaron), +$51.939 en total. Ejemplos: 546 $0→$2.062, 570 $283→$2.321, 560 $470→$2.356. — _hecha_
- [x] **6105** (2026-08-31) [medio·medio] Cantidad por paso de ruta — Se agrego columna `cantidad NUMERIC NOT NULL DEFAULT 1` a `GP2.ruta_paso`. CTE `insumox` de v_costo_componente multiplica por `cantidad`. UPDATE masivo: los 82 pasos `insumo` de caja (sector 11) pasaron de cantidad=1 a cantidad=1/`articulos_por_caja` del articulo padre. Impacto: 82 articulos bajaron su costo (0 subieron), delta -$20.226,60 total, mayor baja -$555,04. Los cartones y otros insumos siguen en 1 por defecto: si algun articulo lleva cantidad ≠ 1 (ej cartones huevo, plisticos multiuso) se setea con UPDATE a mano. — _hecha_
- [x] **6106** (2026-08-31) [chico·chico] Cargar articulos 546 y 581 en GP2.articulo — CREADOS. 546: familia="Cortadores (queso)", 581: familia="Sacacorchos", ambos discontinuado=false. Limpieza de duplicado: componente 549 tenia codigo "546 Terminado" pero articulo 89 tenia codigo "546" (no matcheaban). Se unifico renombrando 549 -> "546", borrando mi componente/articulo duplicado. Mismo tratamiento para "581 Terminado" -> "581". — _hecha_
- [x] **6107** (2026-08-31) [chico·chico] Cargar ruta CV14 → V14 (niquelado) — La ruta 457 "Insumo V14 -> Art 560" se reescribio con el patron CV9→V9 embebido: `ingreso CV14` + `proveedor_servicio CV14→V14 (Guazzaroni Patricio, tarifa niquelado ya cargada)` + `tallerista V14→560 (Alex, id 9)` + `virgilio`. El costo de 560 quedo igual ($2356,21 antes, $2116,21 despues del arreglo de la caja) pero ahora la trazabilidad refleja bien la cadena. — _hecha_
- [ ] **6108** (2026-08-31) [chico·chico] Ruta de 581 (Sacacorchos) sin cargar — 581 tiene articulo pero cero rutas. El usuario dijo "V11 va a 581" pero no aclaro que tallerista lo arma ni si lleva otros insumos (caja, carton, mango, capuchon). Preguntar al usuario antes de crearla. — _pendiente_
- [x] **5921** (2026-08-31) [medio·chico] Reestilar 8 módulos de paleta oscura a la clara — El commit `168737a Tema claro global` (otra sesión) ya reestiló 6 de los 8: `Programa/Programa.html`, `Despiece x Articulo/Despiece_GP2.html`, `Stocks General/StockGeneral_GP2.html`, `Talleristas/Proporciones/Proporciones_GP2.html`, `Talleristas/Faltante Partes Tallerista/FaltantePartesTallerista_GP2.html`, `Talleristas/ABM Articulos/ABM_Articulos_GP2.html`. Los 2 de Informes usaban variables `:root{--bg:#0f172a;...}` y quedaron sin cubrir; hoy se les cambió el `:root` a paleta clara (`--bg:#ebeff4` etc.), sin tocar HTML/JS. Todo cerrado. — _hecha_
