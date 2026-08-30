# CONOCIMIENTO_GP2 — memoria del negocio

> **Qué es esto.** El conocimiento del negocio que hoy vive en la cabeza del usuario,
> escrito para que no haya que volver a explicarlo. Cada vez que el usuario cuenta **cómo
> funciona algo, por qué se hace así, o qué decidió**, entra acá en el mismo commit.
>
> **Para qué.** Para que el agente `gp2-experto` (ver `.claude/agents/gp2-experto.md`)
> pueda hacer de contraparte: cruzar una idea, decir si cierra o no con lo que ya sabemos,
> y proponer alternativas — en vez de que el usuario tenga que re-explicar el contexto
> cada vez.
>
> **Regla de oro (igual que en CLAUDE.md): esto es conocimiento REPORTADO, no inventado.**
> Cada afirmación dice de dónde salió: `[usuario]` lo dijo una persona, `[dato]` sale de
> una consulta a la base (con la consulta o la tabla), `[deducido]` lo infirió el agente y
> **está sin confirmar**. Nunca borrar el origen. Si algo cambia, se corrige la línea y se
> deja la fecha nueva — la historia fina está en git.

---

## 1. Proveedores: quién provee qué

### Inyección plástica — son tres
`[usuario 2026-08-29]` Los inyectores son **Pat Bet Plast**, **Pettofrezza Rafael** y
**Kollplast**. Principalmente dos.

- **Pat Bet Plast** se escribe así, literal. `[dato: public.Partes_Plasticas]`
- **Pettofrezza Rafael** es **la misma persona** que el tallerista que arma 15 terminados
  y que el proveedor de artículo terminado que figura como "Pettofrezza". `[usuario]`
  Un mismo nombre puede tener **varios roles** en GP2 — no asumir que un nombre = un rol.
- **Kollplast** no existía en GP2 ni en la base del vecino: es alta nueva. `[dato]`
- **Becker Sandra Nora NO hace inyección plástica.** Es proveedor de **servicio**
  (pintura / serigrafía de piezas metálicas). `[usuario, corrigiendo un dato previo]`
- PENDIENTE: repartir los 29 plásticos entre los tres. Hoy están todos bajo Pat Bet Plast
  porque esa era la foto del vecino, que es data vieja.

### No todo insumo se compra
`[usuario 2026-08-29]` Una parte sin proveedor no siempre es un dato que falta: puede ser
una **decisión ya tomada**. Por eso `componente.estado_compra`:

- **`fabricacion`** — se hace adentro. Los **resortes C9 (Resorte U Crom), D14, I2 e I3**
  se fabrican (confirmado también por sus rutas: los producen las matrices 47 y 69, FAAT,
  Guazzaroni y Pedernera). Los **GRJ del Garage** también.
- **`discontinuo`** — ya no se usa: **BOM10** (Resorte Bicónico) y **C12** (Paleta Batidor
  Resorte).
- Los que **sí se compran** pero todavía no tienen proveedor: **EP10** y **LLF8**
  (Resorte Batidor Mini y Batidor Pera; LLF8 se compra igual que EP10) y los remaches
  V4, V10, V14, V18D, CV13, CV18D. Los **remaches se compran todos**. `[usuario]`
- **V13 → Electronica Mandelli** y **W8 → Imel**. `[dato: public."Remaches SP/SC"]`

Marcar el estado **saca la parte de la Orden de Compra** y deja de contarla como faltante.
NO se usa el campo `proveedor` para esto: la OC agrupa por proveedor y terminaría
ofreciendo comprarle a un proveedor llamado "Discontinuo". Se marca desde la misma
pantalla de Inyectores, con los botones **Se fabrica** / **Discontinuo**.

### Resto de los rubros
- **Cartones → Talleres Gráficos Pol**, siempre el mismo, los 85. `[usuario]`
- **Cajas → Corrugadora del Sur**, siempre el mismo, las 9. `[usuario]`
- **Flejes →** cada uno tiene el suyo (Basconia, Aperam, Hermac, Brawin, Szapiro,
  JL Metales, EstaMetal, Altrak). `[dato: GP2.fleje_detalle]`
- **Importado** (marcador, no es una empresa): la **Cremallera (E13)** y los insumos del
  **corta queso** (Z19A alambre, PB1 cilindro, V20 tornillo) **ya no se fabrican, se
  importan**. `[usuario 2026-08-29]`
  El tornillo se importa **ya niquelado**: el código **CV20** ("p/Niquelar") **no se compra
  más** y el paso de niquelado en Guazzaroni se sacó de las rutas 382/577/589, que ahora
  entran el V20 comprado y van derecho al tallerista. `[usuario 2026-08-29]`
- **Garage (GRJ*)**: no llevan proveedor, los arman los talleristas. Además el sector se
  está vaciando: hoy quedan 4 códigos y sólo GRJ10 tiene stock. `[usuario + dato]`

### Cómo se administra (no se toca la base a mano)
`[usuario 2026-08-29]` Quién hace cada parte se cambia desde la pantalla
**`Compras/Inyectores_GP2.html`** y eso **escribe en Supabase** (`componente.proveedor`,
vía RPC `asignar_proveedor_parte`). Los inyectores cambian seguido, así que el dato tiene
que ser editable desde el programa, no por migración. Esa asignación es **lo que separa la
OC**: cada proveedor recibe una orden sólo con sus partes.

---

## 2. Materiales y procesos: la lógica del inoxidable

`[usuario 2026-08-29]` **Regla estratégica: conviene pasar partes de fleje laminado a
inoxidable.** El ahorro no es sólo el material, es todo lo que se evita:

1. El **tratamiento de cromado** en sí.
2. El **transporte de ida** al cromador (Pedernera, en la isla).
3. El **transporte de vuelta** a buscarlo.
4. El tiempo que la pieza está fuera de la fábrica.

Además, en Argentina **el fleje normal puede costar más caro que el inoxidable**, así que
el cambio puede convenir incluso mirando sólo el material. `[usuario]`

**La excepción — lo que se pinta va en fleje normal.** La pintura necesita el material
común como base, así que una pieza destinada a pintura no se pasa a inoxidable.
`[usuario]`

**Pero la excepción NO es por pieza, es por destino** `[usuario 2026-08-29]`: una misma
pieza puede comprarse en **los dos materiales a la vez** — inoxidable para las unidades
que iban a cromado, y fleje laminado para las que se pintan. Lo que decide si se puede es
el **mínimo de compra del proveedor**: si el mínimo da, conviene partir la compra en dos
materiales; si no da, hay que elegir uno. Ejemplo dado: el **destapador** podría llevar
inox para la versión cromada y laminado para la pintada.

Por eso las 4 piezas que hoy van a cromado **y** a pintura (G7, H11, I1, I6) no quedan
descartadas: son candidatas a compra partida, sujeto al mínimo del proveedor.

Ejemplo dado: **el cuerpo del 510** antes se hacía en fleje laminado y hoy se hace en
inoxidable. `[usuario]`

### Qué dice la base hoy
`[dato 2026-08-29, GP2.ruta_paso + public."Partes x PS"]`
- **Cromado → Pedernera Ilario: 38 partes.** Éstas son **las candidatas** a inoxidable.
- **Pintado → Jade (15), Daniel (14), Rec Color (4) = 33 partes.** Las unidades que se
  pintan van en fleje normal — pero la pieza puede igual tener una parte de su compra en
  inox si además va a cromado y el mínimo del proveedor lo permite (ver regla de arriba).
  `[corregido 2026-08-29: antes decía que quedaban descartadas]`
- Otros procesos: Niquelado → Guazzaroni (24), Zincado → Guazzaroni (6), Cementado y
  Templado → FAAT, Serigrafiado → Ximpa, Adhesivado → AJ Adhesivos.
- Ya hay **13 componentes con "inox" en la descripción**: la migración empezó de hecho.

### Las 34 candidatas concretas (las que hoy van a Pedernera a cromar)
`[dato 2026-08-29: GP2.ruta_paso, pasos con proveedor_servicio = Pedernera Ilario]`
La mayoría son **Sector Crudo** y el código lo dice solo ("p/Cromar"):

G4 Cpo Sacacorcho 521 · G7 Pieza Abierta Rompenuez · G15 Mariposita Abrelata ·
H1 Manija Redonda · H11 Varilla c/Cuchilla · H16 Super Mariposita · I1 Destapador Pie ·
I6 Mango Plano 502 · I11 Mgo Plano 701 · J7 Destapa C. LK · J10 y J12 3 en 1 ·
J15 Cabezal doblado · K8 Sacatapita · K14 Vástago Corta Pizza Gastr ·
L8 Vástagos Cortos · L15 Vástago Corta Pizza Chico · LL7A Vástago Pelapapa ·
M6 y M8 Mango Pelapapa (LK / CH) · N1 Ahuecafruta · N2 Ahuecapapa · N7 Pinza Corta ·
W2 y W7 Engranaje (grande / chico) · Z2B y Z3B Pza Grande Sacaf Art · Z4 Pza Chica ·
Z36 Sacafuente Pizzero · C12 Paleta Batidor · I2 Resorte U · E3-M234 Fleje N°80 ·
GRJ10 y GRJ10A Batidor Pera.

**Las más pesadas primero** (más kg = más ahorro de material por pieza): Z36 Sacafuente
Pizzero (0,119 kg), GRJ10/GRJ10A (0,098), N7 Pinza Corta (0,068), H1 Manija Redonda
(0,049), G7 Rompenuez (0,046), G4 Sacacorcho (0,045).

**Cuatro tienen ADEMÁS un paso de pintura** (G7 Rompenuez, H11 Varilla c/Cuchilla,
I1 Destapador Pie, I6 Mango Plano 502): son las candidatas a **compra partida** — inox
para lo que va a cromar, laminado para lo que va a pintar, si el mínimo del proveedor da.
`[usuario 2026-08-29, confirmado; corrige el "no se pasan" que estaba deducido]`

### Lo que falta para poder decidirlo con números
`[deducido — hueco real, hay que cargarlo]` Para calcular el ahorro pieza por pieza faltan
tres datos que **hoy no están en GP2**:
1. **Precio por kg del fleje laminado vs. el inoxidable** (por proveedor y medida).
   `GP2.precio_proveedor` sólo tiene **11 precios de cartón**, y ninguno atado a un
   componente.
2. **Cuánto cobra el cromado** (Pedernera) por pieza o por kg.
3. **Costo del flete** ida y vuelta a la isla.

Con esos tres, el cálculo por pieza es directo:
`ahorro = (costo_cromado + flete_prorrateado) - (precio_inox - precio_laminado) x kg_pieza`
y sale el ranking de las 34 candidatas por ahorro anual usando el consumo de la Est Madre.

---

## 3. Reglas del negocio ya incorporadas

- **La Est Madre manda hacia atrás.** El máximo de flejes e insumos NO sale de
  relevamiento físico: sale de la Est Madre explotada por receta y rutas × los meses de
  stock del rubro. Se recalcula sola. `[usuario, regla 2026-08-29]`
- **Virgilio no se analiza.** Existe sólo para medir a los talleristas; no se construye
  módulo de despacho ni de venta, y las 1.292 entregas históricas **no se cargan**.
  `[usuario]`
- **Producción arranca de cero.** No se cuelga el espejo de la producción vieja: las
  tablets pasan a la app GP2 y la historia queda en la casa del vecino. `[usuario]`
- **El motor de inventario vive en la base**, no en el JS: la app inserta filas crudas en
  `GP2.movimiento` y los triggers calculan y aplican el delta. `[arquitectura]`
- **Un cambio de proceso toca TODAS las tablas normalizadas**, en orden: componente →
  inventario → recetas → rutas → alias. Parchar una sola rompe el trazado. `[CLAUDE.md]`

---

## 3b. Acceso a la app (login)

`[usuario 2026-08-29]` **El login de Google está APAGADO, momentáneamente.** Razón: la
página ya es privada y es difícil que alguien la encuentre, así que por ahora se prefiere
entrar suelto, sin la validación de Gmail.

Se maneja con un interruptor de una línea: `GP2_AUTH_ON` en `auth-guard.js`
(`false` = suelto, `true` = con login + whitelist). Para volver a prenderlo hay que poner
`true` **y bumpear el `?v=` de auth-guard.js en los HTML**, si no las tablets siguen con el
archivo cacheado.

`[importante, no confundir]` El login siempre fue una tranquera de **pantalla**, no una
barrera de datos: la clave anon viaja en el HTML de cada página, así que quien tuviera la
URL siempre pudo llamar a las RPCs. Lo que realmente protege la base es la **RLS** (anon
sólo lee) + que **toda escritura pase por RPCs SECURITY DEFINER** que validan. Eso no se
tocó y sigue igual con el login prendido o apagado.

## 3c. Cómo se abre la app (ventana propia, no pestaña)

`[usuario 2026-08-29]` **GP2 tiene que verse como una aplicación, igual que Producción
Virgilio** — sin la barra de direcciones ni el botón de actualizar arriba. El usuario notó
la diferencia entre las dos apps y pidió emparejarlas.

`[dato]` La causa era simple: Virgilio siempre fue una **PWA** (tiene `manifest.json` con
`display: standalone` + service worker), y GP2 no tenía ninguno de los dos en la raíz. El
único `manifest.json` del repo estaba en `Produccion/RegistroApp/` y sólo aplica a ese
submódulo, así que Chrome trataba a GP2 como una página web común.

Arreglado en v1.30.0 con dos mecanismos que se complementan:

1. **`--app=` en `gp-launcher.ps1`**: Chrome abre en ventana propia apenas se hace doble
   clic en el `.bat`. No hace falta instalar nada, funciona para todos de una.
2. **PWA de verdad** (`manifest.json` + `sw.js` + `pwa.js` + `icons/` en la raíz): Chrome
   ofrece "Instalar", y GP2 queda con ícono propio en el escritorio y en el menú Inicio.

`[importante]` El `sw.js` **no cachea nada** y está así a propósito. Cachear el HTML dejaría
tablets pegadas a una versión vieja, que es justo lo que el sistema de tokens `?v=...` viene
evitando. El service worker existe sólo porque Chrome lo exige para poder instalar.

`[trampa]` El launcher elige el primer puerto libre entre 5501 y 5507. Para Chrome **cada
puerto es un origen distinto**, así que una app instalada desde 5501 no es la misma que una
instalada desde 5503. Con `--app=` da igual, pero si se instala a mano conviene hacerlo
siempre con el mismo puerto.

## 4. Trampas conocidas (cosas que ya nos mordieron)

- **Los nombres colisionan entre las dos casas.** El fleje "A1" del vecino no es la pieza
  "A1" de GP2. Nunca matchear por código sin mirar el sector. `[2026-08-29]`
- **El código de componente NO identifica una pieza; el `id` sí.** En GP2 hay **33 códigos
  repetidos** (A1, A10, A11, C9, D1, F2…): el "A1" del Sector Fleje y el "A1" del Sector
  Caja son piezas distintas. Lo único es el par **(código, sector)** — verificado: 0
  repetidos dentro de un mismo sector, y desde 2026-08-30 hay un índice único
  `uq_componente_codigo_sector` que lo garantiza.
  Consecuencia práctica: **el programa trabaja por `id` y está bien**; el riesgo aparece
  sólo cuando se hace un `update ... where codigo = 'X'` o se copian datos del vecino
  matcheando por código. En esos casos **siempre filtrar también por sector**.
  `[dato 2026-08-30; surgió al marcar los resortes que se fabrican, donde C9 es a la vez
  un Fleje N° 4 y el Resorte U Crom]`
- **Una persona = varios roles.** Pettofrezza es tallerista, proveedor AT y ahora
  proveedor de insumo. Maspoli es tallerista y proveedor AT. Buscar en las cuatro tablas
  antes de dar de alta a alguien "nuevo".
- **El mismo nombre escrito distinto.** "Pettofrezza Rafael" (tallerista) vs "Pettofrezza"
  (prov AT); el alias "RAFAEL" ya apunta al tallerista. Ver `GP2.contraparte_alias`.
- **La data del vecino es vieja.** Sirve para llenar huecos, pero no conoce los cambios
  recientes (no tiene a Kollplast ni a Pettofrezza como inyectores). Usarla como punto de
  partida, nunca como verdad final.
- **El ledger arrancó de cero hoy**, así que los bugs de saldo no se notan mirando la
  pantalla: hay que probarlos con movimientos de prueba y rollback.

---

## 5. Cómo se alimenta esto

Cada mensaje del usuario que traiga conocimiento del negocio —cómo funciona algo, por qué
se decidió así, quién hace qué, qué conviene y qué no— se agrega acá **en el mismo commit
del trabajo**, con su origen `[usuario]` y la fecha. No se espera a que "cierre un tema".

Si un dato nuevo **contradice** uno viejo: se corrige la línea y se anota que se corrigió
(como pasó con Becker). La contradicción es información: casi siempre significa que algo
cambió en la realidad, y el módulo que dependa de ese dato hay que revisarlo.
