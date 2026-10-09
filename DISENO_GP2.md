# GP2 · Sistema de diseño (v2.0 · 2026-10-09)

[Thomas, 09/10: *"quiero un sistema de diseño unificado para todo GP2 … que deje de sentirse como un
conjunto de módulos diseñados por separado … interfaz grande, densa y optimizada … títulos y encabezados
visibles mientras hago scroll"*]

- **Archivo único**: `gp2-modulo.css` (tokens + componentes + barra). `gp2-claro.css` se **borró**: era
  una capa de `!important` que pisaba colores pantalla por pantalla.
- **Guía viva**: `GP2_DS.html` (todos los componentes dibujados con el CSS real).
- **Fuente**: Inter variable, servida desde `fonts/` (sin Google Fonts: la tablet a veces no tiene red).

## Reglas que no se negocian (vienen de antes)
1. Campos de carga ≥ 18px; todo lo tocable ≥ 44px; la página nunca scrollea horizontal (lo ancho va en `.table-wrap`).
2. La regla de número vive en `gp2-numero.js`; los helpers en `gp2-ui.js`; el cliente en `GP2_SB()`.

## Decisiones de diseño
| tema | decisión |
|---|---|
| tipografía | Inter, 7 tamaños fijos (tokens `--fs-*`): barra 20/700 · sección 18/700 · bloque 16/650 · texto 16 · celda 15 · ayuda 13,5 · rótulo 12/700 mayúsculas |
| color | tinta (slate) para estructura; **azul GP2** (`--brand-600`, el del logo) = acción que avanza; **tinta 900 rellena** = elegido; verde/ámbar/rojo = bien/alerta/error |
| barra | UNA barra fija oscura en todas las pantallas: `‹ Atrás · [GP2] · Título ······ acciones` |
| ancho | el contenido usa todo el ancho (tope 1.760px). Formularios cortos: `.page-narrow` (760) o `.page-mid` (1.180) |
| tablas | celda 15px, encabezado 12px mayúsculas, números a la derecha y tabulares. Dentro de `.table-wrap`: **encabezado y primera columna fijos**, alto máx. = pantalla |
| secciones | `h2.sec-title` se pega bajo la barra mientras se scrollea su bloque; `.grp > .gh` (acordeones) también |
| radios | 6 / 8 / 12 · sombras: 2 niveles (`--sh-1` panel, `--sh-2` flotante) |

## Markup canónico de una pantalla
```html
<link rel="stylesheet" href="../gp2-modulo.css?v=TOKEN">   <!-- el ÚNICO css compartido -->
<div class="card">
  <div class="header">
    <h1>Título <small>subtítulo opcional</small></h1>
    <div class="hbtns">
      <a href="…" class="primary">+ Nuevo</a>      <!-- acción principal: azul -->
      <a href="…">Exportar CSV</a>
      <a class="back" href="../GP2_MODULOS.html">Atrás</a>   <!-- se dibuja a la IZQUIERDA -->
    </div>
  </div>
  <div class="steps">                           <!-- contenido (padding y ancho del sistema) -->
    <div class="toolbar"> <div class="field"><label>Desde</label><input type="date"></div> … <button class="btn btn-primary push">Cargar</button></div>
    <div class="kpis"><div class="kpi"><div class="k">Rótulo</div><div class="v">123</div></div> …</div>
    <h2 class="sec-title">Sección <span class="meta">detalle</span></h2>
    <div class="table-wrap"><table class="t"><thead>…</thead><tbody>…</tbody></table></div>
  </div>
</div>
```

## Componentes (clases)
- **Botones**: `.btn` + `.btn-primary` | `.btn-secondary` | `.btn-ghost` | `.btn-success` | `.btn-danger`; `.btn-lg`, `.btn-block`, `.btn-icon`.
- **Elegir**: `.prov-btn` (con `.meta`), `.chip` (con `.n`), `.seg` > `.seg-btn`, `.tabs` > botones; estado `.active`.
- **Campos**: `.field` > `label` + input; `.toolbar` (fila densa); `input.search`; `.err` / `.ok`.
- **Paneles**: `.panel` > `.panel-head` + `.panel-body`; rejillas `.grid-auto`, `.grid-2`, `.grid-3`.
- **Datos**: `.kpis` > `.kpi` (+ `.ok/.warn/.err/.info`, `.k`, `.v`, `.d`); `.badge` (+ `.ok/.warn/.err/.info/.dark`); `.cod`, `.proc`, `.sub`, `.pos/.neg/.cero`.
- **Modal**: `.dlg-bg` > `.dlg` > `.dlg-head` + `.dlg-body` + `.dlg-foot` (en el celular sale como hoja desde abajo).
- **Avisos**: `.aviso` (ámbar) / `.aviso.info` / `.aviso.ok` / `.aviso.err`; `.status`; `.empty`.
- **Tablas**: `table.t`, `th.num/td.num`, `.ctr`, `.sep`, `tr.falt`, `tr.sel`, `tfoot`; `table.sticky-head` para una tabla suelta (sin wrap) con encabezado fijo bajo la barra.

## Qué NO hacer en el `<style>` de una pantalla
- Otra `font-family`, otro color de botón, otro tamaño de `th`, otro encabezado/barra, otro gris de fondo.
- Hex sueltos: usar `var(--ink-*)`, `var(--brand-*)`, `var(--ok-*)`…
- `overflow:hidden` en un ancestro de la barra o de una tabla con encabezado fijo (rompe el sticky; usar `overflow:clip`).

Lo propio de una pantalla es **layout** (columnas, anchos de celda, grillas específicas).
