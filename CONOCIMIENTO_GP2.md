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
- **Becker Sandra Nora ES "Jade".** `[usuario 2026-08-30]` El mismo pintor con dos nombres:
  GP2 lo tiene como *Becker Sandra Nora* (el nombre formal) y en la casa del vecino figura
  como *Jade* (como se lo nombra todos los días). No son dos proveedores. Otra vuelta de la
  trampa de siempre: **el mismo nombre escrito distinto en las dos casas**.
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

### El proveedor vive en UN solo lugar
`[dato 2026-08-30]` `componente.proveedor` es la **única fuente**. Antes el proveedor del
fleje estaba **duplicado** en `fleje_detalle.proveedor` y las lecturas hacían
`coalesce(fd, c)` — o sea que ganaba `fleje_detalle`. Como la pantalla escribe en
`componente.proveedor`, **cambiar el proveedor de un fleje no tenía efecto en la OC**: la
pantalla mostraba el nuevo y la orden seguía saliendo al viejo, en silencio, en los 50
flejes. Reproducido y arreglado.

Además `componente.proveedor` ahora tiene **FK a `proveedor_insumo`** (`ON UPDATE
CASCADE`): antes era texto libre, así que un tipeo creaba un proveedor fantasma sin que
nada avisara. Renombrar un proveedor ahora propaga solo.

`fleje_detalle.proveedor` **se borró** (2026-08-30, autorizado): guardaba el mismo dato.
Antes se migraron sus tres puntas: `flejes_bundle` lee el del componente,
`fleje_detalle_upsert` (la pantalla de Flejes) escribe en `componente.proveedor` y avisa
con un mensaje claro si el proveedor no existe, y la huérfana `recepcion_insumos_bundle`
se eliminó. Un proveedor nuevo se da de alta desde Inyectores → "+ Proveedor".

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


## 2b. Quién pinta: no hay un pintor por parte

`[usuario 2026-08-30]` **A una misma parte la pueden pintar varios.** Es la diferencia de
fondo con los inyectores, donde cada parte tiene **un** proveedor. Por eso pintura necesita
una relación de muchos a muchos, no un campo.

`[dato 2026-08-30, public."Partes x PS" donde Proceso = pintado]` Y no es un caso raro, es
**la regla**: de las 11 partes pintadas del vecino, **ninguna la pinta uno solo**. Cuatro
las hacen los tres (G13, G2, I6, J2) y siete las hacen Daniel + Jade.

**Renombrado 2026-08-30**: `proveedor_servicio.nombre` id 5 pasó de "Becker Sandra
Nora" a **"Jade"** (elección del usuario: "lo que sea mejor para la normalización"). El
nombre legal quedó como alias en `contraparte_alias` (tipo proveedor_servicio, ref 5)
así el espejo Virgilio sigue matcheando por cualquiera de los dos. La ubicación 17
también: "Prov. Serv. Jade".

**Quiénes pintan** `[usuario 2026-08-30]`:
- **Jade** (= Becker Sandra Nora, ver arriba) y **Daniel**, que son los dos que trabajan.
- **Rec Color** existe y hay que tenerlo contemplado, pero *"creo que no le mandamos nada"*.
  Está dado de alta como proveedor y **sin partes asignadas**: aparece en la botonera para
  poder sumarlo con un toque el día que haga falta.

**El reparto NO es partir cada parte: es repartir el TRABAJO.**
`[usuario 2026-08-30, corrigiendo lo que había dicho antes]` Primero se anotó "partes
iguales" y se implementó mal: se dividía el consumo de **cada** parte entre sus pintores
(media Uña a uno, media Uña al otro). El usuario lo corrigió con un ejemplo que lo deja
claro:

> *"Si a uno le mando quince cajones a pintar de uña, entonces al otro le mando diez
> cajones a pintar de sacacorcho. Pero darle las dos cosas a los dos no tendría sentido."*

O sea: **la parte va entera a un pintor**. Lo que se empareja es el **total de cajones del
mes** de cada uno. Por eso la tabla guarda dos cosas distintas: las filas dicen quién
*puede* pintar cada parte, y la marcada con `asignado` dice quién la *tiene* este mes.

**Se mide en CAJONES, no en unidades** `[deducido del ejemplo del usuario]`: así se manda a
pintar y así lo piensa él. Sale de `consumo ÷ componente.uni_x_cajon`.

**Lo propone el programa** `[usuario 2026-08-30]`: reparte solo, dando la parte más pesada
al pintor menos cargado, y la persona corrige lo que no le cierre. Con los números reales
propone Uña (7,5 cajones) a Jade y Sacacorcho + Mango (8,3) a Daniel — que es exactamente
el ejemplo que dio el usuario, sin habérselo dicho.

### El consumo de una parte que se pinta no está donde uno lo busca
`[dato 2026-08-30]` `v_consumo_parte` **no sirve** para las partes pintadas: esa vista sólo
cubre componentes que están **directo en la receta** del artículo, y lo que se pinta es
intermedio (entra a un paso de ruta y sale como otra pieza). Medido: de las 12 partes
pintadas, **cero** aparecen ahí.

**CORREGIDO el mismo día**: el primer parche ("sumar el consumo de las salidas") estaba
MAL — sobrecontaba cuando dos ramas convergen en la misma salida. El caso que lo destapó
lo vio EL USUARIO: K2 y K5 mostraban el mismo consumo (2.784). K2 (Chef) rinde 46/mes y
heredaba entero el número de B4, que era casi todo de K5 (LK). Hoy el consumo de
cualquier parte, pintada o no, se lee de `v_consumo_componente` (ver sección 3b), que
atribuye por artículo. `pintores_bundle()` ya la usa. Las 12 partes tienen número.

### B4 eran dos piezas distintas metidas en una fila (partido 2026-08-30)
`[usuario 2026-08-30]` "No llegan al mismo lugar, porque uno tiene marca y el otro no."
B4 "Cpo Sacacorcho Pint Azul LK/CH" mezclaba: (a) el cuerpo pintado **LK** que Martin
arma directo en 530/531, y (b) el cuerpo pintado **sin marca** que sigue a serigrafía de
Hernandez Julio y recién ahí es Chef (B7 → 730/731). Se partió: **B4 = LK** (rutas
69/70), **B4B = "Cpo Sacacorcho Pint Azul S/marca CH"** (rutas 72/73, con la fila de
inventario en lo de Hernandez que antes tenía B4). Código B4B elegido por el usuario.
La pista para detectar otros casos así: descripción con "LK/CH" + inventario en una
ubicación que sólo toca una de las ramas. Se barrió toda la tabla: el único otro "LK/CH"
es Z1A (Pza Chica Sacaf Art), y ése SÍ es compartido de verdad (la marca la lleva la
pieza grande Z2A/Z3A) — no se toca.

---

## 3b. Consumo de TODA la cadena: v_consumo_demanda / v_consumo_componente (2026-08-30)

`[dato 2026-08-30]` Vistas nuevas en GP2. **`v_consumo_parte` NO se tocó** (es el corte
del walk de `v_consumo_fleje_kg` de producción; cambiarla cascadea a OC y a
`inventario.maximo` vía triggers). Lo nuevo convive:

- **`v_consumo_demanda`** (articulo, componente, uni_mes): la demanda de la Est Madre
  explotada por receta (`articulo_componente` + `componente_bom`) y caminada HACIA ATRÁS
  por las rutas **del mismo artículo**. Reglas que costaron sangre:
  - **Atribuir por artículo, no "parar en el primer nodo con consumo"**: eso sobrecontaba
    60x (K2 = 46, no 2.784).
  - **El walk se corta al llegar a otro componente de receta del mismo artículo**: la
    receta de 508 lista D13 (virola) Y PC12 (mango que la contiene); sin el corte, la
    virola se contaba doble.
  - `UNION` sin ALL en el walk: dedupe de rutas duplicadas por tallerista y corte de ciclos.
  - Joins por `id`, nunca por `codigo` (B4 y B7 existen como parte Y como fleje).
- **`v_consumo_componente`**: la plana por componente (suma sobre artículos). Cobertura
  vs la vieja: crudo 4→76, fleje 3→51, tránsito 0→38, procesado 75→81. De los 230 que ya
  tenían número, 229 idénticos; el único que cambia es D13 822→1.264 y está BIEN (la
  vieja no veía las virolas que viajan adentro de los mangos de 564/708).
- **`v_consumo_fleje_kg_v2`**: kg de fleje con la demanda atribuida. vs la vieja: 43/45
  iguales; A11 32,8→22,7 (la vieja le colgaba demanda del cuerpo C15 que no sale de ese
  fleje) y D8 4,3→6,6 (le faltaban las virolas de 564/708). Las dos diferencias son
  errores de la vieja.

**Repuntado 2026-08-30 (mismo día)**: `v_punto_stock`, `oc_bundle` y
`recalcular_maximos_insumos` ya usan las vistas nuevas. El recálculo corrió: 19 máximos
derivados cambiaron (2 flejes corregidos + 13 remaches y 4 bombillas que estaban en 0).
Las vistas viejas quedan sin consumidores, solo como referencia.

**El consumo es TOCABLE** `[usuario 2026-08-30]`: "quiero poder tocar donde figura lo
que hay que enviar y su sustento contra el consumo de los artículos que lo utilizan".
RPC `consumo_detalle(p_comp_id)` + `consumo-detalle.js` (helper compartido en la raíz):
tocar el número abre el desglose por artículo (proyección del artículo y cuánto le pide
a la parte, en kg si es fleje). Cableado en Pintores, OC, Punto de Stock y Orden de
Producción. Si una pantalla nueva muestra consumo, se le cablea el mismo helper.

**Las pantallas de Envíos/Entregas comparten UN helper (2026-08-30, v1.50.0)** `[dato]`:
`gp2-envios-common.js` en la raíz (namespace `GP2EE`) junta lo que estaba copy-pasteado
en Envíos/Recepción Tallerista, Envíos/Entrega PS, Entregas Prov AT y los Controles:
cliente Supabase GP2, esc/num/fmt es-AR, buffer de carga en localStorage por contraparte
(sobrevive F5; lo registrado sale del buffer ítem por ítem, así un reintento no duplica),
fases fase0/fase1/fase3 con `#btnVolver`, grilla de contrapartes, popup de tandas y
celdas de carga. Una pantalla nueva de envío/entrega se cablea a `GP2EE`, no se copia.
OJO: conviven DOS parsers de número a propósito — `GP2EE.num(v)` (PS, entiende
"1.234,5") y `GP2EE.num(v,"simple")` (talleristas, con "." y "," juntos pisa las comas y
lee "1.234,5" como 1,2345). Es un bug histórico de las pantallas de talleristas que el
refactor NO corrigió para no cambiar comportamiento; si un día se unifica, va con aviso.

**Orden de Producción repuntada a DEMANDA (2026-08-30, v1.49.0)** `[dato]`: el módulo
`OrdenProduccion/` calculaba `faltante = máximo físico − stock` (llenar la estantería):
proponía ~2,8 millones de unidades en pantalla (~3,7M sumando todos los destinos crudo +
procesado) cuando la Est Madre proyecta ~196.000 uni/mes. Ahora usa la RPC
`orden_produccion_bundle()` (SECURITY DEFINER, un solo viaje: pasos de matriz
deduplicados, matrices, componentes y destinos) y el faltante es
`greatest(0, round(consumo_uni_mes × ubicacion.meses_stock − stock))` — mismo patrón que
`oc_bundle()` para insumos, con `v_consumo_componente`. El total en pantalla baja a
~420.000 uni (574.423 sumando todos los destinos). El máximo físico y el stock siguen
como contexto, el stock se puede pisar a mano, y el consumo es tocable (sustento por
artículo). Un destino sin consumo conocido dice "sin consumo" y no aporta faltante — no
se inventa.

## 3c-bis. Accesibilidad de carga: letra grande + teclado numérico (2026-08-30)

`[usuario 2026-08-30]` Dicho textual: *"Siempre quiero letras bien grandes y legibles
para que alguien que ve mal pueda escribir y no equivocarse. Donde van números, solo
teclado numérico."* Y la aclaración: *"la letra grande no tiene que romper la visual...
UX/UI súper prolija"*. La regla operativa completa vive en `CLAUDE.md` (sección
"Campos de carga"); acá lo importante del negocio: **hay gente del depósito que ve mal
y carga datos igual** — cualquier pantalla nueva se diseña para esa persona. Piso de
18px en `gp2-modulo.css`, `inputmode` en todo campo numérico (51 arreglados de una),
y el guard `test_teclado_numerico.js` para que no vuelva a pasar.

## 3c-ter. La tara del pallet se aprende sola (2026-08-30)

`[usuario 2026-08-30]` *"Una vez que empecemos a tener datos de carga de cuánto pesa
cada pallet, vamos a poder ir asumiéndolo para calcular mejor, no solamente tomando el
dato de 4 kilos."* Implementado en la BD (regla: el motor vive en la base):
`v_tara_pallet_real` saca la tara verdadera de cada pesaje guardado (balanza − suma de
rollos) y `recepcion_tara()` la promedia — por proveedor primero (n≥5), global después
(n≥5), filtrando taras fuera de 1–15 kg. El auto-cálculo del kg por rollo la usa en ese
orden y recién sin datos cae al punto medio del parámetro 4–8. No hay nada que
mantener a mano: cada pesaje que se guarda mejora el próximo cálculo.

## 2c. Costos y valorización: el motor de precios (2026-08-30)

`[usuario 2026-08-30]` Dicho textual: *"Quiero que yo te suba los precios de los insumos
y en función de ese precio me calcules cuánto vale mi stock y cuánto es lo que me genera
pedido para llenar al máximo. Para empezar considerá que todo vale un dólar. Los costos
del sector crudo: si lleva el fleje que vale un dólar el kilo, cotizalo a valor de
cuántos gramos pesa la pieza; y agregale un aporte por mano de obra a razón de DOS PESOS
POR SEGUNDO de demora por matriz. En sector procesado, si lleva pintado, agregale el
costo del pintado. Por ahora todos los precios un dólar para regular... después paso los
precios reales y cambiamos todo; la lógica es la misma."*

Y el remarque: *"si para que una parte llegue a sector crudo necesita que se ejecuten
dos matrices, hay que sumar los tiempos de las dos."*

**Los precios de hoy son de REGULACIÓN, no reales**: todo insumo comprado vale 1 USD
(flejes POR KG, el resto por unidad) y las cajas $ 1.000 ARS fijos (`[usuario]`: *"inventale
un valor, prefiero que sea un valor fijo para todos, cosa que pueda chequear"* — las
listas de cajas vienen en pesos). Los placeholder están marcados
`PLACEHOLDER 1 USD (regulacion)` / `PLACEHOLDER $1000 (regulacion)` en
`precio_proveedor.producto` y `precio_servicio.origen` para pisarlos limpio con las
listas reales sin tocar precios verdaderos. Lo ÚNICO real desde el día uno: la mano de
obra **$ 2 por segundo de matriz** (`parametro.costo_segundo_pesos`) `[usuario]` y el
**dólar oficial del cron** (`parametro.tipo_cambio_usd_pesos` + historia en
`GP2.tipo_cambio`, lo mantiene pg_cron desde dolarapi.com — NO tocarlos a mano).

**Monedas SIEMPRE separadas** `[usuario]`: material y servicios en US$, mano de obra (y
cajas) en $. Las pantallas muestran "US$ X + $ Y" y ADEMÁS el combinado en pesos usando
el dólar del cron — nunca un tipo de cambio inventado.

### La lógica de costos por sector (para la unificación futura)

`[usuario 2026-08-30]` **Objetivo final: esto se unifica con otro repo de costos; el
costo del ARTÍCULO tiene que surgir de sus componentes considerando la producción
completa.** La cascada, sector por sector (motor: `v_costo_componente` +
`v_valor_stock` / `v_valor_pedido`, RPC `valorizacion_bundle`):

1. **Fleje (5)**: vale su precio POR KG (`precio_proveedor`). Su stock está en kg, así
   que valor stock = kg × precio directo.
2. **Insumo comprado (plástico 6, bombilla 7, remache 8, cartón 10, caja 11)**: vale su
   precio por unidad. USD → columna dólares; ARS → columna pesos. Los marcados
   `estado_compra` fabricacion/discontinuo NO llevan precio de compra: se costean por
   su ruta (los resortes fabricados) o quedan en cero con aviso (discontinuos).
3. **Crudo (1) y tránsito (3)**: material = precio_kg del fleje × kg de la pieza
   (el `kg_x_uni` más cercano al corte; si la cadena no tiene kg cargado, cae a
   1/`partes_por_kilo_de_fleje` de la matriz de corte, que incluye scrap) + mano de
   obra = Σ `tiempo_historico` de TODAS las matrices de la cadena × $/seg (dos matrices
   = se suman las dos; verificado K5: 1,2+1,8+1,8 = 4,8 s → $ 9,60).
4. **Procesado (2)**: costo del componente de entrada + el precio del servicio del PS
   (`precio_servicio` por pieza: pintado, cromado, niquelado, temple...). Un servicio
   sobre la misma pieza (temple FAAT L13→L13) también suma.
5. **Armados con convergencia** (H11 = varilla H7 + cuchilla I16): las ramas SUMAN
   (material de cada fleje + su cadena). Rutas alternativas del mismo fleje (G7 se
   registró con y sin el paso de aplastado M77) NO duplican: la mano de obra se
   deduplica por matriz y el corte se cuenta una vez.
6. **GRJ / BOM (`componente_bom`)**: los hijos comprados no-fleje (remaches, bombillas)
   suman × cantidad encima de lo que trae la ruta.
7. **Terminado (12)**: queda AFUERA de la valorización de stock (el costo del artículo
   final es la unificación futura: receta `articulo_componente` + `componente_bom` ×
   costo de cada componente, más los pasos propios).

**Valor de stock** = stock × costo, por componente y ubicación. **Pedido a máximo** =
Σ por ubicación de greatest(0, máximo − stock) × costo — "cuánto me genera de pedido
llenar al máximo".

### Semántica verificada y trampas

- `[dato 2026-08-30: public.db_n8n_espejo]` **`matriz.tiempo_historico` = SEGUNDOS POR
  PIEZA** (no por golpe): en el espejo, `Segundos_Historico = Uni × Tiempo_Historico`
  EXACTO en todas las filas revisadas, y `Segundos_Trabajados` (reloj real) da la misma
  magnitud. GP2.matriz coincide 100% con `public."Matrices"`.
- `[dato]` **`matriz.uni_x_golpe` no sirve hoy**: 113 matrices en 0 y 2 en null. No se usa.
- `[dato]` **N1/N2 (Ahuecafruta/Ahuecapapa) tienen DOS matrices de soldado** para el
  mismo armado (183 genérica + 362/363 específica): el motor suma ambas (~$ 21 de más
  si en realidad es una sola). Si es data duplicada del vecino, corregir las rutas.
- `[dato]` **GRJ10/GRJ10A: los flejes E4/E5 entran DIRECTO al armado** (sin matriz de
  corte), así que no hay forma de repartir el kg entre los dos flejes: cada uno toma el
  kg total del GRJ (sobreconta material). Sector en vaciamiento; se corrige cargando
  kg reales por hijo cuando importe.
- `[dato]` El precio vigente de un componente = la fila más nueva de `precio_proveedor`
  por `fecha_lista` (después por id). **La OC guarda la foto histórica del precio al
  crearla** (`orden_compra_item.precio_uni/moneda` via `crear_oc`): si el precio cambia
  después, la OC vieja no se mueve.

## 2c-bis. Precios REALES cargados (2026-08-31): quién pasa lista, en qué moneda y unidad

Fuente: `Copia_de_A_Costos_VIGENTES.xlsx`, hoja "Lista de Precios " (bloques por
proveedor; col E = Cod ISIS, col G = último $ del proveedor, col I = fecha de lista).
`[usuario]` **Todos los precios son SIN IVA.** 98 placeholders de regulación pisados en
`precio_proveedor` + tabla nueva `GP2.precio_servicio_pieza` (85 precios de servicio
exactos por pieza; la vista de costos usa el exacto y cae al plano si no hay).

### Quién cotiza cómo (aprendido del archivo)

- **Flejes → USD POR KG.** `[dato]` Basconia (lista vieja, ago-2025), Aperam inox
  (jun-26), Hermac (jul-26), Brawin redondos (may-26), Szapiro, JL Metales (aluminio
  ganchito, caro: 10,50), Altrak (alambre galvanizado 1,715). **El matcheo es por
  `fleje_detalle.cod_isis`**, nunca por descripción. Un mismo isis puede estar en dos
  listas (0455 cuchilla abrelata: Basconia 3,60 vs Hermac 6,27) — gana el de
  `componente.proveedor`.
- **Tratamientos → PESOS POR KG** `[dato, verificado exacto contra la hoja Tratamientos]`:
  Pedernera cromado (46 precios distintos por pieza, $1.084–20.192/kg — pieza chica =
  kg más caro; su lista trae los GRAMOS de cada pieza en la col "Cod Art"), FAAT
  temple/cementado ($3.084–3.336/kg), Guazzaroni niquelado $2.606 / zincado y pulido
  $1.172, New Metal temple $5.500 (más caro que FAAT), Industermic zincado $671 (LA
  MITAD que Guazzaroni), MABRA pavonado $1.300 (vs Industermic $1.880). En
  `precio_servicio_pieza` están convertidos a $/pieza (kg de lista o `kg_x_uni` GP2).
- **Pintado y serigrafía → PESOS POR PIEZA** `[dato]`: Jade $127–305 (jul-26),
  Rec Color $203–225 (sep-26, más caro que Jade), Ximpa serigrafía $18–24.
  **Daniel (pintor) NO tiene lista en el archivo.**
- **Remaches Barres Daniel (Bella Vista) → PESOS POR UNIDAD** (jul-26), del remache
  CRUDO. `[usuario]` **Guazzaroni los niquela** → los V* niquelados pasaron a
  `estado_compra='fabricacion'` (cuestan CV* crudo + niquelado; la OC compra el crudo).
  Excepciones compradas niqueladas: **V13 ojal de Mandelli** y V20 (ver trampas).
- **Cajas → Corrugadora del Plata, PESOS POR UNIDAD** (jul-26). `[usuario]` **"del
  Plata" y "del Sur" son EL MISMO proveedor** (siempre se confundieron los nombres).
  **Recicor cotiza las mismas 9 cajas ~19% más barato** (ago-26) — cargadas como
  referencia sin vincular, la vigente es del Plata por decisión del usuario.
- **Plásticos: la lista de Pat Bet Plast es INYECCIÓN SOLA, SIN material** `[dato:
  hoja Plasticos]`. El precio real de la pieza = pellet × gramos (+4% desperdicio) +
  inyección — está calculado en la hoja "Plasticos" col "Total Mat e Inyeccion", y ESO
  es lo cargado `[usuario: "las dos"]`. Pellets ("la bolsa plástica") cargados aparte
  sin vincular, $/kg de los 3 proveedores activos: `[dato]` conviene partido —
  **Santa Rosa gana en PP/PS/AI** (cotiza en pesos: PP $3.065 ≈ US$2,00),
  **Indarnyl en nylon y ABS**, **Beta sólo en PE**.
- **Pliego adhesivado (skin) → Blist-Pack SA (3227), PESOS POR PLIEGO** (ago-26): las
  notas "12 bocas"/"20 bocas" de su lista indican posiciones por pliego. Skin Bombilla
  $147,97 (25 posiciones `[usuario]`, cargado en PLIEGO557/558). No confundir con el
  ENVASADO de Gentile/Oscar ($69/uni, `precio_tallerista`).
- **Cartones Grafica Pol: el precio va POR FORMATO de cartón, NO por familia de
  artículo** `[usuario, corrigiendo la primera propuesta]`: hay formatos baratos (8 =
  skin uña $64,75; huevo $48; corbata ocho $43) y caros (Medida B Chef $106,67;
  extractor $238). La hoja " Cartones" tiene el mapeo artículo→tipo (col A/C, ojo:
  numeración Loeke 1-18 y Chef 19-36 SE PISAN, desambigua la zona de filas). Pendiente
  de validar y cargar (85 placeholders).

### Decisiones tomadas con el usuario (2026-08-31)

- **Cremallera → importada vía Tierra Nativa, código 523C, USD 1,10/u** (ene-26).
  Cargada en E13 (entra como insumo de armado del 523/723, no la toca el ×kg de
  flejes). **CV17 (cremallera p/niquelar de Barres) → discontinuo.**
- **V18C Vástago Alu → discontinuo** ("el remache de aluminio no va más").
- **Skin 500 y Skin 506 (componentes cartón) → discontinuos** ("ya no van más").
- **Mandelli cotiza el ojal POR MILLAR** ($15.366,73 = $15,37/u) `[usuario confirmó]`.
- **Charcas sobre el Fleje 90 = CORTE de alambre para FILTROS DE CAFÉ, $9,50/u**
  `[dato: las 5 rutas de C3+Charcas terminan en 031/034/120/836/867]` — NO es el
  resorte de $110 (esos eran EP10/LLF8, resortes de batidores).
- **El tocho de afiladores = 90 arandelas enroscadas en un tornillo largo** `[usuario]`.
  Scorrano rectifica el tocho entero: $1.406 POR TOCHO (cargado así; el stock de
  J1/E4 se cuenta en tochos, 60 por cajón).

### Trampas nuevas (nos mordieron o casi)

- **El motor de costos camina rutas SIN CANTIDADES**: en un armado N→1 (90 arandelas →
  1 tocho; 25 posiciones → 1 pliego; los kg de GRJ ya anotados) cuenta UN hijo. Hoy el
  tocho E4 vale ~$1.454 cuando el real es ~$5.700 — impacto chico (6 tochos en stock)
  pero ES EL pendiente estructural: cantidad por paso en `ruta_paso`. `[deducido, medido]`
- **Kollplast vs Pat Bet, misma pieza, otro precio**: Pirolo $51,76 vs $20,07 (×2,5),
  Buje $20,48 vs $21,06. Todo quedó cargado con Pat Bet (así está `componente.proveedor`);
  revisar al repartir los inyectores. `[dato]`
- **A9 (mango alambre corta queso): la lista de Pedernera dice 21 g, GP2 tiene 39 g** —
  el precio exacto usa los gramos de la lista. `[dato, sin resolver]`
- **La lista de un proveedor puede seguir mostrando lo que ya no se le compra**: Pat Bet
  lista el cilindro PB1 (discontinuado), Suipacha el tornillo cortaqueso (¿importado?),
  Barres la cremallera. La lista dice qué VENDE, no qué le COMPRAMOS.
- **Fechas de lista MUY dispares** (Basconia ago-25 vs Aperam jun-26): el "precio
  vigente" puede tener un año. La fecha real quedó en `fecha_lista` de cada fila.

### REGLA DE ORO del costeo (2026-08-31, dicho textual del usuario)

`[usuario]` *"Yo quiero que registres el peso del clavo y cuánto vale el niquelaje:
si el día de mañana cambia, no vas a cambiar el precio del clavo, vas a cambiar el
precio del niquelaje. Lo mismo en los demás rubros."* Y la macro: *"poder valorizar
mi stock en cada punto de su estadío al valor actual"* — cada posición = cantidad ×
costo del estadío, armado EN VIVO.

**El peso vive en el componente (`kg_x_uni`), la tarifa vive en el proveedor, el
costo se CALCULA — nunca se guarda cocinado.** Implementado:
- `precio_proveedor.precio_por_kg` (bool): el precio es $/kg y la vista lo multiplica
  por el peso vivo. Primer caso: PCP3 clavo = Altrak USD 3,30/kg × 6,53 g.
- `precio_servicio_pieza.precio_kg` + `proceso`: tarifas $/kg por proceso (Guazzaroni
  niquelado $2.606 / zincado y pulido $1.172, FAAT temple $3.336 / cementado $3.084,
  MABRA pavonado $1.300, Pedernera cromado: tarifa propia por pieza) × peso vivo.
  Sube el niquelaje → UN update por proceso, todo se revaloriza solo.
- Consecuencia: **si un costo da raro, se corrige el PESO del componente, no el
  precio.** Dudas abiertas: A9 (GP2 39 g vs lista Pedernera 21 g) y W7P (GP2 0,7 g
  vs lista 2,2 g — huele a error de carga; el crudo W7 dice 2,1 g).
- Verificado en vivo: V1 remache niquelado = crudo Barres $4,45 + $2.606/kg × 0,35 g
  = $5,36. Los V* pasaron a `fabricacion` (patrón crudo → Guazzaroni → niquelado).

### Cartones: cómo se compran de verdad (2026-08-31, archivo Conteo_Pedido_Cartones)

- **El precio va por FORMATO físico, y la hoja "Costos" col "Carton" es LA referencia
  por artículo** (la hoja " Cartones" tiene mapeos viejos/errados: 544 decía $89 y va
  $43 corbata ocho; 515/542/543/559/562/570 van $48 huevo).
- **Cartones COMPARTIDOS**: la OC pide por grupos "Carton Cod. 519D" (059/551/597),
  "Cod. 570D" (055/312/318/518/533), "Cod. 546D", "Cod. 562D" (564)... — varios
  artículos, UN SKU físico. En GP2 hay un componente cartón por artículo: para precio
  da igual, para la OC habrá que normalizar algún día.
- **Bolsas**: 031 = Vihal $63; 034 y 867 = $63 y ADEMÁS comparten el cartón del 544
  (falta referenciarlo en receta). 516 va EN BOLSA (sin cartón propio). Hay dos bolsas
  de filtro: Vihal $63 (19×5cm) y Cabral $39,32.
- **Cuchillos de untar: blister ×2 por cartón** `[usuario]` — todo el costo ×2 salvo
  el cartón. Los precios cargados son POR UNIDAD; el ×2 va en la receta (y el motor
  aún no multiplica cantidades — mismo pendiente del tocho/pliego).
- Decisiones puntuales del usuario: 587 = $89 (NO como sus hermanos peladores 79),
  580 = $43 (como 544, aunque hoja Costos diga 89), 099/713 = $72,85 (factura
  Pelapapas Chef, no los $89 de la hoja), 120 = $35,50 (el cartón que él recordaba).
- Cargados 76/85. Sin dato: 097, 516, 609, 700, 706, 719, 878 (719/878/097 comparten
  grupo con 099/713/043/816 según "Carton x Categ." 2024 — falta saber cuál de los
  dos precios). Discontinuados: 574, 119, Skin 506.

### Placeholders que quedan (1 USD, listados — no inventar)

Cartones 097/516/609/700/706/719/878 · flejes D7 (EstaMetal sin lista), F12, Z19A ·
remaches CV13/CV14/V14/CV16/CV18D · BOM12/BOM8/BOM13/BOM14 (Cimarrón, sesión
bombillas) · servicios: B12/Z22 llavero pie (ningún pintor lo lista — pendiente por
decisión del usuario). Modelado pendiente: partir el clavo niquelado (patrón
remaches) y cantidades por paso en armados N→1.

## 2e. Faltantes y máximos de Crudo/Procesado: 5 cajones por ubicación (2026-08-31)

`[usuario 2026-08-30]` **"En crudo y procesado, el stock máximo tendría que ser 5
CAJONES por ubicación."** El máximo físico de cada componente de Sector Crudo y Sector
Procesado en su ubicación de sector es **5 × uni_x_cajon** (parámetro
`GP2.parametro['max_cajones_x_ubicacion'] = 5`, función `recalcular_maximos_cajones()`,
`maximo_origen = 'cinco_cajones'`). Pisó el modelo viejo de estantería
(`hueco_hasta_proximo_codigo` y supuestos). Se recalcula solo si cambia `uni_x_cajon`
de un componente o el parámetro (triggers `trg_maximos_cajones_*`). El componente sin
`uni_x_cajon` queda con máximo null y se lista pendiente en la pantalla de Faltantes
(hoy sólo Z12 de Procesado). No toca los sectores de insumos (5-11), que siguen con la
Est Madre (`recalcular_maximos_insumos`, `maximo_origen='est_madre'`).

`[usuario 2026-08-30]` **El faltante es AUTOMÁTICO en función del stock online** (antes,
en la casa del vecino, la "F" se ponía a mano cuando ibas a mandar a un tallerista/PS y
no había): crudo para mandar al proveedor de servicio, procesado para mandar al
tallerista. **Pero también se puede marcar a mano.** Módulo `Faltantes/Faltantes_GP2.html`:
faltante automático = stock menor al umbral, marcas manuales en `GP2.faltante_marcado`
(RPCs `marcar_faltante` / `resolver_faltante`). Las pantallas de Envíos persisten la
marca F ahí (origen `envios_tall` / `envios_ps`, best-effort al tocar el botón F).

`[deducido 2026-08-30, sin confirmar]` **Umbral del faltante automático: 1 cajón**
(`GP2.parametro['faltante_cajones_umbral'] = 1` — "ibas a mandar y no había un cajón").
Ajustable por parámetro; si el usuario dice otro número, cambiar el parámetro y esta línea.

`[usuario 2026-08-30]` **La cobertura dice la causa raíz**: la pantalla muestra cuántos
días dura el stock actual con el consumo real (`v_consumo_componente`) y cuántos días
duraría la ubicación LLENA (5 cajones). Si **ni llena aguanta 30 días**
(`ubicacion_corta` en `v_faltante_estado`), la causa del faltante crónico es que **no
alcanza lo que entra en la ubicación** — eso es lo que el usuario quiere ver. Hoy da 15
componentes de Crudo y 12 de Procesado en esa condición `[dato: v_faltante_estado]`.

---

## 2f-bis. Por qué faltan artículos en GP2 (2026-08-31)

`[usuario 2026-08-31]` Explicación de la cobertura: *"el empleado que armó las bases
normalizadas se enfocó primero en los artículos que usan un FLEJE para la fabricación.
Las bombillas, como el caño es comprado y no tiene proceso productivo interno nuestro,
por eso no están"*. O sea: **GP2 tiene los artículos CON proceso de fleje propio (80
con demanda, 116.817 uni/mes); faltan los comprados/sin proceso interno (276 códigos
con demanda, 79.490 uni/mes — el 40% de las unidades)**. `[dato]` Los que más venden
de los faltantes: coladores 26/27 (9.469 + 6.294), corta queso 546 (5.655), rallador
321 (3.035), filtro bombilla 550 (2.532), bombillas 558/557, cepillos 555/535,
peladores/cucharas/espátulas, y 88 códigos con sufijo "E".
**Sufijo E = IMPORTADO** `[usuario 2026-08-31]`: *"no vas a tener intervención desde
GP2"* — llegan terminados de afuera, sin proceso propio, así que esos 88 códigos
quedan FUERA del alcance de GP2 (no se construyen rutas ni recetas; solo existen en
la Est Madre por la demanda). El backlog se achica en capas `[dato 2026-08-31]`:
276 faltantes → −88 importados (E) → −45 ya cubiertos por el circuito **Prov. Art.
Terminado** (comprados terminados; el módulo AT ya los controla — ej. **los coladores
son de López José**, prov AT con 10 coladores activos `[usuario]`: 26, 27, 29, 110,
111, 112, 824, 825, 828, 830) → **backlog real: 143 artículos, 18.584 uni/mes** que sí
necesitan cadena en GP2. Se van incorporando de a uno con el usuario, empezando por
las bombillas (2f). Regla que deja esto: un artículo "faltante" primero se chequea
contra Articulos x Prov AT — si es comprado terminado, su lugar es el circuito AT,
no una ruta productiva.

## 2f. Bombillas 557/558 + Filtro 550 — cadena CONSTRUIDA (2026-08-31)

`[usuario 2026-08-31]` Los artículos **557 (Bombilla Resorte Chata)**, **558 (Bombilla
Resorte Tradicional)** y **550 (Filtro para Bombilla)** ya están completos en GP2
(Est Madre: 1.040 / 2.123 / 2.532 uni/mes). Primer caso de artículo con **dos fuentes**
(fabricado y comprado) en GP2.

### 557/558: el cuerpo armado tiene DOBLE ORIGEN (GRJ6 = chata, GRJ5 = tradicional)
- **(a) FABRICADO**: **un mismo caño + un resorte** (ambos comprados; componentes
  BOM12 "Caño Inox 140 mm" y BOM8 "Resorte para Bombilla", Sector Bombilla) van a
  **Martín Cornejo** (tallerista id 6), que arma y entrega en el **Sector Garage** de
  Cervantes. Dicho textual: *"el caño es el mismo, Martín le da un golpe diferente a
  cada caño"*. **(b) COMPRADO**: el mismo cuerpo armado se le compra a **Cimarrón**
  (`componente.proveedor` de GRJ5/GRJ6), que **también entrega en el garage**. Las dos
  variantes convergen ahí.
- *"Ya NO va con tapa de aluminio; hoy solo es caño+resorte"* `[usuario]` — nada de
  tapita / limpia bombilla / cartón del despiece viejo del vecino.
- **Cimarrón es proveedor habitual**: le compramos **de manera fija los artículos 654,
  658 y 659** `[usuario]` (siguen sin construir en GP2; Est Madre 568/150/86 uni/mes).
- Del garage → **Oscar = Gentile Norberto** (tallerista id 8, alias "Oscar"): recibe el
  cuerpo + el **pliego adhesivado** y hace el **SKIN, que ES el packaging**. Entrega
  557/558 terminados en **Virgilio**.
- **El pliego lo produce BLIST-PACK SA** `[usuario 2026-08-31, vía lista de precios]`:
  cod isis 3227, lista 2026-08-07 **por pliego** $147,97 ARS. Bombillas **de a 25 por
  pliego** → cantidad 1/25 = **0,04** en la receta (~$5,92 por bombilla)
  `[usuario, 25 posiciones a confirmar]`. TRAMPA de roles: **"Blist-Pack" ya existía
  como TALLERISTA id 13** (así figura en el vecino entregando GRJ5/GRJ6) y ahora además
  es **proveedor de insumo "Blist-Pack SA"** — misma empresa, DOS roles, NO se fusionan.
- **El envasado de Gentile se cobra POR UNIDAD**: $69 ARS/uni "Skin Bombillas" (lista
  2026-07-20, referencia isis **557/558/654** — o sea el 654 de Cimarrón TAMBIÉN lleva
  este envasado cuando se construya). Modelado en la tabla nueva
  **`GP2.precio_tallerista`** (tallerista_id + componente de salida del paso) y
  `v_costo_componente` lo suma en los pasos de tallerista (CTE `talx`, mismo patrón que
  `precio_servicio_pieza`; pasos de tallerista sin precio siguen a costo 0).
- **Recetas**: 557 = GRJ6 ×1 + PLIEGO557 ×0,04; 558 = GRJ5 ×1 + PLIEGO558 ×0,04.
  **BOM**: GRJ6 = BOM12 ×1 + BOM8 ×1; GRJ5 ídem (mismo caño, mismo resorte).
  **Rutas** (ids 609–616, patrón "Insumo X -> Art"): fabricada = insumos → Martín (sale
  GRJ) → Gentile (sale terminado) → Virgilio; comprada = insumo GRJ (Cimarrón) →
  Gentile → Virgilio; pliego = insumo → Gentile → Virgilio.
  Caja del vecino: N°2 (A8) de a 24 (`componente_caja_id`; la caja NO está en la
  receta — la receta es la que dictó el usuario).

### 550 Filtro para Bombilla: DOS variantes, hoy lo hace iJupa
1. **IJUPA (tallerista id 10) lo hace ENTERO**: solo le mandamos caja y cartón → 550
   terminado → Virgilio. **Regla explícita del usuario: aunque funcione como prov AT,
   SE MODELA Y MUESTRA COMO TALLERISTA.**
2. **FILTROS ×2 y PRECINTOS ×2** por unidad (componentes nuevos BOM13/BOM14, Sector
   Bombilla) **comprados a CIMARRÓN** → entrega en Cervantes y **se guardan en el
   Sector Garage** (*"no sé si tienen sector, no creo"* — el garage es su lugar; sector
   lógico = Bombilla, ubicación física = Garage) → van a iJupa con caja y cartón.
- **Cartón 550 = posición CCG6B** (vecino), consumido **÷25 como los pliegos** (0,04
  por unidad) `[deducido de la verificación pedida por el usuario, a confirmar]`.
  **Caja N°22 (A9) de a 36** `[dato: Uni_x_Articulo_x_Caja + est_madre uxb; el Despiece
  viejo dice 12 — presentación vieja/display]`. Receta: BOM13 ×2 + BOM14 ×2 +
  CCG6B ×0,04 + A9 ×1/36. Rutas patrón "Insumo X -> Art 550 (IJUPA)".
- **Los talleristas del 550 en el vecino (Garcia/Poly) están DESACTUALIZADOS**: hoy es
  iJupa. `[usuario]`

### Verificación (2026-08-31, v_consumo_demanda / v_consumo_componente / oc_bundle)
GRJ6 = 1.040 y GRJ5 = 2.123 **sin duplicar** entre las dos variantes de origen (el walk
deduplica por UNION); caño BOM12 = resorte BOM8 = **3.163**; pliegos = **41,6 / 84,9**
y cartón 550 = **101,3** (÷25); filtros y precintos = **5.064**; caja A9 = 70,3. Costos:
GRJ5/GRJ6 = 2 USD (caño+resorte placeholder), pliego $147,97/pliego, 557/558 Terminado
servicios $69 (envasado Gentile). Los 3 artículos aparecen en OC (BOM13/14 → Cimarrón,
pliegos → Blist-Pack SA) y en v_valor_pedido; Faltantes no los lista porque ese módulo
sólo mira Crudo/Procesado (por diseño, 2e).

### Pendientes de esta cadena
- **Caño BOM12 y resorte BOM8 sin proveedor ni precio real** (placeholder 1 USD):
  ¿a quién se compran? (¿también Cimarrón?). BOM12 además sin kg ni uni_x_cajon.
- Filtros/precintos/cartón CCG6B con placeholder 1 USD (Cimarrón/cartonero sin lista).
- Las **25 posiciones** del pliego y el **÷25 del cartón CCG6B** a confirmar.
- **654/658/659** (Cimarrón) sin construir; el 654 lleva el envasado de Gentile.

## 2g. Corta Queso 546 — construido (2026-08-31)

`[usuario 2026-08-31]` Lo hace **Lucho** (tallerista id 5). Se le manda: el **bastidor
importado C13** (posición en Sector Procesado; **ya trae el cilindro** — dicho: *"el
cilindro ya no se usa más"*, PB1 quedó `estado_compra='discontinuo'`), el **mango PC10**
y el **capuchón PA18** (elegidos por el usuario entre los Pat Bet Plast), más cartón
CCC4 y Caja N°1 (12 por caja, dato del vecino). Entrega el 546 terminado en Virgilio.
**OJO: NO es como el 119/574** (dicho textual: "119 y 809 NO SON COMO 546") — esos
llevan mango de alambre propio hecho de fleje; el 546 es todo comprado + armado.
Migración `articulo_546_corta_queso`: componentes, inventario, receta, 5 rutas
(patrón "Insumo X -> Art"), precios placeholder. Verificado: consumo fluye exacto
(C13 y CCC4 = 5.655/mes, sin duplicar).
**Resuelto (mismo día, "Avanza" del usuario)**: PB1 se sacó también de las recetas y
rutas del 574, 119 y 809 (migración `pb1_discontinuado_fuera_de_recetas_y_rutas`);
quedó sin referencias ni consumo, discontinuo, con su inventario en 0 como historia.

**Regla nueva del motor de costos** `[dato]` (migración
`costo_componente_comprado_fuera_de_sector_insumo`): también es "comprado" el
componente que tiene precio cargado y NUNCA es salida de un paso productivo — su costo
es su precio, viva en el sector que viva (el caso C13: comprado pero con posición en SP;
antes daba costo $0).

## 2h. 119 y 809 discontinuados: ahora se importan (2026-08-31)

`[usuario 2026-08-31]` *"119 y 809 son discontinuos, ahora se importan"* — los corta
quesos de mango de alambre ya no se fabrican acá; entran como importados (la familia
del sufijo E; en la Est Madre existe 809E con 1.095 uni/mes — cuál código E reemplaza
al 119 queda por confirmar si hace falta). Modelado: columna nueva
`articulo.discontinuado` (true para ambos; primer caso en GP2). Sus rutas y recetas
quedan como historia — sin fila en Est Madre no generan consumo, verificado. **El 574 también** `[usuario 2026-08-31, "574 discontinuo"]`: la familia entera de
corta quesos de mango de alambre (119, 574, 809) quedó discontinuada. OJO: el 574 SÍ
tenía demanda en Est Madre (936/mes), así que esto obligó a una regla nueva del motor
(migración `consumo_excluye_articulos_discontinuados`): **un artículo discontinuado no
genera demanda aunque la Est Madre lo proyecte**. Verificado: el mango de alambre A9
(id 84) quedó sin consumo — y de paso, A9 existe TRES veces (parte, Fleje 75 y Caja
N°22): otra prueba de que los joins van por id, nunca por código.
**Pendiente**: el 101 (Abrelatas) sigue sin fila en Est Madre y sin respuesta —
¿también discontinuado/importado?

## 3. Reglas del negocio ya incorporadas

- **Algunos talleristas pueden entregar partes EN CERVANTES** (además de Virgilio):
  **Martín Cornejo, ALEX ESCALANTE e IJUPA.** `[usuario 2026-08-31, corregido]` El dato
  original decía Carlos Aguirre, pero el usuario lo corrigió: *"Carlos es el papá de
  Alex, por eso le erré"* — son familia y por eso el cruce de nombres. Normalizado en
  `GP2.tallerista.entrega_cervantes` (true para ids 6, 2 y 10 — migraciones
  `talleristas_que_entregan_en_cervantes` + `entrega_cervantes_correccion_alex_no_carlos`).
  Cierra con las rutas: Alex arma los GRJ (ej. Batidor Pera del 544) y los entrega en el
  Sector Garage de Cervantes. OJO: `Recepcion Cervantes.html` del programa VIEJO tiene
  hardcodeado ARTICULOS_EMPRESA con CARLOS y MARTIN — puede venir de la misma confusión
  padre/hijo; revisar cuando se arme el flujo GP2. Ninguna pantalla GP2 lo usa todavía.

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
- **Las entregas se cuentan en CAJAS, no en unidades.** `[usuario 2026-08-30]` Dicho
  textual: "todas las entregas de talleristas son en cajas". Confirmado en el codigo para
  Prov. Art. Terminado: el modulo de carga titula la columna **Cajas**
  (`Prov Art Terminado/Entregas/EntregasAT.html:44`) y arma el detalle como `Cajas: N`
  (`EntregasAT.js:189`) antes de guardarlo en la columna `"Cantidad"` de
  `public."Entregas Prov AT"`. `[dato]` **El nombre de la columna enganya**: dice
  "Cantidad" pero son cajas. Las unidades se derivan (cajas x uni_x_caja), nunca al reves.
  Pendiente de confirmar si vale igual para las entregas de talleristas propiamente
  dichas (`Entregas Tallerista Virgilio`), que no se revisaron. `[deducido]`
- **Un mismo codigo de articulo puede tener dos uni_x_caja**, y no es un dato faltante:
  son dos presentaciones (DISPLAY vs SUELTO, tipico 12 contra 36) o directamente dos
  articulos distintos que comparten numero entre LK y CH (ej. el 26 es Pinza de Fideos en
  CH y Colador N°8 en LK). `[dato: public."Uni_x_Articulo_x_Caja", 18 codigos]`
  `Articulos x Prov AT.marca` esta **null en las 86 filas**, asi que hoy no hay forma de
  saber cual corresponde: se muestran los dos valores y no se calculan las unidades.
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

## 5. Pantallas que se achicaron (2026-08-30): fuera Punto de Stock, Verificación vive en Despiece

`[usuario 2026-08-30]` "Punto de stock no tiene sentido, podríamos borrarlo. Los dos de
verificación... que funcione mergeado todo en despiece x artículo."

- **Punto de Stock (`Stocks General/PuntoStock_GP2.html`) se BORRÓ.** La pantalla no
  aportaba: el punto de stock ya se ve donde se usa (OC sugiere por consumo, Orden de
  Producción por demanda). OJO: **la lógica en la BD queda viva** — `v_punto_stock` y
  `punto_stock_bundle` NO se tocaron porque `recalcular_maximos_insumos` (los máximos
  derivados de la Est Madre) depende de ese modelo.
- **Verificación Integridad + Verificación Madres se FUSIONARON dentro de
  `Despiece x Articulo/Despiece_GP2.html` (v2.0.0).** Motivo: las tres pantallas hablaban
  del MISMO artículo desde tres lugares (qué lleva / cómo se fabrica / qué dato falta).
  Ahora al elegir un artículo se ve junto: (1) la receta, con FALTA marcado en kg_x_uni /
  uni_x_cajon; (2) sus rutas trazadas con los botones Confirmar / Revisar después /
  Reportar problema / Marcar resuelto — **mismas RPCs `ruta_confirmar`/`ruta_reportar`/
  `ruta_resolver` y misma firma de deduplicación** (`F:<fleje>|tp:actor|...`), así que lo
  ya confirmado en la pantalla vieja sigue valiendo; (3) los avisos del artículo
  (componentes suyos sin datos maestros). Arriba, resumen global (rutas sin confirmar,
  problemas, componentes sin kg/uxc en sectores con peso) + filtro "solo artículos con
  pendientes", para no perder la vista de conjunto de las pantallas viejas.
- RPC nueva **`despiece_verif_bundle()`** (un solo viaje: sect + art/receta con flags de
  faltantes + rutas + confirmadas/problemas + resumen madres). `despiece_bundle`,
  `verificacion_bundle` y `verifmadres_bundle` quedan en la BD pero sin pantalla que las
  llame.
- `[dato 2026-08-30: GP2.ruta]` Al cruzar rutas con despieces: **3 rutas sin artículo**
  (ids 35 "Fleje 8 -> Art ", 151 "Fleje 49 -> Art ", 152 "Fleje 50 -> Art ") — en la
  pantalla nueva aparecen agrupadas como "— sin artículo —" para que no se pierdan.
  Además **55 componentes sin kg_x_uni y 72 sin uni_x_cajon** (sobre 301 de sectores con
  peso) y **12 artículos** tienen faltantes en su propia receta.

## 5b. Se disolvió "Herramientas GP2" (2026-08-30): el grupo del menú desaparece

`[usuario 2026-08-30]` **Decisión aprobada por el usuario** tras el análisis de las 3
pantallas del grupo: cada una va adonde se usa, y el grupo del menú se borra (v1.14.0).

- **"Programa de Stock" (`Programa/Programa.html`) SE CONSERVA entera**: es el simulador
  what-if por lote (artículo × N unidades → cadena completa + kg de fleje por matriz, RPC
  `programa_bundle`) y no duplica a nadie. Solo se **mudó el botón** al grupo Despiece con
  su nombre real: **"¿Qué necesito para producir?"**, marcado secundario.
- **"Faltantes" (`Faltantes/Faltantes.html`) se BORRÓ.** Sus acciones ya vivían mejor en
  OC (comprar) y Orden de Producción (producir), y calculaba con criterio contradictorio
  (mínimos estáticos vs. la demanda de la Est Madre). **Lo ÚNICO propio — el PRORRATEO del
  faltante por artículo — vive ahora en Despiece x Artículo (v2.1.0)**: al abrir un
  artículo, el bloque "Faltantes del artículo" muestra por componente y ubicación el
  mínimo, el stock, el faltante global y cuánto es atribuible a ESE artículo, con la
  matemática portada 1:1 del JS viejo (reparto ÷N cuando varios talleristas comparten el
  armado y firma anti-duplicado para que las rutas alternativas no cuenten doble los kg
  de fleje). La RPC **`faltantes_bundle` queda en la BD y ahora la llama el Despiece**,
  lazy, recién al abrir un artículo. `[dato: test_despiece_verif verifica los números a mano]`
- **"Registrar Movimiento" (`Movimientos/Registrar_Movimiento.html`) se BORRÓ.** 7 de sus
  9 tarjetas duplicaban pantallas dedicadas y escribían **tipos de movimiento distintos**
  (partían el ledger). Los 2 flujos propios — **Ajuste +/- y Armado en fábrica** — y la
  vista de últimos 50 movimientos pasaron a **Stocks general (v1.1.0)**, construidos por
  `gp2-motor.js` (funciones nuevas `GP2M.ajuste` / `GP2M.armadoFabrica` /
  `GP2M.ubicacionesDeComp` / `GP2M.artsFabricaDirecto`, portadas 1:1). El payload de
  `registrar_movimientos` NO cambió de contrato (test_stock_general lo fija exacto).
- `[dato 2026-08-30]` **Trampa de CSS descubierta al medir**: `font:18px inherit` es
  INVÁLIDO en Chromium (la declaración entera se descarta y el campo queda en la letra
  por defecto). Los campos de Despiece/Programa/StockGeneral pasaron a
  `font-size:18px;font-family:inherit` — si una pantalla usa el shorthand `font: Npx
  inherit`, la letra grande NO está aplicando aunque el CSS lo diga.
