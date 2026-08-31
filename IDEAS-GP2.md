# Ideas del agente diario de GP2

Registro canónico de propuestas, EN MAIN (el usuario no quiere ramas). Una línea por
idea, la más nueva ARRIBA.
Formato: `- [ ] **<código>** (AAAA-MM-DD) [impacto·esfuerzo] <título> — <detalle corto> — _pendiente|hecha|descartada_`

El usuario activa una idea diciendo su código en cualquier chat ("dale 4837").
Los fixes chicos y seguros el agente diario los hace DIRECTO en main, con la suite
en verde antes de pushear, y los anota acá como hechos. Lo más grande queda
pendiente hasta que el usuario lo active.

---

- [x] **5921** (2026-08-31) [medio·chico] Reestilar 8 módulos de paleta oscura a la clara — El commit `168737a Tema claro global` (otra sesión) ya reestiló 6 de los 8: `Programa/Programa.html`, `Despiece x Articulo/Despiece_GP2.html`, `Stocks General/StockGeneral_GP2.html`, `Talleristas/Proporciones/Proporciones_GP2.html`, `Talleristas/Faltante Partes Tallerista/FaltantePartesTallerista_GP2.html`, `Talleristas/ABM Articulos/ABM_Articulos_GP2.html`. Los 2 de Informes usaban variables `:root{--bg:#0f172a;...}` y quedaron sin cubrir; hoy se les cambió el `:root` a paleta clara (`--bg:#ebeff4` etc.), sin tocar HTML/JS. Todo cerrado. — _hecha_
