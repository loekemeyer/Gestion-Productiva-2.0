# Sistema de diseño de GP2 (v2 · 2026-10-08)

Una sola hoja, `gp2-modulo.css`, para todo el programa. La guía visual viva —cada
componente con su marcado exacto— es **`Diseno/SistemaDiseno_GP2.html`**: antes de
inventar un estilo en una pantalla, buscarlo ahí. Lo vigila `tests/ui/test_diseno.js`.

## Por qué existe

Hasta el 08/10 convivían tres familias que no se parecían: `gp2-modulo.css` (card
blanca de 1180px + header negro, ~40 pantallas), `gp2-claro.css` (barra con logo +
`.top` con gradiente, pisando todo con `!important`, 11 pantallas) y ~15 pantallas
con CSS propio (Arial, "Inter" sin cargar, fondos oscuros). Cada módulo parecía de
otro programa. `gp2-claro.css` se borró.

## Las 8 reglas

1. **Una tipografía: Inter**, auto-hospedada en `fonts/` (no depende de Google ni de
   internet en la tablet). Ninguna pantalla escribe `font-family`.
2. **Tokens, no hex.** Color, tamaño, radio y sombra salen de `:root` (`--ink`,
   `--pri`, `--line`, `--fs-md`, `--r-sm`…). Un `#hex` en una pantalla sólo se
   justifica si es un color de DOMINIO (p.ej. la etiqueta de un sector).
3. **Una barra de app**, igual en todas las pantallas, pegada arriba al scrollear:
   ```html
   <div class="card">
     <div class="header">
       <h1>Título<small>subtítulo opcional</small></h1>
       <div class="hbtns"> …acciones… <a href="../GP2_MODULOS.html">Atrás</a></div>
     </div>
     <div class="steps"> contenido </div>
   </div>
   ```
   La marca GP2 de la izquierda la pone `gp2-nav.js` y abre el **selector de
   módulos** (navegación persistente: se salta de un módulo a otro sin volver al
   menú). Los módulos salen de `gp2-menu.js`, la única copia del menú.
4. **Color con significado.** Azul (`--pri`) = acción. Azul marino (`--sel`) =
   seleccionado (chip, pestaña). Verde / ámbar / rojo = ok / atención / error.
   Nada más lleva color.
5. **Ancho completo.** La página usa toda la pantalla. Un formulario chico pide
   `.card.angosto` (820px) o `.card.medio` (1240px).
6. **Tablas con encabezado a la vista.** `.table-wrap > table.t`: el wrap scrollea
   por dentro (alto de pantalla menos la barra) y el `thead` (todas sus filas) y el
   `tfoot` de totales quedan pegados. `.fix1` en el wrap fija la primera columna al
   scrollear de costado (sólo si es angosta, un código). Muchas tablas chicas una
   abajo de otra (acordeones) → `.table-wrap.libre` (sin scroll interno).
7. **Piso de accesibilidad de la casa**: campos 18px, tocable 44px, teclado
   numérico donde van números (`GP2N`), etiquetas visibles.
8. **Denso pero legible**: 15px en celdas, 16px de texto, sin cajas dentro de cajas,
   sin espacio muerto. Un dato importante se agranda; un adorno se borra.

## Catálogo (clases)

| componente | clase | nota |
|---|---|---|
| botón | `.btn` (+ `.btn-primary` · `.btn-secondary` · `.btn-ghost` · `.btn-ok` · `.btn-danger` · `.btn-lg`) | uno primario por zona |
| elegir uno / filtro | `.chip` (alias de siempre: `.prov-btn` `.seg-btn` `.tab-btn` `.pill-btn` `.filtro-btn` `.tallerista-btn`) + `.active` | contenedor `.chips` / `.provs-grid`; contador `<span class="n">` |
| pestañas | `.tabs > .tab.active` | cambian la vista entera |
| campo con rótulo | `.field > label + input` | grilla de campos: `.grid-auto` |
| barra de filtros | `.toolbar` / `.filters` | |
| buscador | `.search-box > input` | lupa incluida |
| métrica | `.kpis > .kpi(.ok/.warn/.err/.pri) > .k + .v` | |
| panel | `.panel` (+ `.panel-h`) | |
| título de sección | `h2.sec-h` (+ `.sub`) · pegajoso: `.sticky-sec` | |
| aviso | `.aviso` (ámbar) · `.aviso.info` · `.aviso.ok` · `.aviso.err` | |
| etiqueta | `.badge` (`.ok` `.warn` `.err` `.pri` `.dark`) | alias `.tag` `.pill` |
| saldo | `.pos` `.neg` `.cero` · código `.cod` | `GP2UI.cls(n)` |
| vacío / estado | `.empty` · `.status(.err/.ok)` | |
| capas | `.modal-bg > .modal` · `.popup > .pop-card` · `#toast` | sólo aspecto; mostrar/ocultar lo maneja la pantalla |
| acordeón | `details.acc > summary` | |

## Carga (en este orden)

```html
<head> … <link rel="stylesheet" href="../gp2-modulo.css?v=TOKEN"> <style>/* lo propio */</style></head>
<body> … <script src="../gp2-menu.js?v=TOKEN"></script><script src="../gp2-nav.js?v=TOKEN"></script></body>
```

## Fuera del sistema, a propósito

- `Produccion/RegistroApp/Operarios_GP2.html`: es COPIA de `cervantes-gp2/` de
  Registro Producción 3.0 (regla de Elías, 08/10). Se rediseña allá, no acá.
- `Produccion/InformesVirgilio/`, `Preavisos/index.html`, `Ventas Chat/`: pantallas
  muertas que miran `public` (Regla 0); no están en el menú.
