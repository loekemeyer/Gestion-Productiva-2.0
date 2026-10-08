# Encargo: migrar pantallas de GP2 al Sistema de Diseño v2

Repo: /home/user/Gestion-Productiva-2.0 (HTML/CSS/JS vanilla + Supabase). Estás en un equipo de
agentes que trabajan EN PARALELO sobre el MISMO árbol de trabajo, cada uno con su lista de archivos.

## Contexto (leé esto primero)
1. `DISENO_GP2.md` (raíz) — las 8 reglas y el catálogo de clases.
2. `gp2-modulo.css` (raíz) — EL sistema de diseño (tokens en :root + componentes). Leelo entero.
3. `Diseno/SistemaDiseno_GP2.html` — guía viva: el marcado exacto de cada componente.
4. Ya está hecho en TODAS las pantallas (no lo repitas): el `<link>` a `gp2-modulo.css?v=20261008ds`
   va antes del `<style>` propio, y `gp2-menu.js` + `gp2-nav.js` al final del body. `gp2-claro.css`
   se BORRÓ: las pantallas que dependían de él (sus `.top`, `#gp2-logobar`, colores pastel) hoy se ven
   rotas hasta que las migres.

Objetivo del dueño: que GP2 deje de parecer muchos módulos sueltos y sea UN producto: misma tipografía
(Inter), misma barra de app pegada arriba, mismos botones/chips/tablas/campos, jerarquía clara, DENSO
(más información a la vista, menos scroll, ancho completo) pero legible y grande. "¿Este componente
parece pertenecer al mismo producto que los demás módulos de GP2?" Si no, ajustalo.

## Qué hacer en CADA archivo de tu lista
1. **Esqueleto**: la página queda `<div class="card"> <div class="header"><h1>Título<small>subtítulo
   opcional</small></h1><div class="hbtns">…acciones… <a href="…/GP2_MODULOS.html">Atrás</a></div></div>
   <div class="steps">…</div></div>`. Convertí `#gp2-logobar` (barra con logo + "← Atrás"), `.top`,
   `.topbar`, `<header>` propios, títulos sueltos con botón "Volver", etc. a ESA barra. El link al menú
   va último en `.hbtns` con href a GP2_MODULOS.html (respetá la ruta relativa). Botones de acción de
   la barra: `<button class="hlink">` o `<a>` (aspecto lo da el sistema). Si la pantalla tenía filtros
   dentro de la barra, pasalos a una `.toolbar`/`.filters` al principio de `.steps` (salvo 1-2 controles
   chicos que tengan sentido arriba). Si el layout no es de formulario/tabla (p.ej. una pantalla de
   TV/monitor o una calculadora), igual va la barra; el contenido puede tener su propio layout.
2. **CSS propio (`<style>`)**: BORRÁ todo lo que el sistema ya resuelve (reset, body font/fondo/color,
   barra, botones, chips, tabs, inputs/selects, tablas genéricas, kpis, avisos, badges, empty, modales
   genéricos). Lo que queda (layout propio de la pantalla) se reescribe con TOKENS: `var(--ink)`,
   `var(--ink-3)`, `var(--line)`, `var(--surface)`, `var(--pri)`, `var(--sel)`, `var(--ok)`, `var(--warn)`,
   `var(--err)`, `var(--r-sm)`, `var(--fs-md)`… **Cero `font-family`**. `#hex` sólo para colores de
   DOMINIO (p.ej. etiquetas por tipo de sector) y armonizados (fondo suave + texto oscuro).
   Nada de `!important` salvo que sea imprescindible.
3. **Clases del sistema**: preferí AGREGAR la clase del sistema al marcado (y en el JS que genera
   marcado) junto a la clase vieja (`class="rubro-btn chip"`), y borrar el CSS de la vieja. NO renombres
   ni borres clases/IDs que use el JS o los tests (grep en el JS de la página y en tests/ui antes de
   tocar). Mapeos típicos: botón → `.btn` + variante; elegir/filtrar → `.chip`(+`.active`); vista →
   `.tabs > .tab`; métricas → `.kpis > .kpi > .k + .v`; aviso → `.aviso`; tabla → `.table-wrap > table.t`
   (`.fix1` si la 1ª columna es un código angosto y la tabla es ancha; `.libre` si hay muchas tablas
   chicas una abajo de otra, para no tener scroll dentro de scroll); campo → `.field > label + input`;
   grupo de campos → `.grid-auto` o `.toolbar`; panel → `.panel`; título de sección → `h2.sec-h`.
4. **Inline `style="…"`** en el marcado y en el JS: sacá los que fijan colores/fuentes/tamaños y pasalos
   a clases. Los que son lógica (display:none dinámico, anchos calculados) quedan.
5. **Densidad y ancho**: la página usa todo el ancho; un formulario chico pide `<div class="card angosto">`.
   Agrupá info en grillas (`.grid-auto`, `.kpis`), sacá cajas dentro de cajas y márgenes muertos. Listas
   largas con grupos que NO son tabla: encabezado de grupo con `.sticky-sec` (queda pegado bajo la barra).
6. **Reglas de la casa que NO se negocian** (hay tests): campos ≥18px (ninguna regla CSS con
   input/select/textarea puede bajar de 18px), tocable ≥44px, `inputmode` en todo `type="number"`, nada
   de scroll horizontal de la PÁGINA a 390px (las tablas scrollean dentro de `.table-wrap`), letra
   legible. No toques la lógica: ni RPCs, ni cálculos, ni textos de negocio, ni IDs.
7. **Versionado**: si modificás un .js/.css EXTERNO propio de la pantalla, subí su `?v=` (token nuevo
   `20261008dsA`, `…dsB`…) en TODOS los HTML que lo cargan (un asset = un token). El HTML en sí no
   lleva token. NO toques `version.js`, `gp2-modulo.css`, `gp2-nav.js`, `gp2-menu.js`, `CLAUDE.md`,
   `LOCKS.txt`, ni archivos fuera de tu lista. Si creés que el sistema (gp2-modulo.css) necesita algo
   nuevo, NO lo edites: resolvelo con tokens en la pantalla y anotalo en tu reporte como propuesta.
8. **Tests**: si un test de tu pantalla falla SOLO porque fijaba un estilo viejo (un color #111, una
   clase .top que borraste, etc.), podés ajustar ESA aserción al sistema nuevo — mínimo y explicándolo
   en el reporte. Si falla por otra cosa, arreglá tu cambio, no el test.

## Cómo verificar (obligatorio, por archivo)
- Tests de la pantalla: `cd /home/user/Gestion-Productiva-2.0/tests/ui && NODE_PATH=$(npm root -g) node test_X.js`
  (buscá cuáles la cubren: `grep -l "<NombreArchivo>" tests/ui/test_*.js`). Al final de tu lote corré
  también `test_teclado_numerico.js`, `test_tokens_cache.js`, `test_helpers_ui.js` y `test_smoke_gp2.js`.
  NO corras la suite entera (`run.sh`): la corre el director al final. `test_login_flow.js` ya fallaba antes.
- Capturas: hay un arnés con Supabase stubeado (las RPC devuelven error → la pantalla queda vacía; sirve
  para ver estructura). Uso:
  `cd /tmp/claude-0/-home-user-Gestion-Productiva-2-0/a66c317c-6a84-57b8-b16e-a61d4e033a85/scratchpad && NODE_PATH=$(npm root -g) node one.js "<ruta relativa al repo>" <TU_DIR>/x.png 1366 900 1`
  (args: ruta, salida, ancho, alto, fullPage 1/0, scrollY opcional, selector a clickear opcional).
  Usá un directorio de salida PROPIO (`shots_<tu lote>/`). Mirá las capturas (Read) a 1366 y a 390 de
  ancho. Para ver la pantalla CON datos, conviene armar un script temporal en ese mismo directorio que
  reuse el stub/fixture del test de la pantalla (los tests de tests/ui tienen bundles de ejemplo) y saque
  la captura — hacelo en las pantallas principales de tu lote. Compará con `Diseno/SistemaDiseno_GP2.html`.
- Antes de cada captura: Chromium está en /opt/pw-browsers/chromium (no instales nada).

## Prohibido
- `git commit`, `git push`, `git checkout`, `git stash`, `git reset`, `git restore`: hay otros agentes
  trabajando en el mismo árbol, cualquiera de esos les pisa el trabajo. Sólo editá archivos.
- Tocar Supabase / la base de datos.
- Tocar `Tablet/Tablet_GP2.html` (otra persona la está editando ahora) y
  `Produccion/RegistroApp/Operarios_GP2.html` (es copia de otro repo).

## Reporte final (breve, en español)
Por archivo: qué cambió de estructura (1 línea), tests corridos y resultado, y si quedó algo
pendiente o raro. Al final: propuestas para el sistema (si las hay) y las rutas de 2-3 capturas
representativas (1366 y 390).
