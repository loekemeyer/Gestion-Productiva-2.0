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

## 0. Cómo trabaja el usuario (reglas de laburo, no de negocio)

### 🚨 TODO SE SUBE A `main`. SIEMPRE. SIN RAMAS.
`[usuario 2026-08-31, textual]` *"SIEMPRE TODO TENES QUE SUBIRLO A MAIN. NO QUIERO DECIRLO
MAS EN NINGUNA SESION."* Ya lo había dicho el 2026-08-30 (*"no quiero ramas, solo en main"*)
y hubo que repetirlo: **no volver a preguntarlo ni a proponer una rama.**

- Si la sesión arranca con una rama asignada por configuración, el destino final sigue siendo
  `main`: `git push origin <rama>:main`.
- La red de seguridad **no es la rama, es la suite**: `bash tests/ui/run.sh` en verde antes de
  pushear.
- **Por qué le importa tanto**: lo que se aplica en **Supabase queda vivo al instante y git no
  lo versiona**. Si el código se queda en una rama, la base tiene los cambios y `main` no
  tiene las pantallas que los acompañan. Pasó el 2026-08-31 con 5 commits (golpes, pinza de
  fiambre, matriz 62, pesaje, 506 con skin) mientras las migraciones ya estaban corriendo en
  producción. **Ese desfasaje es el riesgo real, no el de pushear a main.**

Está también arriba de todo en `CLAUDE.md`.

---

### Si CONOCIMIENTO ya lo aprueba, se hace `[usuario 2026-09-02]`

Dicho textual: *"Si encontras cosas para resolver que conocimientos aprueba, dale curso"*.

Cuando una auditoría (propia o de un agente) encuentra algo para arreglar, **no se pregunta
si el arreglo ya está decidido en este archivo**. Se aplica y se avisa después.

**Se aplica solo** cuando el arreglo se apoya en algo ya escrito acá: un patrón fijado
(crudo → niquelado, gemelos LK/Chef, el paso de tallerista que declara su entrada,
`estado_compra='fabricacion'` para un intermedio que sale de un proceso propio), una regla
de pantalla de la casa (letra grande, `inputmode`, `.table-wrap`, 390px), un test que quedó
viejo respecto de la pantalla, o un número que se deduce de un dato ya confirmado.

**Se anota y NO se toca** cuando hace falta un dato de negocio que no tenemos (un precio,
una tarifa, un tiempo de matriz), cuando contradice algo ya documentado — ahí primero se
revisa cuál de los dos está viejo — o cuando mueve plata en muchos artículos a la vez: eso
lo mira el usuario antes.

La contracara de esta regla es que **este archivo tiene que estar al día**: si algo se
decidió y no está escrito acá, nadie le puede dar curso.

## 0-bis. Los agentes de GP2 (creados el 2026-08-31)

Además de `gp2-experto` (que **discute** ideas de negocio, no ejecuta) el repo tiene 4
agentes que **ejecutan** tareas concretas, en `.claude/agents/*.md`. Cada uno arranca leyendo
CLAUDE.md y CONOCIMIENTO_GP2.md, así que evoluciona con este archivo.

| Agente | Cuándo se invoca solo | Modelo | Puede escribir |
|---|---|---|---|
| **`gp2-cirujano`** | Cambio de producto/proceso que toca la cadena normalizada (recetas, rutas, alias). Snapshot antes / diff después. | opus | sí — schema + código |
| **`gp2-auditor-costos`** | Un número de plata huele mal, después de cargar precios/tiempos, o barrido periódico. Devuelve hallazgos + arreglo propuesto. | opus | **NO — solo lectura** |
| **`gp2-cargador-excel`** | Cargar planilla del usuario a la base (precios, pesos, `uni_x_golpe`, maestros). Matcheo por id; lo dudoso devuelve como preguntas, no lo escribe. | sonnet | sí — schema |
| **`gp2-verificador-ui`** | **SIEMPRE antes de pushear a main** si se tocó HTML/JS/CSS (es el gate que exige la sección "Versionado" de CLAUDE.md). Corre la suite + reglas de pantalla. | sonnet | **NO — solo lectura** |

Reglas comunes que ya viven adentro:
- Nada de decidir por su cuenta: las dudas se devuelven en una sección **PREGUNTAS
  BLOQUEANTES** de su reporte final, para que la sesión principal las eleve al usuario.
- Los códigos NO son únicos (`A10`/`C10`/`B4`...): todo por `id`, todo `where` filtra
  también por sector.
- Snapshot de costos en tabla real `_bak_YYYYMMDD` (no temp, porque cada `execute_sql` es
  conexión nueva).
- En SQL crudo, el schema **siempre** entre comillas: `"GP2"`.

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
- **El reparto YA ESTÁ HECHO** `[usuario 2026-09-02, verificado en la base]`. La nota vieja
  decía "PENDIENTE: repartir los 29 plásticos, hoy están todos bajo Pat Bet Plast" y **eso
  ya no es cierto**. Foto real de `GP2.componente` del Sector Plástico (37 piezas):
  - **Pat Bet Plast (19)**: PA1, PA2, PA7A, PA7B, PA8A, PA8B, PA9, PA10B, PA12, PA13,
    PA18, PA19, PB6, PB8A, PB8B, PC7, PC10, PC11, PC16.
  - **Pettofrezza Rafael (12)**: PA4, PA5, PB5, PC1A, PC1B, PC8, PC13, PC14, PC15A, PC15B,
    PEP1, PEP4.
  - **Máspoli SRL (3)**: PC12, PEP7, PEP8.
  - Y los tres que no son plástico inyectado aunque vivan en esa zona (el sector es la
    zona física, ver §1-bis): **PEP5** mango de madera → Pintos, **PCP3** clavo →
    Trefilados Industriales, **D9** clavo niquelado → sin proveedor porque no se compra
    (sale del niquelado de Guazzaroni).
  - **Kollplast se quedó sin piezas asignadas**: figura como inyector pero no tiene ninguna.
    Pendiente menor: confirmar si le corresponde alguna o si por ahora no le compramos.

### `D1` (Espiral Sacacorcho): lo importado con su margen a la vista `[usuario 2026-09-02]`

Dicho textual: *"D1: costo TN 0.067usd. Vende a LK a 0.24usd"*.

- **El precio que carga GP2 es USD 0,24 por unidad** — lo que **paga Loekemeyer**. Es el
  número que va a `precio_proveedor` y el que usa el motor de costos.
- Los **USD 0,067 son el costo de la contraparte**, no el nuestro. Se anota igual porque es
  el único caso donde tenemos las dos puntas: **nos lo venden a 3,6 veces su costo**. Si
  algún día se discute importar directo, ese es el número de la conversación.
- D1 está como `estado_compra = 'importado'` y **ninguna ruta lo produce**: entra comprado y
  va a los **6 sacacorchos** (520, 521, 530, 531, 581, 730), 1 por unidad.
- **Impacto**: los 6 suben **$368,40** cada uno y quedan con `faltan_precios = 0`. En el
  **581** pesa fuerte — pasa de $331,20 a $699,60, o sea que **el espiral es más de la mitad
  del costo del sacacorchos**.
- **"TN" es Tierra Nativa SA** `[usuario 2026-09-02]`, `cod_prov` **3917**. D1 ya quedó
  asignado a ella, con el `cod_prov` en la fila de precio.

### Tierra Nativa SA (3917): nos VENDE, no arma `[usuario 2026-09-02]`

Dicho textual: *"Tierra nativa (Prov art importados y 231,232,233,234,591). Prov 3917"*.

- Es **proveedor de artículos TERMINADOS IMPORTADOS**: nos vende **231, 232, 233, 234 y
  591** ya hechos. Cargados en `GP2.articulo_prov_at`. **Sólo el 234 tiene descripción**
  (*Palo de Amasar Francés 40 cm*, sale del despiece del vecino); los otros cuatro quedaron
  en null a propósito — el usuario los tiene que dictar, no se inventan.
- Además nos vende **insumos importados sueltos**: el espiral de sacacorchos **D1**.
- **Rol dual mal cargado**: estaba **sólo** en `GP2.tallerista` (id 12, con el 3917 ya
  puesto, cero rutas y cero precios). Ese rol es el equivocado — no arma nada. Se dio de
  alta donde corresponde (`proveedor_at`, y también `proveedor_insumo` porque
  `componente.proveedor` es FK contra esa tabla). **La fila de tallerista sigue existiendo**:
  no se borra sin que el usuario lo confirme, pero ensucia el listado de talleristas.
- Es otra vuelta de la regla de siempre: **un mismo nombre puede tener varios roles**, y hay
  que fijarse en cuál es el que de verdad cumple antes de cargarlo.

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
- **`PB8B` (Inser. Neg. Batidor Calado): se COMPRA a Pat Bet Plast (plástico crudo) y
  DESPUÉS se CALA en fábrica.** `[usuario 2026-09-02]` O sea el proveedor **Pat Bet Plast
  está BIEN** (sí se compra, sí va en Recepción). Lo que le falta al modelo es el **paso
  de calado interno** (una ruta/proceso propio sobre el plástico comprado) — hoy figura
  como plástico comprado a secas, sin ese paso `[deducido: GP2.componente]`. No es
  `fabricacion` pura ni compra directa a secas: es **compra + proceso propio** (patrón
  parecido al crudo→niquelado de los remaches, pero acá el proceso lo hacemos nosotros).
- **`PC1A` (Mgo Pelapapa 505 Calado): se COMPRA a Pettofrezza Rafael (crudo) y lo CALA
  Esther** (proveedor de servicio, proceso Calado). `[usuario 2026-09-02]` El proveedor de
  compra **Pettofrezza Rafael está BIEN**; falta modelar el paso de **calado de Esther (PS)**.
  Mismo patrón compra+proceso que PB8B, pero acá el proceso lo hace un PS, no nosotros.
  Se confirmó que Esther no estaba en `GP2.proveedor_servicio` (eran 12 PS) y se la **dio de
  alta el 2026-09-02** (`id 14`, proceso *Calado*, migración `alta_ps_esther_calado`;
  `cod_prov` queda null hasta que el usuario lo aporte) `[dato: GP2.proveedor_servicio]`.
  **Esther cala los DOS mangos, no solo el 505** `[usuario 2026-09-02]`: **PC1A** (Mgo
  Pelapapa 505 Calado) y **PC1B** (Mgo Pelapapa 123) — "el mango que se usa para 505 y para
  123". Los dos se compran a Pettofrezza Rafael y los dos pasan por el calado de Esther.
  **Falta todavía la ruta**: el paso `proveedor_servicio` crudo → calado no está cargado
  (ni para PC1A ni para PC1B), y sin tarifa de Esther el costo de ese calado sigue en 0.
  **Traba concreta**: hoy NO existe un componente "crudo" (sin calar) separado de PC1A/PC1B,
  y sin ese par crudo→calado no se puede trazar el paso sin inventar un componente nuevo.
- **`PCP3` (Clavo 505): se compra a Trefilados Industriales.** `[usuario 2026-09-02]` Compra
  directa (sin proceso). **Ya aplicado** `[dato: GP2, verificado 2026-09-02]`: Trefilados
  Industriales está en el maestro `proveedor_insumo` (rubro *Sector Plástico*) y PCP3
  (`id 256`) lo tiene asignado en `componente.proveedor`. **Que esté en Sector Plástico
  siendo un clavo metálico ESTÁ BIEN** `[usuario 2026-09-02]`: el sector es la **zona
  física** donde vive la pieza, no el material del que está hecha — en la zona de plásticos
  también hay cosas que no son plásticas, y el clavo es una de ellas (ver §1-bis). No se
  toca. Lo que sí quedó abierto es el **precio**, más abajo.
- **`PEP5` (Mango Madera): se compra a Eduardo Pintos.** `[usuario 2026-09-02]` En la base
  ya figura con proveedor **"Pintos"** = **Eduardo Pintos** (el que hace la madera). Ya está
  bien asignado; se anota el nombre completo. **Decisión 2026-09-02: NO se renombra el
  maestro** `proveedor_insumo` "Pintos" → "Eduardo Pintos" `[deducido, revisado con el repo]`.
  Motivo: "Pintos" es el nombre de todos los días y aparece con ese string en la casa del
  vecino y en el código que la lee — `Talleristas/Control Tall/ControlTall.js` (rol dual
  Maspoli/Pintos), `Facturas/EntregaProveedoresCervantes.html` (`SECTOR_SC_POR_PROV`),
  `StockFlejes/recepcion.html` y `tests/ui/test_entregas_at.js`. Renombrarlo solo en GP2
  vuelve a abrir la trampa de siempre (el mismo proveedor escrito distinto en las dos
  casas). Si algún día se renombra, se renombra en los dos lados y en el mismo commit.

Marcar el estado **saca la parte de la Orden de Compra** y deja de contarla como faltante.
NO se usa el campo `proveedor` para esto: la OC agrupa por proveedor y terminaría
ofreciendo comprarle a un proveedor llamado "Discontinuo". Se marca desde la misma
pantalla de Inyectores, con los botones **Se fabrica** / **Discontinuo**.

### 1-bis. El sector es la ZONA FÍSICA, no el material `[usuario 2026-09-02]`

*"El sector es sector plástico… si está en la zona de sector plásticos, pero además de haber
cosas plásticas hay cosas que no son plásticas, por eso es que está ahí. Es correcto que eso
esté ahí."*

`GP2.sector` (y la `ubicacion` tipo *sector*) dice **dónde está guardada** la pieza en la
planta, no de qué está hecha. Que en *Sector Plástico* haya un clavo de acero o un mango de
madera **no es un error de carga**: es que ese cajón está en esa zona. **Nunca "corregir" un
sector por el material de la pieza** — se corrige solo si la pieza cambió de lugar físico.
Esto vale para todo el sistema: Recepción Insumos agrupa por sector (el chip *Plásticos*
muestra el clavo, y está bien), y el rubro del proveedor sale del mismo lado.

### El clavo 505 se NIQUELA antes de ir al tallerista `[usuario 2026-09-02, aplicado]`

El usuario preguntó *"¿el clavo primero se niquela o va directo al tallerista?"*. Se
niquela. La cadena real es:

```
PCP3 (clavo crudo, comprado) → Guazzaroni (niquelado) → D9 (clavo niq.) → tallerista → Virgilio
```

`[dato: public."Partes x PS" id 237]` — PS *Guazzaroni*, parte *"Clavos 505"*, **SC `PCP3`
→ SP `D9`**, proceso *Niquelado*, `KG x Uni 0,00653` (el mismo peso que tiene GP2). Y en
`public."Despiece x Articulo"` cada uno de los 7 artículos lleva **dos** líneas: `PCP3
"Clavos 505"` y `D9 "Clavos Niq."`, 1 por unidad. Es el mismo patrón que los remaches
(`CV9 → Guazzaroni → V9`), tal como anticipaba la nota que arrastraba el precio.

**Dónde se usa**: 7 artículos, 1 clavo por unidad — **099, 108, 123, 505, 513, 586, 713**.
**8 rutas** (el 505 tiene dos, una por tallerista): IJUPA arma 108/513/713, Lucho
123/505/099/586, Danica García la segunda del 505.

**Lo que se aplicó el 2026-09-02** (migraciones `clavo_505_paso_niquelado_patron_remaches`,
`d9_mismo_sector_que_el_crudo`, `clavo_tallerista_declara_entrada_d9`,
`clavo_stock_talleristas_pcp3_a_d9`, `precio_clavo_505_proveedor_trefilados`):

- **`D9` (Clavo 505 Niq.) creado** con `kg_x_uni 0,00653` y `estado_compra 'fabricacion'`
  (no se compra: se compra el crudo). Vive en el **mismo sector que su crudo**, Sector
  Plástico — igual que `CV9` y `V9`, que están los dos en Sector Remache.
- Las **8 rutas pasan de 3 pasos a 4**: `ingreso PCP3` → `proveedor_servicio PCP3→D9
  (Guazzaroni)` → `tallerista` → `virgilio`. Se renombraron a `Insumo D9 -> Art N` (con eso
  muere el `CLV505`, que no existía como componente en ningún lado).
- **`articulo_componente` ahora apunta a D9**, no a PCP3: el artículo lleva el clavo
  niquelado, igual que los remaches listan `V9` y no `CV9`.
- **El stock de tallerista pasó de PCP3 a D9** por `GP2.movimiento` (transformación en la
  misma ubicación): IJUPA tenía −4.908 y ese rojo es del niquelado, que es lo que consume.
  Los mínimos (Danica 15.000, Lucho 27.108, IJUPA 20.892) también se movieron a D9. El
  crudo PCP3 queda solo en Sector Plástico (720 uni), que es donde entra.
- **Costo**: el niquelado son **$17,02 por clavo** (0,00653 kg × $2.606/kg, tarifa
  Guazzaroni). Los 7 artículos suben ese monto, salvo el **505**, que además **dejaba de
  contar el clavo dos veces** (tenía dos rutas y el CTE viejo sumaba una por ruta): pasa de
  $493,57 a $477,51. Los otros: 099 $267,59→$284,61 · 108 $276,21→$293,23 ·
  123 $175,99→$193,01 · 513 $403,70→$420,72 · 586 $300,71→$317,73 · 713 $391,45→$408,47.
- **Precio**: la fila (`id 234`) pasa a nombre de **Trefilados Industriales** `[usuario]`.
  Los **USD 3,30 por kg quedan marcados como NO confirmados** — venían de la fila vieja a
  nombre de Altrak y el usuario dijo que el costo no lo sabe. `cod_prov` a null (el 3789 era
  de Altrak).

### ⚠ El paso de tallerista tiene que declarar QUÉ ENTRA `[hallazgo 2026-09-02]`

`v_costo_componente` arma el grafo de la ruta en el CTE `edges`, y **solo toma los pasos que
tienen `comp_entrada_id` Y `comp_salida_id`**. Si el paso `tallerista` viene con la entrada
en null, la cadena se corta ahí: **lo que entró al tallerista nunca llega al costo del
artículo**. Las rutas de fleje lo declaran bien (ruta 44: `tallerista` entrada `A8` → salida
`103`), pero el patrón "Insumo X → Art Y" de los crudos niquelados quedó con la entrada
vacía.

Por eso, al pasar el clavo a ese patrón, los 7 artículos perdían el clavo entero. Se
arregló declarando la entrada (`D9`) en el paso de tallerista de las 8 rutas.

**Lo mismo le pasaba a 52 rutas de 12 remaches** (`V1, V2, V3, V4, V5, V6, V7, V8, V9,
V12, V13, V18D`): su crudo y su niquelado no entraban en el costo del artículo.
**Arreglado el 2026-09-02** (idea 7210, autorizada por el usuario; migración
`remaches_tallerista_declara_entrada`): la entrada del paso de tallerista pasa a ser la
pieza que sale del paso de servicio de esa misma ruta — el remache ya niquelado, que es
lo que el tallerista realmente recibe. **35 artículos subieron, ninguno bajó**, entre
**+$5,92 y +$45,14** cada uno (~+$913 en total). Quedan **0 rutas** con la entrada en
null en ese patrón.

**Regla para adelante:** toda ruta nueva tiene que declarar `comp_entrada_id` en el paso
de tallerista. Si queda en null, el costo de lo que entra se pierde en silencio — no
falla nada, simplemente el artículo sale más barato de lo que es.

### Resto de los rubros
- **Cartones → Talleres Gráficos Pol**, siempre el mismo, los 85. `[usuario]`
- **Cajas → Corrugadora del Sur**, siempre el mismo, las 9. `[usuario]`
- **Flejes →** cada uno tiene el suyo (Basconia, Aperam, Hermac, Brawin, Szapiro,
  JL Metales, Altrak). `[dato: GP2.fleje_detalle]`. **EstaMetal salió de circulación**
  `[usuario 2026-09-01]`: se filtra del listado de proveedores y sus insumos ya no
  aparecen en Recepción; la data cruda del componente queda en la BD para no perder
  historial, si se quiere purgar pasa por gp2-cirujano.

### Recepción de flejes: qué informa cada proveedor en el remito `[usuario 2026-09-01]`
El popup de Recepción Insumos arma los campos según el proveedor (además del **KG
total** que va siempre):

### Altrak → Charcas → Cervantes (fleje cortado) `[usuario 2026-09-02, alineado al vecino]`
Altrak vende **una sola varilla** (`ALAM_FILTRO`, kg, prov Altrak, sector 13
Alambre, vive en ubic 13 Prov. Serv. Charcas). Charcas es **prov_servicio**:
solo **corta el alambre a medida** (no le da forma) → el output sigue siendo
alambre y se guarda en **Sector Fleje (id 5)**, no en Terminado/SP como
pensaba antes. Diferencia clave con Eclipse: Eclipse **da forma** (corta+dobla)
→ SP; Charcas **solo corta** → Fleje. Charcas cobra por el servicio de corte
(ISIS único **4596**, ~$9,50 IPC 10 al 2026-08-05).

**Un mismo material, dos formatos de corte** `[usuario 2026-09-02]`: el mismo
alambre + mismo proceso + mismo ISIS 4596 sale con dos longitudes distintas —
`IF90` (Filtro Café, 0,00830 kg/uni) y `IF90B` (Filtro Café Gastronómico,
0,01162 kg/uni). En el vecino: `public."Flejes"` N° 90 y 90B con proveedor
"Altrak", sector FC3/FB3B, ISIS 1395 (90; 90B sin ISIS).

**Componentes GP2 (2026-09-02):**
- `ALAM_FILTRO` (id 583) — kg, prov Altrak, sector 13, ubic 13 (Charcas).
- `IF90` (id 372, ex '031') — kg, prov **Resortes Charcas**, sector 5 (Fleje),
  `kg_x_uni=0,00830`. **Renombrado y migrado en `f90_alambre_filtro_cafe_y_cod_prov_charcas_v2`
  (2026-09-02)** desde `codigo='031' desc='31 Terminado' sector=12 unidad='unidad'`
  (que estaba mal — 031 en el vecino es el artículo terminado, no lo que Charcas
  entrega). Stock convertido: 2520 uni × 0,00830 = 20,92 kg de Virgilio (33) a
  Sector Fleje (5), vía dos movimientos tipo ajuste.
- `IF90B` (id 373) — kg, prov **Resortes Charcas**, sector 5 (Fleje),
  `kg_x_uni=0,01162`. **Migrado en `f90b_alambre_filtro_cafe_gastronomico`
  (2026-09-02, usuario "lo mismo para el filtro cafe")** desde `codigo='034'
  desc='34 Terminado' sector=12 unidad='unidad'`. Stock convertido: 720 uni ×
  0,01162 = 8,37 kg de Virgilio (33) a Sector Fleje (5). Otro compañero maneja
  las **bombillas de Charcas** (los 4 primeros ítems de la lista de precios:
  Resorte Bicónico, Batidor Pera, Bombilla p/niquelar, Bombilla inox) — IF90B
  no es bombilla, es filtro café gastronómico, mismo negocio que IF90.

**Pantallas / flujos:**
- **Compra Altrak (Pagos)** — `Compras/AltrakCharcas_GP2.html` carga kg del
  alambre cuando llega factura de Altrak → suma stock en Charcas.
- **Recepción operario** — rubro **Flejes** → IF90 con proveedor Charcas → RPC
  `cargar_recepcion_charcas` (dual): si el componente tiene ubic tipo=sector y
  unidad=kg (IF90), suma kg en esa ubic; si no (034, sector 12 sin ubic), cae al
  flujo viejo (Virgilio uni). Así el 034 no se rompe mientras el compañero lo
  migra. La RPC descuenta `paq × 10 × 1,02` kg de alambre en Charcas
  (parámetro `charcas_desperdicio_pct = 2`).
- **OC gemela** — OC a Charcas dispara OC gemela a Altrak por kg de alambre.
- **Frontend** — `esFiltroCharcas()` en `RecepcionInsumos_GP2.html` detecta solo
  por proveedor (ya no por sector), así IF90 en sector Flejes también dispara el
  popup `paq_charcas` (no el de balanza+pallets+rollos de flejes normales).

**cod_prov Charcas = 3605** `[usuario 2026-09-02, foto lista de precios]`.

### Aperam → Eclipse → Cervantes (misma lógica Altrak/Charcas) `[usuario 2026-09-01, calibrado con remito real 2026-09-02]`
Aperam entrega la **chapa 430** (1250×2500×0,8 mm) directo en **Eclipse**
(proveedor de servicio: corte chapa). Eclipse corta y entrega el insumo
**1686** (descorazonador) en Cervantes (remito en unidades, en cajas que
se pesan para confirmar).

**Números calibrados con remito real `[usuario + factura Aperam 2026-09-02]`:**
- Aperam: **4 chapas = 74,92 kg** de balanza → **18,73 kg/chapa real**
  (el teórico por densidad×volumen daría 19,25 kg → la laminación viene
  ~2,7% por debajo del nominal, dentro de la tolerancia normal del 430).
- Eclipse: **3940 uni = 55 kg netos** de pieza → **985 uni/chapa real**
  (el "760 uni/chapa" que yo tenía asentado antes era estimación
  incorrecta; el número que manda es el del remito).
- `kg_x_uni(1686) = 0,01376` (queda como está) `[usuario, "el que estaba
  en la tabla"]`. El empírico crudo daría 0,01396 (55/3940); GP2 subestima
  el peso de pieza en ~1,4% y ese punto se compensa vía el desperdicio.
- **Desperdicio Eclipse: `eclipse_desperdicio_pct = 28`**
  `[GP2.parametro, migración eclipse_desperdicio_pct_28, 2026-09-02]`. Sale
  de (74,92 − contable) / 74,92, con contable = 985 × 0,01376 × 4 = 54,2 kg
  → desperdicio ≈ 27,6% → redondeo a 28% para no sub-pedir.

**Cómo lo usa `crear_oc`:** ya lee el parámetro en la rama Eclipse — kg de
chapa 430 en la OC gemela a Aperam = `Σ uni × kg_x_uni × (1 +
eclipse_desperdicio_pct/100)`. Ejemplo: 3940 uni → 3940 × 0,01376 × 1,28
= 69,4 kg = **3,7 chapas → redondeo a 4 chapas enteras** (Aperam vende
completas). Coincide con lo entregado en el remito real. ✓

**Provisorio, revisar con próximos 2–3 remitos**: la tolerancia de
laminación del 430 varía chapa por chapa; el 28% puede moverse entre
~25% y ~30% en pedidos futuros. Ajustar `eclipse_desperdicio_pct` cuando
haya más muestras.

### Convención código de flejes: prefijo `I` (Insumo) `[usuario 2026-09-02]`
Todos los flejes en `GP2.componente` llevan **prefijo `I`** antepuesto — `I` =
Insumo. **Aplica a los 88 flejes de la base**, distribuidos en 2 sectores:

- **Sector 5 "Sector Fleje" (55)** — migración `flejes_prefijo_i_insumo`:
  `A1 → IA1, A10 → IA10, B3 → IB3, F90 → IF90, F90B → IF90B`, etc.
- **Sector 3 "Sector Transito" (33)** — migración `flejes_transito_prefijo_i`:
  variantes del mismo fleje después de pasar por una matriz.
  `A10-M365 → IA10-M365, B3-M32 → IB3-M32, F3-M37 → IF3-M37`, etc. Se filtró
  por `descripcion ILIKE '%fleje%'` para no tocar los 10 no-flejes del sector 3
  (Rompenuez, Cuchilla, Varilla, Destapa) que comparten el patrón `código-Mn`.

La regla **aplica solo a flejes por ahora** (otros insumos —cartones, cajas,
plásticos, remaches, bombillas— mantienen su convención sin prefijo). Motivo:
distinguir a simple vista los códigos de flejes en cualquier contexto.

**Renombre seguro** — verificado antes de aplicar: todas las tablas relacionadas
usan `componente_id` (FK bigint), no `codigo` como string; `fleje_detalle.n_fleje`
es dato descriptivo (número del vecino, no FK); cero hardcodes de códigos de fleje
en RPCs, vistas, triggers o frontend GP2; ningún esquema fuera de GP2 referencia
`GP2.componente` (ni vía función, ni vía FK). Verificación final: cero componentes
en toda la base con `descripcion ILIKE '%fleje%'` cuyo código no empiece con `I`.

### Prov Servicios "híbridos" (Charcas / Eclipse) `[usuario 2026-09-02]`
Charcas y Eclipse son prov_servicio pero **no siguen el flujo PS normal**
(Envío desde Cervantes → Entrega desde el PS). La MP les llega **directo
del proveedor externo** (alambre Altrak → Charcas, chapa Aperam → Eclipse)
y por eso **no hay Envío**: la carga se hace en las pantallas Pagos
(`Compra Altrak → Charcas`, `Compra Aperam → Eclipse`), y el stock queda
depositado en la ubicación del PS.

- **Pantalla dedicada**: `Prov Serv/CharcasEclipse/CharcasEclipse_GP2.html`
  (grupo PS del menú, "Charcas y Eclipse"). Muestra stock MP del PS
  seleccionado + registra Entrega + historial últimas 20. Fase A del rework
  aplicado el 2026-09-02 (versión menú v1.17.0).
- **OC**: se hace a Charcas/Eclipse con OC gemela automática a Altrak/Aperam
  (`crear_oc` con las 2 ramas, sin cambios).
- **Stock online** visible en la pantalla nueva: kg de ALAM_FILTRO en
  Charcas (ubic 13) y kg de CHAPA430 en Eclipse (ubic 48).
- **Fase B aplicada 2026-09-02**: se sacaron los rubros Filtros/Cortados de
  `RecepcionInsumos_GP2.html` (v3.36.0). Ya no hay entrada duplicada — la
  carga de F90/F90B/1686 vive únicamente en la pantalla dedicada. Los
  helpers `esFiltroCharcas()`/`esCortadoEclipse()` quedaron como stubs
  (return false) para no romper llamadas remanentes. Las RPCs
  `cargar_recepcion_charcas`/`cargar_recepcion_eclipse` siguen desplegadas
  en Supabase — solo cambia quién las llama (ahora la pantalla nueva).

**Paridad Altrak/Charcas ↔ Aperam/Eclipse `[dato 2026-09-02]`:** los dos
modelos son gemelos estructurales. Igual: ubicación tipo `proveedor_servicio`
(Charcas 13 / Eclipse 48), MP en sector 13 Alambre en kg (ALAM_FILTRO
Altrak / CHAPA430 Aperam), RPC de compra (`cargar_compra_altrak` /
`cargar_compra_aperam_chapa`), RPC de recepción (`cargar_recepcion_charcas`
/ `cargar_recepcion_eclipse`), OC gemela dentro de `crear_oc`, parámetro
de desperdicio, pantalla Pagos. `proveedor_insumo.modo_control` = `peso_total`
en ambos `[usuario 2026-09-02: "los paquetes se pesan"]` — semántico, el
HTML detecta por rubro (Filtros/Cortados) no por modo_control. **Ojo**:
hoy ninguno de los dos popups pide un peso separado; asumen `paq × 10` y
`uni × kg_x_uni`. Distinto por diseño: sector del producto final (031/034
en 12 Filtros; 1686 en 2 Procesado); Aperam sigue en Recepción de Flejes
(entrega dual chapa+flejes), Altrak no (100% va a Charcas). **Pendiente
menor**: `Charcas.rubro='Bombillas'` (debería ser 'Filtros' o 'Sector
Procesado'); `Aperam.rubro=NULL` (Altrak tiene 'Sector Alambre'). Ambos
cosméticos, no afectan lógica.

**Cruce con la casa del vecino (para no volver a discutirlo)
`[dato 2026-09-02, SQL sobre public]`:** el descorazonador vive en
`public."SP Kg"` como **`Z32 "Descarozador de Manzana"`** (no como "1686",
código nuevo de GP2) con `Kg X Uni = 0,0144` y `KG x Cajon = 10` (prov
"PENDIENTE (nacional)"); y en `public."Despiece x Articulo"` con el mismo
0,0144 (usado en el costeo de los artículos 395 y 709 del vecino). GP2
usa 0,01376 por indicación del usuario — el 0,0144 del vecino queda como
valor histórico desactualizado; **no se toca `public`** (regla "casa del
vecino"). El `KG x Cajon = 10` del vecino no es un cajón estándar de 30
kg, es exactamente **la caja que arma Eclipse** `[usuario 2026-09-02]`.

- **Componentes:** `CHAPA430` (kg, prov Aperam, sector 13 Alambre, vive en
  ubic 48 Eclipse) + `1686` **descorazonador** (uni, prov Eclipse, **sector 2
  Procesado = SP**, vive en ubic 2). `[usuario 2026-09-01: "el insumo
  entregado es descorazonador, tiene sector es SP"]`.
- **Pantalla Pagos:** `Compras/AperamEclipse_GP2.html` carga kg de chapa
  cuando llega la factura de Aperam → suma stock en Eclipse.
- **Recepción operario:** rubro nuevo "**Cortados**" → 1686 con proveedor
  Eclipse → RPC `cargar_recepcion_eclipse` suma uni en Cortados + descuenta
  chapa en Eclipse.
- **OC gemela:** OC a Eclipse dispara OC gemela a Aperam por
  `Σ uni × kg_x_uni × (1 + desperdicio/100)` kg de chapa.
- **Aperam sigue apareciendo como proveedor de flejes en Recepción Insumos**
  (a diferencia de Altrak que salió del listado): la chapa 430 es un flujo
  nuevo, los flejes que ya entregaba siguen igual.

**Revisión final `[usuario 2026-09-01]`:** TODOS los proveedores de fleje piden
**solo `Kg total`**, con dos excepciones:
- **Hermac** → `Kg total` + **`Paquetes`** (entero, se guarda en `p_pallets`).
- **Importado** → sin cambios (nunca tuvo campo extra; queda como los demás).

Los demás (Basconia, Aperam, Brawin, Szapiro, JL Metales, Altrak, EstaMetal
—que ya está oculto—) solo Kg total. Basconia y Altrak fuerzan `kg` en
`abrirPopup` aunque el fleje tenga UM `unidad` en el componente; el resto
respeta la UM canónica.

El campo Pallets del remito se sacó: el paso 2 arma 1 pallet por default y el
operario suma con "+ pallet" si el remito trajo más. Ver `fieldsFleje(prov)` en
`StockFlejes/RecepcionInsumos_GP2.html`.
- **Importado** (marcador, no es una empresa): la **Cremallera (E13)** y los insumos del
  **corta queso PB1 cilindro y V20 tornillo** **ya no se fabrican, se importan**.
  `[usuario 2026-08-29]`. **Z19A (alambre corta queso) NO va en Importados**
  `[usuario 2026-09-01, corrección al anterior]` — está `estado_compra=discontinuo`
  con `proveedor=null`, no aparece en OC ni en Recepción Insumos.
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
**El parser de número quedó UNO SOLO (corrección 2026-09-03)** `[dato]`: el modo
`GP2EE.num(v,"simple")` (el que leía "1.234,5" como 1,2345) se ELIMINÓ el 2026-08-30 —
`num()` acepta el parámetro `modo` y lo ignora, y todas las pantallas cableadas a `GP2EE`
usan la regla buena: el último separador es el decimal. Lo que sigue vivo es OTRO
problema, y está FUERA de `GP2EE`: las pantallas que NO usan el helper tienen su propio
saneador local de `input`, y varios son destructivos. El peor ya mordió: en
`Recepcion Cervantes.html` los campos de kg hacían `replace(/[^\d.]/g,"")` **al tipear**,
así que la coma que ofrece el teclado es-AR se borraba tecla por tecla y "12,5" quedaba
125 (x10), "250,75" quedaba 25075 (x100) — datos de producción inflados en silencio.
Arreglado 2026-09-03 normalizando la coma a punto ANTES de sanear. Regla: **un saneador
de `input` nunca borra la coma, la traduce**; y si la pantalla es de envío/entrega, va
cableada a `GP2EE.num` en vez de tener parser propio.

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

**Barrido de accesibilidad de TODAS las pantallas (2026-09-03, v1.66.0)** `[dato]`: una
auditoría global encontró que la regla de letra grande estaba rota en varios frentes a la
vez, y ninguno lo agarraba la suite. Lo que se aprendió:

- **`gp2-claro.css` se pisaba a sí mismo.** El bloque "LETRA +1" (2026-08-31) escribió
  `input, select, textarea, button { font-size:17px !important }` DESPUÉS del piso de 18px
  y con la misma especificidad, así que ganaba el 17 en las 13 pantallas que cargan ese
  CSS. Y encima se tocó el archivo sin bumpear el `?v=`, así que las tablets seguían con
  la versión de antes del "letra +1" — el clásico "no veo los cambios". **Regla: cuando se
  toca la tipografía, los campos SUBEN, nunca bajan; y todo cambio de CSS compartido bumpea
  su token en las páginas que lo cargan.**
- **El cluster `Produccion/` (abm, entrevistas, tiempos, monitor, rendimiento) no carga
  `gp2-modulo.css` ni `gp2-claro.css`**, así que nada le levantaba los campos: estaban en
  13px con 36px de alto. Una pantalla sin el CSS de la casa hay que revisarla a mano.
- **La app de operarios tenía 8 reglas con `color:#fff` sobre fondos casi blancos**
  (`#e7ebf8`, `#e7f8ed`, `#f8e7e7`): botón Continuar, cajas seleccionadas, Terminar Día.
  Contraste ≈1,2:1, ilegible en la tablet del galpón. Vino de un pase masivo que aclaró
  los fondos sin tocar los textos. **Regla: fondo pálido = ESTADO (una caja elegida), y
  ahí el texto va oscuro; un BOTÓN de acción va sólido con texto blanco.** Mismo bug
  aparecía en `ControlPS_GP2` (botón Guardar) y en `ABM_Articulos_GP2` (dos inputs).
- **`.seg-btn` estaba copiado idéntico en 9 pantallas de stock** (Flejes ×6, SC, SP,
  Movimiento) y en las 9 medía 38px. Se unificó en `gp2-modulo.css` a 44px: ahora se toca
  una vez. Lo mismo vale para cualquier regla que aparezca 3+ veces igual.
- **Los guardias de la suite tenían agujeros y por eso nada de esto saltaba**:
  `test_teclado_numerico` sólo miraba el piso en `gp2-modulo.css` (no el resto del CSS ni
  los `type="text"` que piden números), y la regex de `test_tokens_cache` no incluía el
  espacio, así que **toda ruta con carpeta espaciada** (`Control Tall/`, `Prov Serv/`,
  `Stocks General/`) se salteaba sin avisar — `ControlTall.css` convivía con dos tokens y
  el test decía OK. Los dos se ampliaron: el de campos ahora parsea todo el CSS de las
  pantallas GP2 y el de tokens lee el atributo `src=`/`href=` completo.

**Cuando dos talleristas hacen la MISMA pieza, se paga UNA sola vez (2026-09-03)** `[usuario]`:
textual, *"uno u otro, no x2 de costo"*. El CTE `talx` de `v_costo_componente` sumaba las
tarifas de todas las rutas que producen una pieza, así que un artículo cuyo armado hacen
dos talleristas lo pagaba dos veces. Corregido: ahora se elige **una tarifa por pieza** (se
toma la más cara, para no subestimar) y recién después se suman las piezas **distintas** de
la cadena, que sí deben sumar. Afectaba 6 piezas: 315 y 609 (Pettofrezza $140 / Cavallero
$85), 505 (Danica / Lucho $33), 510 (Alex / Martin $27,14), 500 y GRJ7 (Martin / Alex $8,99).
**La regla vale para cualquier caso nuevo**: dos talleristas alternativos para la misma
pieza no son dos pasos, son una elección.

**El armado de tochos del 504 se estaba cobrando dos veces (2026-09-03)** `[usuario]`:
mismo criterio que arriba. La ruta 37 (*Fleje 10 → Art 504*) pasa primero por **Lucho**
(F7 → **J1**, *Tochos Zinc p/Rectificar*) y después por **Martin** (E4 → 504, el afilado).
Pero al cargar las tarifas del Excel el 2026-09-02 la línea *"Afila Cuchillos 504 Arm
Tochos"* se sumó **además** adentro del precio de Martin ($131,46 + $194,25 = $325,71),
cuando ese mismo trabajo ya estaba cobrado en el J1 de Lucho ($173,817). Se queda el de
Lucho — que es quien la ruta dice que hace los tochos — y **Martin vuelve a $131,46**, igual
que en sus gemelos 097 y 114. El 504 baja de $2.626,49 a $2.432,24. **Trampa a recordar**:
cuando una línea del Excel describe un paso que en GP2 es un COMPONENTE aparte, no se
suma al precio del artículo — se carga en ese componente.

**El consumo sale de la RECETA, no de la RUTA (2026-09-03)** `[dato]` — la trampa más cara
encontrada hasta ahora. `v_consumo_demanda` arma el consumo con
`articulo_componente.cantidad` (y `componente_bom`), y después **camina la ruta hacia atrás
sin multiplicar por la cantidad de cada paso**. O sea: `ruta_paso.cantidad` **no participa
del consumo**, solo del costo (CTE `insumox`). Consecuencia real: el `Pliego Ad 506` tenía
1/12 en la ruta y **1 en la receta**, así que la Est Madre pedía 16.968 pliegos/mes en vez
de 1.414 — **$15,5M/mes** de pedido fantasma, ~$85,6M sobre los 6 meses de la OC. El
usuario confirmó el 2026-09-03: **el pliego del 506 rinde 12** (*"1 12"*). Corregido en la
receta. **Regla: cuando una parte rinde N unidades, la división va en LAS DOS —
`articulo_componente.cantidad` y `ruta_paso.cantidad` — o el consumo y el costo dicen cosas
distintas.** Quedan 8 desacuerdos receta≠ruta sin resolver (ver ideas 7223 y 6116).

**Los flejes van en KILOS, sin excepción (2026-09-03)** `[usuario: "4 Dale"]`: `IC3`
(*Fleje N° 90*, el alambre galvanizado Ø 1,63 mm de Altrak con el que se hacen los filtros
de café), `IE13` e `IZ19A` eran los únicos **3 de los 50 flejes** con
`componente.unidad_medida = 'unidad'`. Como se compran, se reciben y se cotizan **por kilo**
(IC3: USD 1,715/kg), el inventario guardaba unidades mientras el precio era de kilo, y
`v_valor_stock` y la valorización de la OC multiplicaban una cosa por la otra: **IC3 figuraba
con $27,3 millones de stock cuando valía ~$226.000**, y $50,3M/mes de consumo. Pasados a kg.
Dos cosas que valen como regla:

- **El costo de los ARTÍCULOS ya estaba bien y no se movió ni un peso.** El CTE `mat` de
  `v_costo_componente` convierte solo para `sector_id = 5` (031 y 836 = $333,02; 034 y 867 =
  $362,00). Lo único que estaba mal era el **costo unitario del fleje en sí**, que es lo que
  usan el stock valorizado y la OC. Si un número de plata huele mal, mirar **por dónde entra
  la parte**: el mismo dato puede estar bien por un camino y mal por el otro.
- **Para reexpresar un stock NO se toca `inventario` a mano ni se inventa un ajuste.** Se
  cambia `unidad_medida` y después se *toca* el movimiento (`update movimiento set cantidad =
  cantidad`): `to_canonical` lo reconvierte con la unidad nueva y `fn_movimiento_aplicar`
  revierte el delta viejo y aplica el nuevo. El movimiento sigue diciendo la verdad de lo que
  se cargó ("480 unidades") y el inventario queda en kg (3,984). El motor de inventario vive
  en la BD: se le habla por `movimiento`, nunca por `UPDATE inventario`.

**Las 81 recepciones de insumos que había eran TODAS de prueba (2026-09-03)** `[usuario:
"eliminalas todas, fueron todas de prueba"]`: nacieron con el módulo (29/08 al 02/09) y se
veían las tandas repetidas (*Caja N°1* cuatro veces a 10.000, *Cartón 510* seis veces en el
mismo minuto). Borradas. **El remito NO tiene nada que ver**: 74 de las 81 no lo tenían y
eso me sirvió para encontrarlas, pero es una huella, no la causa — el campo es **opcional a
propósito** (`placeholder="Opcional"`) porque el remito no siempre está a mano cuando entra
la mercadería. Que sea opcional no fue lo que generó las pruebas. **Cómo se borra una recepción**: primero el
`movimiento` — `fn_movimiento_aplicar` corre también en DELETE, así que el trigger revierte
el stock solo — y después la fila de `recepcion_insumo` (`recepcion_control` y
`recepcion_control_rollo` caen por CASCADE). Ninguna OC tenía `recibido <> 0`, así que no
hubo cruce que deshacer. **Un solo rojo quedó**: `IA1` a −40,88 kg, porque el movimiento 1373
del 31/08 (fabricación de 40,876 kg de IA1 → 1.250 uni de `J2`) consumió ese stock de prueba.
Ese movimiento **no se borró a propósito**: `J2` tiene una cadena entera colgando (envío a
Jade, entrega de vuelta a Procesado y los dos ajustes del blanqueo de negativos del 02/09),
y borrarlo reabriría negativos ya limpiados. Se blanqueó con un `ajuste` trazado, mismo
patrón que las ideas 7204 y 7212. **El stock valorizado total baja de ~$116M a $9,54M** — y
ese $9,54M es el número que hay que creerle.

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

## 2c-vicies. "Fábrica" no cobra tarifa: va por tiempo de matriz (2026-09-02)

`[usuario 2026-09-02]` *"hay que fijarse el tiempo de las matrices para el armado y
envasado y calcularlas a $2 por segundo"*.

**Fábrica es la única contraparte interna**, y por eso **no lleva `precio_tallerista`**: su
costo sale de los **tiempos de matriz × `costo_segundo_pesos`** (hoy **$2**). Ya funciona
así — sus 8 artículos tienen la mano de obra calculada y `faltan_tiempos = 0`:

| Artículos | Segundos | Mano de obra |
|---|---|---|
| 507 / 707 | 34,27 | $68,54 |
| 542 / 543 / 720 / 722 | 23,60 | $47,20 |
| 570 / 858 | 43,21 | $86,42 |

**Sus 8 filas "sin tarifa de tallerista" NO son deuda** — igual que las 3 de Máspoli, que
van por precio de material. Al contar cuánto falta de la idea 6117, estas 11 no cuentan.

**Lo que sí falta es tiempo en las matrices.** De las **115 matrices, 18 que están en uso
tienen `tiempo_historico` en 0 o null**, así que ese trabajo se hace y no se cobra. Las
más caras por cantidad de rutas: **69** Doblado Resorte (6 rutas), **182** Estampado Flecha
de Ahueca, **360** Corte Ahueca, **361** Corte Flechita Ahueca y **64** Corte Pinza Fiambre
(4 cada una). Cuatro de ellas caen justo en las cadenas de Fábrica. Ver idea **7213**.

## 2c-novodecies. Filtros de café: el alambre NO es el filtro (2026-09-02)

`[usuario 2026-09-02]` *"cuando entrega charcas va a IF90 y de ahí va a ijupa que después
entrega en virgilio"*. La cadena real de los artículos **031** y **034**:

```
IC3 (Fleje 90) → Resortes Charcas CORTA → IF90 (alambre cortado)
               → IJUPA ARMA → 031 (filtro terminado) → Virgilio
```

**Lo que había estaba mal en dos lugares**: el paso de Charcas devolvía `IC3` (o sea no
producía nada) y era **IJUPA** quien "producía" `IF90`. Con eso el **alambre ocupaba el
lugar del terminado** y el artículo 031 se quedaba sin componente propio.

**De dónde salió el error, que es la parte que conviene recordar:** la migración que creó
el alambre el 2026-09-02 **reusó el componente 372, que era "31 Terminado"**, y lo renombró
a F90 → IF90. Renombrar un componente existente en vez de crear uno nuevo **le robó la
identidad al terminado**. Si una pieza nueva aparece en la cadena, se crea; no se recicla
la que ya estaba ocupando otro rol.

Se recuperaron los componentes `031` y `034` (sector 12, como sus gemelos Chef 836 y 867),
se reescribieron los 4 pasos de las rutas de fleje y los 8 de las rutas de insumo, y la
tarifa de IJUPA se mudó del alambre al terminado.

**El alambre lleva `estado_compra = 'fabricacion'`**, igual que D9 y V9. Sin eso, al vivir
en sector 5 (Fleje) el motor lo tomaba por comprado, **cortaba la cadena de material** y el
filtro quedaba con material en 0. Es la misma regla de siempre: **una pieza intermedia que
sale de un proceso propio no es "comprada", aunque viva en un sector de insumo.**

**La prueba de que quedó bien**: 031 = **$333,02** y 034 = **$362,00**, *exactamente* los
mismos números que sus gemelos Chef 836 y 867, que llegan por otro camino. Cuando dos
gemelos LK/Chef dan igual, la cadena cierra.

Fleco menor: 031/034 y el alambre quedan con `faltan_precios = 1` mientras los gemelos
tienen 0, aunque el costo total da idéntico. No cambia ningún número; hay que mirarlo.

## 2c-sexdecies. Hay talleristas que cobran POR KILO (2026-09-02)

`[usuario 2026-09-02]` Sobre el $775,01 de la Cuchilla Pelapapa Cerrada en el Excel de
Martin: *"es x Kg"*. **No todas las tarifas de tallerista son por unidad.**

Eso era una trampa cara: `precio_tallerista` sólo tenía `precio_uni`, así que cargar ese
número tal cual habría multiplicado el costo de esa pieza **por 200**. Un número que parece
absurdo al lado de sus vecinos (775 contra 8,99) casi siempre es **otra unidad**, no un
error de tipeo — vale la pena frenar y preguntar.

- Se agregó **`precio_tallerista.precio_kg`**, igual que ya lo tenía `precio_servicio_pieza`.
- El trigger **`trg_precio_tallerista_kg`** calcula solo `precio_uni = precio_kg ×
  componente.kg_x_uni`, que es lo que lee `v_costo_componente` (la vista suma `precio_uni`,
  no sabe de kilos). Si la pieza no tiene `kg_x_uni`, la carga **falla con un mensaje
  claro** en vez de guardar un costo en cero.
- Ejemplo cargado: **X4** a $775,01/kg × 0,00492 kg = **$3,81 por unidad**.
- **Ojo**: si después cambia el `kg_x_uni` de la pieza, el `precio_uni` guardado queda
  viejo. Hay que volver a tocar la fila (un `UPDATE precio_kg = precio_kg` alcanza, el
  trigger recalcula).

En el mismo Excel hay otras dos líneas por kilo. **Puntas 523 Afilado ($4.830) ya no se
hace más** `[usuario 2026-09-02]` — línea muerta, no se carga. Queda sólo *Puntas 520
Afilado (KG)* $3.361,18, que todavía no se puede cargar porque no está claro sobre qué
componente de GP2 cae.

## 2c-septdecies. El Excel de costos arrastra quién hacía el trabajo ANTES (2026-09-02)

El bloque de un tallerista en `A Costos VIGENTES` **no es la lista de lo que hace hoy**:
tiene renglones de trabajos que ya se mudaron a otro. En el de Martin aparecían cuatro que
GP2 tenía en otro lado, y el usuario confirmó que **GP2 está bien y el Excel viejo**
`[usuario 2026-09-02: "todos esos ahora es pettofrezza y fabrica, ya no martin"]`:

| Línea del Excel de Martin | Precio | Quién lo hace hoy |
|---|---|---|
| 523 Sacacorcho Doble Aleta AyE | $44,81 | **Pettofrezza** |
| 551 Cuchillo Untar x 2 Plast AyE | $61,17 | **Pettofrezza** |
| 507-707 Rompenueces AyE | $45,43 | **Fábrica** |
| 570 Pala Canelones AyE | $84,77 | **Fábrica** |

También caen ahí **57 Destapacorona** ($49,35, hoy de **Danica**) y **546 Cortaqueso**
($110, hoy de **Lucho**).

**Regla al cargar tarifas desde ese Excel:** el bloque dice el precio, pero **quién hace la
pieza lo dice GP2**. Si no coinciden, se frena y se pregunta — no se carga la tarifa a
nombre del que figura en la hoja. Y **esos precios no se trasladan solos al nuevo
tallerista**: cada uno cobra lo suyo, así que hay que buscarlos en el bloque propio de
Pettofrezza y de Fábrica.

## 2c-octodecies. Artículo 104 (Sac Ergo LOKE) = clon del 581 (2026-09-02)

`[usuario 2026-09-02]` *"104 es igual con mismos componentes que 581"*. En el Excel los dos
comparten un solo renglón — *"581/104 Sac. Cabo Plástico AyE $60,35"* — y en el vecino son
**104 = Sac Ergo LOKE** y **581 = Sac Plast LK**.

GP2 no tenía el 104. Se clonó el 581 tal cual: componente terminado (sector 12), artículo
(familia Sacacorchos, 12 por caja A9) y **las 5 rutas** — `D1 + PB8A + V11 + CCE2B + A9 a
1/12`, todas armadas por Martin y entregadas a Virgilio — más la tarifa de $60,35. Quedó
con el **mismo costo que el 581: $759,95**, sin precios faltantes.

**Detalle que hay que saber para clonar rutas:** `GP2.ruta.articulo_id` **viene en NULL** en
estas rutas. La convención de la casa es identificarlas por el **nombre** (`Insumo X -> Art
N`) y por sus pasos, no por esa FK. Un clon filtrado por `articulo_id` no copia nada.

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

**Valor de stock** = stock × costo, por componente y ubicación. **MÁXIMO POR SECTOR** =
Σ por ubicación de greatest(0, máximo − stock) × costo. `[usuario 2026-08-31]` **Se llama
así: "máximo por sector"** — NO "tope" ni "pedido a máximo". Y suma **todo el circuito**
(sector propio + talleristas + Virgilio), no solo lo propio: de los $678 M, $476 M son del
sector propio, $114 M Virgilio y $89 M talleristas.

### Semántica verificada y trampas

- `[dato 2026-08-30: public.db_n8n_espejo]` **`matriz.tiempo_historico` = SEGUNDOS POR
  PIEZA** (no por golpe): en el espejo, `Segundos_Historico = Uni × Tiempo_Historico`
  EXACTO en todas las filas revisadas, y `Segundos_Trabajados` (reloj real) da la misma
  magnitud. GP2.matriz coincide 100% con `public."Matrices"`.
- `[dato]` **`matriz.uni_x_golpe` está vacío** (113 en 0 y 2 en null) — pero **no es un
  campo inútil: es el que falta para leer bien los tiempos**. Ver §2c-quater (golpe ≠ unidad).
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
- **Skin 500 → discontinuo** ("ya no van más"). **CORRECCIÓN 2026-08-31: el Skin 506 SÍ va**
  `[usuario]` — ver §2c-septies. Quedó como discontinuo por esta línea y se revivió.
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
- **LA FÓRMULA DEL PLIEGO** `[usuario 2026-08-31, cierre]`: *"los cartones deberían
  costar todos lo mismo considerando su múltiplo"* — el pliego vale ~$1.068 ($89 × 12)
  y el precio unitario = pliego ÷ posiciones. El pedido mínimo delata las posiciones
  (12.000 → 12 por pliego, etc.). **Toda la marca Chef pasó a 16 por pliego → $66,75**
  (salvo los de 25 → $42,72 y 30 → $35,60 — de ahí el $35,50 del 120). Esto PISÓ las
  "Medidas A/B/C" ($63,09/$106,67/$79,57) que eran precios de may-2024, y el
  "Pelapapas Chef" $72,85/$89: los 28 cartones Chef quedaron a $66,75.
- 706 y 700 ya NO van en skin `[usuario]`: cartón Chef común $66,75. El 546 va formato
  huevo $48 (NO los $89 de la hoja Costos). El 550 va $89 y **1 cartón por unidad**
  (la receta tenía ÷25 de la sesión bombillas — corregida a ×1, pendiente #2 del
  handoff saldado). El 516 va SUELTO (ni bolsa ni cartón, solo caja) → discontinuo.
- **CERRADO 85/85**: 81 con precio real + 4 discontinuados (574, 119, Skin 506, 516).
- **POR CATEGORÍA, no por precio suelto** `[usuario, cierre del día]`: los formatos
  viven en la tabla maestra `GP2.carton_formato` y cada cartón apunta con
  `componente.carton_formato`: **C** = 12/pliego $89 · **Loke** = 16/pliego $66,75
  (aunque lo use Chef) · **Huevo** = 25/pliego $42,72 · **8** = 30/pliego $35,60.
  Sube el pliego → se recalculan las 4 tarifas y listo. Asignados: C×29, Loke×28,
  Huevo×10, 8×3. Sin formato quedaron 15: los pelapapas $79 (¿categoría propia o
  es C con tirada de 30.000?), las bolsas ($63) y los pliegos skin ($147,97) —
  preguntar. OJO: `codigo_multiplo`/`min_codigo_x_multiplo` de la tabla maestra se
  cargaron con el pedido mínimo (12.000/16.000/25.000/30.000) y 1 — semántica a
  confirmar, la puso esta sesión `[deducido]`.
- `[usuario 2026-09-01]` **Bolsa de cartón embolsado** = paquete de paquetes. Cada
  bolsa tiene N paquetes según el formato (todos los paquetes = 250 uni): **Huevo**
  2000 uni/bolsa = 8 paq · **8** 3000 uni/bolsa = 12 paq · **C** 1000 uni/bolsa = 4
  paq · **LOKE** 1000 uni/bolsa = 4 paq. Guardado en columna nueva
  `GP2.carton_formato.uni_x_bolsa` (Pliego/Bolsa = NULL, no son cartón formal). En
  Recepción: **el remito se anota en PAQUETES** (lo que dice el proveedor), pero **el
  control físico se cuenta en BOLSAS** (más rápido que contar paquete por paquete).
  La RPC `guardar_control_cartones` acepta `bolsas` o `paquetes` por ítem y calcula
  `total_uni = bolsas*uni_x_bolsa` cuando aplica.

### Auditoría del 2026-08-31 (5 agentes) — ver `AUDITORIA_GP2_2026-08-31.md`

Hallazgos que cambian reglas de la casa (el detalle completo, con queries y números, está
en ese archivo):

- `[dato]` **`carton_formato.pliegos_multiplo` = múltiplo del PEDIDO TOTAL** (12.000 /
  16.000 / 25.000 / 30.000), NO posiciones por pliego. Está en `REGLAS_OC_INSUMOS.md` y lo
  usa `OC_GP2.html` para validar. Esta sesión lo interpretó mal y creó `Loke` (duplicado
  case-sensitive de `LOKE` — el nombre es la PK) rompiendo la validación de 38 cartones.
  **Corregido el mismo día.** Lección: antes de cargar una maestra, leer para qué la usa la
  OC, no solo cómo se llaman los campos.
- `[dato]` **Lo que neutraliza un placeholder es marcar `estado_compra`, no borrar la
  fila.** Los 37 placeholders vivos: 22 inertes (fabricacion/discontinuo), **13 con estado
  NULL que SÍ contaminan** a $1.535 la pieza → $47,8 M/mes de costo ficticio, el doble del
  valor de todo el stock. Los peores: C13, BOM13, BOM14, BOM8, BOM12, GRJ5.
- `[dato]` **`v_costo_componente.faltan_tiempos` no detecta el tiempo en CERO**, solo NULL.
  Hay 34 matrices en 0 usadas en rutas → 23 componentes con mano de obra $0 y el semáforo
  diciendo "todo bien". No usar ese contador como garantía hasta arreglarlo.
- `[dato 2026-08-31, RESUELTO el mismo día]` **La REGLA DE ORO ahora SÍ está garantizada
  por el modelo.** Antes `precio_servicio_pieza.proceso` era texto libre que ni siquiera
  participaba del join, y la tarifa del niquelado estaba repetida en 17 filas. Ahora:
  maestra **`GP2.proceso`** (11 procesos, con FK desde `precio_servicio_pieza`) y
  **`GP2.tarifa_servicio`** (proveedor + proceso + precio, UNIQUE) con las 6 tarifas planas
  que estaban repetidas en 33 filas. La fila por pieza quedó diciendo QUÉ proceso le toca;
  el PRECIO sale de la tarifa. **Precedencia en la vista**: tarifa por kg de la pieza →
  precio por unidad de la pieza → tarifa por kg del proceso → tarifa por unidad → plano.
  Pedernera se queda con tarifa por pieza (cobra distinto cada una, 35 tarifas), Jade y
  Ximpa por unidad. **Probado**: subir el niquelado de $2.606 a $3.000 revaloriza **31
  componentes de una sola vez** (V1 pasa de $0,912 a $1,05 = 3.000 × 0,35 g), y la
  migración no movió ni un peso (0 de 538 componentes cambiaron de costo).
- `[dato]` **El precio del cartón sigue cocinado en 73 filas**: `carton_formato` no tiene
  columna de precio, así que "sube el pliego y se recalculan las 4 tarifas" todavía no es
  verdad. Falta `precio_pliego` + `posiciones_x_pliego`.
- `[dato]` **`precio_proveedor` no tiene FK al proveedor** (solo `cod_prov` text sin
  destino). Trampa activa: los 9 precios de Recicor son referencia con fecha MÁS NUEVA que
  los vigentes del Plata; si alguien los vincula a un componente, las 9 cajas cambian de
  proveedor solas. Hoy el único discriminador es una mayúscula en `rubro`.
- `[dato]` **Dos agujeros de escritura anónima**: `GP2.empleado` (policies INSERT/UPDATE
  `TO anon` — no se puede cerrar sin migrar antes `Produccion/abm_GP2.html`, que escribe
  directo) y `GP2.inv_delta` (RPC anon que escribe inventario salteando `movimiento`, sin
  auditoría; ninguna pantalla la llama).
- `[dato]` **Si la receta lista un componente que no es el último de la ruta, todo lo que
  sigue queda en consumo 0** (la vista siembra desde la receta y camina hacia atrás).
  Casos: E6-M194 (570/858), D5/D6-M78 (507), B1/B2-M78 (707).
- `[dato]` **Los flejes redondos sin matriz de corte no convierten a kg** → máximo null →
  **la OC no los pide**: C3, E4, E5, E1 (~478 kg/mes). El peso está cargado en
  `fleje_detalle`; la vista podría usarlo directo cuando no hay matriz.
- `[dato]` **La suite de tests quedó ciega**: 29/29 pasan, pero todos stubean Supabase. El
  bug del clavo en la OC pasó sin despeinarse porque el stub no tiene `precio_por_kg`.
- `[usuario 2026-08-31, RESUELTO]` **LA MATRIZ 501 (afilado de cuchillas) SE MIDE EN KG,
  no en unidades como el resto.** Dicho textual: *"501 es la matriz del afilado de
  cuchillas. Se mide en kg, no en uni como el resto"*. Sus 7.650 segundos son **por KILO
  procesado**, no por pieza — por eso Z23/505/513/713 costaban 329 veces de más y
  arrastraban el 70% del pedido de toda la fábrica.
  **El dato no estaba mal: le faltaba decir en qué se mide.** Ahora la matriz lo declara:
  columna **`matriz.tiempo_unidad`** (`'uni'` por defecto, `'kg'` en la 501) y el motor
  multiplica por el peso vivo de la pieza que sale del paso. Z23: 7.650 × 0,0043 kg = 32,9 s
  de afilado + 1,3 s de las otras matrices = 34,2 s → $68,39 de mano de obra, y el costo
  pasa de **$15.349,70 a $115,49**. Verificado con snapshot: cambiaron exactamente esos 4
  componentes y ninguno más de los 538.
  **El máximo por sector cayó de $2.608 M a $678 M** y el stock de $23,0 M a $13,9 M.
  Regla que deja: antes de dar por malo un tiempo raro, preguntar **en qué unidad se mide**.
- `[dato]` **`inventario.maximo` no significa lo mismo en toda ubicación.** Solo los de
  `maximo_origen` est_madre / cinco_cajones / fisico tienen dueño; los de tallerista y
  Virgilio están en NULL, heredados. `v_valor_pedido` los suma todos → cuenta el mismo
  requerimiento hasta 5 veces: **$1.556 M, el 56% del pedido**. Decisión pendiente: ¿el
  máximo por sector incluye reponer lo que está en poder de terceros? SÍ: va todo el circuito.
- `[dato]` **Un fleje puede tener el máximo cargado en PIEZAS**: C3 (25.200 en IJUPA), E4 y
  E5 (9.000 en Alex) — el fleje se stockea en kg y sus máximos legítimos son ~2.900 kg.
  Regla: si un fleje tiene máximo en ubicación de tallerista, sospechar.
- `[dato]` **El patrón de ruta "Insumo X → Art" no lo ve el motor de costos**: el paso de
  tallerista guarda `comp_entrada_id = NULL` (366 pasos, 88 terminados). Los terminados hay
  que costearlos por RECETA, no por walk — que es lo que ya dice la cascada de 2c.
- `[dato]` **`precio_servicio` (el plano) quedó entero en 1 USD** — nunca se pisó, porque
  los reales fueron a `precio_servicio_pieza`. Vale $49 M de pedido inventado en Z22, B12 y
  V18D, y mete pesos en la columna dólares.
- `[dato, verificado]` **Las rutas alternativas NO duplican el material** (G7 con y sin M77
  da US$0,14866 exacto). Los casos de "fleje contado dos veces" son dos piezas distintas
  del mismo fleje y están bien.
- `[usuario 2026-08-31, RESUELTO]` **TODOS los cuchillos de untar van en blister de 2**:
  los de mango de madera (519 Loeke / 719 Chef) y los de mango plástico (551 / 878). Se
  duplican hoja, arandela y mango; el **cartón y la caja NO**, porque el blister es uno
  solo. Estaba a medias: el 519 tenía dos hojas con un solo mango y el 719 no tenía el ×2
  en ningún componente. Corregidas las 4 recetas. La verificación cierra sola: E8 consume
  1.990/mes y sus dos mangos (PA4 rojo 1.420 + PA5 Chef 570) suman exactamente eso.
  **`[usuario 2026-08-31]` LAS DOS HOJAS SON DE ACERO INOXIDABLE** — lo plástico o de
  madera es el MANGO, nunca la hoja. Y son piezas distintas de verdad, con **distinto
  fleje y distinta matriz** `[dato, verificado]`:
  · **E7** (mango madera, 6,5 g) sale del **Fleje N° 41 / B2** — Aperam inox 430 **1 × 84**
    US$ 2,26/kg — por la matriz **348 "Corte Cuch Untar Mgo Madera"**.
  · **E8** (mango plástico, 11,3 g) sale del **Fleje N° 74 / F10** — Aperam inox 430
    **0,80 × 64** US$ 2,33/kg — pasa por la 347 y después por la **119 "Estampado
    Cuchillo Untar"** (3,2 s).
  O sea: misma familia de material (inox 430 de Aperam) pero otra medida de fleje, otro
  peso y otra matriz. **Nunca llamarle "hoja plástica" a E8.**
- `[dato 2026-08-31, arreglado]` **El modelo de seguridad quedó parejo**: la única
  escritura anon que quedaba (`GP2.empleado`) pasó por RPC — `empleado_guardar` /
  `empleado_activar`, SECURITY DEFINER, validan legajo único — y `Produccion/abm_GP2.html`
  las usa. `inv_delta` revocada (ojo: el EXECUTE estaba en **PUBLIC**, revocar a anon no
  alcanzaba). **Regla: una pantalla nueva NUNCA escribe una tabla directo, va por RPC.**
- `[dato 2026-08-31]` **`registrar_evento_prod` lee `matriz.tiempo_historico` para calcular
  el PREMIO del operario.** Por eso los 34 tiempos en cero NO se pasaron a NULL aunque eso
  encendería el semáforo de la valorización: 0 y NULL no se comportan igual en esa cuenta
  y el riesgo cae sobre la plata de la gente. El arreglo de fondo es medir esas matrices.
- `[dato]` **5 raíces huérfanas en Sector Procesado** costando $0: D1 (Espiral Sacacorcho),
  Z23A, Z23B, Z25A, Z25B. Son compradas sin precio ni estado — el caso C13 sin resolver.
  Ojo que **D1 existe además como Fleje N°28**.

### Placeholders que quedan (17 vivos, listados — no inventar)

Flejes D7 (EstaMetal sin lista), F12, Z19A · C13 bastidor importado (sin precio aún) ·
remaches CV13/CV14/CV16/CV18D y V10/V11/V14 (**OJO V10 y V11: no tienen ruta
CV→V de niquelado — falta crearla y marcarlos fabricacion como sus hermanos**) ·
BOM12/BOM8/BOM13/BOM14 + GRJ5/GRJ6 (Cimarrón, sesión bombillas) · servicios: B12/Z22
llavero pie (ningún pintor lo lista — pendiente por decisión del usuario) · pesos
dudosos A9 (21 vs 39 g) y W7P (0,7 vs 2,2 g). Modelado pendiente: partir el clavo
niquelado (patrón remaches), cantidades por paso en armados N→1, cartones
compartidos para la OC.

## 2c-ter. Alimentador vs balancín: un tiempo no se lee solo (2026-08-31)

`[usuario 2026-08-31]` Dicho textual: *"Necesito separar qué matrices se hacen en el
alimentador y qué matrices se hacen en balancín. El balancín tarda entre 6 a 10 segundos
por matriz como mínimo, y el alimentador es un golpe por segundo. Cuando me envíes un
tiempo, decime si es de alimentador o de balancín."*

**El dato ya existía en la casa del vecino y no lo teníamos**: `public."Matrices"` tiene
la columna `Tipo_Matriz` con una letra por matriz. Los promedios confirman que la letra
significa lo que parece `[dato, verificado]`:

| Letra | Máquina | Matrices en GP2 | Segundos promedio |
|---|---|---|---|
| **A** | **Alimentador** (un golpe por segundo) | 43 | **1,53** (máx 3) |
| **B** | **Balancín** | 59 | **7,41** |
| **D** | **Balancín** también `[usuario]` | 11 | 13,16 (6,2 a 21,5) |
| **P** | **Piedra** — es la 501, y en el vecino se llama "Piedra (TP)" | 1 | por kg, ver arriba |

Copiado a GP2 en `matriz.tipo_matriz` (la letra cruda) y `matriz.maquina`
(`alimentador` / `balancin` / `piedra`, con CHECK). **No se inventó nada: es el dato del
vecino con el mapeo que dio el usuario.** En el vecino hay además 90 matrices tipo `E` y
22 tipo `T` que GP2 no usa.

**Para qué sirve**: un tiempo de balancín y uno de alimentador **no se comparan entre sí**.
Al informar un tiempo hay que decir de cuál es. Y el patrón que se ve: **se corta en
alimentador y se da forma en balancín** — las de "Corte" son casi todas A (la 348 Corte
Cuch Untar Mgo Madera, la 347, la 62), las de estampado/doblado/aplastado son B (la 119
Estampado Cuchillo Untar).

`[dato]` **Los 34 tiempos en cero se explican por acá**: 20 son de alimentador y 14 de
balancín, y varias nunca registraron producción. La **348**, por ejemplo, no tiene **ni un
registro** en ninguna de las cuatro tablas de producción del vecino (espejo de este año,
espejo histórico, Registros Históricos y Registros Producción Cervantes): su tiempo está
en 0 porque nunca se midió, no porque se haya perdido.

`[dato]` La única matriz sin clasificar es la **`S/N`** ("Corte Arandela Cuchillitos", 2
pasos de ruta): no tiene número y no existe en el vecino.

## 2c-quater. GOLPE ≠ UNIDAD: la trampa que puede duplicar todos los tiempos (2026-08-31)

`[usuario 2026-08-31]` Dicho textual: *"Hay matrices que expulsan más de una unidad. El
segundo por unidad, lógicamente, tiene que ser segundos por unidad, y el segundo y pico que
me dijeron yo entiendo que es por el GOLPE, no por la unidad."*

**Son tres cosas distintas y hay que no confundirlas nunca:**

| Concepto | Qué es | Dónde vive |
|---|---|---|
| **segundos por golpe** | lo que tarda la máquina en dar un golpe | **no está en la base** — es lo que dicen los operarios ("un segundo y pico") |
| **unidades por golpe** | cuántas piezas salen de ese golpe (1, 2, 4…) | `matriz.uni_x_golpe` — **cargado el 2026-08-31** (abajo) |
| **segundos por unidad** | `seg_x_golpe ÷ uni_x_golpe` | `matriz.tiempo_historico` ← **es lo que usa el costo** |

**La trampa**: `tiempo_historico` está verificado como **segundos por UNIDAD** (§2c: en el
espejo, `Segundos_Historico = Uni × Tiempo_Historico` exacto). Si alguien carga ahí un
tiempo **por golpe** de una matriz que saca 2 piezas por golpe, **el costo de mano de obra
de esa pieza sale al doble** y nada avisa. Es el mismo tipo de error que la 501 (un número
correcto en la unidad equivocada).

`[dato 2026-08-31]` **`uni_x_golpe` YA ESTÁ CARGADO** (antes estaba vacío: 113 matrices en
0 y 2 en null; en el vecino sigue vacío, 373 en 0 + 38 en null). Salió del archivo que pasó
el usuario, `Conteo_Gral_FLEJES_y_Alambre.xls`, hoja **"Consumo KG x Art"**, columna
**"Uni x Golpe"** (col. 14). El dato del Excel viene por *(fleje, pieza)* y se ancló a la
**matriz que corta ese fleje**, que es donde está el contador. Quedaron **17 matrices con
factor > 1** y 98 en 1:

| Factor | Matrices |
|---|---|
| **4** | m16 Corte Arandela manguito (fleje 38 / D4) |
| **3** | m71 Arandela Grande Afila (10 / F2) · m344 Arandela Base (74 / F10) · mS/N Arandela Cuchillitos (38 / D5) |
| **5** | m72 Arandela Chica Afila (10-11 / F2) — **resuelto abajo**: la hoja buena dice 5, el bloque del final está corrupto |
| **2** | m7 Cuchilla Abrelatas (2/C7) · m20 Engranaje Gr (3/B8) · m21 Buje 501 (4/C9) · m22 Arandela fina 501 (5/D6) · m15 Arandela fina 502 (5/D6) · m14 Engranaje chico (8/A10) · m40 Sacatapita (25/C1) · m60 Pinza Fideos (39/A4) · **m64 Pinza Fiambre (40/A4)** · **m348 Corte Cuch Untar Mgo Madera (41/B2)** · m66 Pinza Ensalada (45/F5) · m29 Corte Uña (57/B4) · m116 Corte de Aleta (92/C2) |

**Cómo leer la columna sin equivocarse**: la hoja tiene DOS columnas parecidas, *"Uni x Art
Term"* (col. 13, cuántas piezas lleva el artículo) y *"Uni x Golpe"* (col. 14). Coinciden en
215 filas y difieren en 85 — no son la misma cosa. Ejemplo que lo separa: *Hoja C Untar Mgo
Plast* (F10) lleva **2 por artículo** (blíster de 2) pero sale **1 por golpe**; *Hojita Cuch
Mad* (B2) lleva 2 y también sale 2 por golpe. El bloque final de la hoja (filas de kits, sin
sector) tiene la col. 13 pisada con el valor de golpe — **no usar ese bloque**.

**Caso 348 RESUELTO**: saca **2 unidades por golpe**. Entonces el *"segundo y pico"* que le
dijeron al usuario es **por golpe** → **≈ 0,6–0,75 s por unidad**, que es lo que va en
`tiempo_historico`. Sigue sin cargarse hasta que el usuario confirme el número exacto, pero
ahora ya se sabe por cuánto hay que dividir.

**Pinza de fiambre: GP2 la tenía mal modelada y se corrigió** — ver §2c-quinquies.

**Arandela chica de afilar (m72): queda en 5, y el archivo lo demuestra.** El Excel se
contradice — la hoja principal dice *8 por artículo / 5 por golpe* y el bloque del final
dice *3 / 3* para los mismos artículos (504 y 97). **Gana la hoja principal**, por dos
pruebas:

1. **El bloque del final tiene la columna 13 pisada.** Se ve con la arandela **grande**, que
   va justo al lado: la hoja principal dice *6 por artículo / 3 por golpe*, y el bloque del
   final dice *3 / 3*. Ese 6 → 3 es un dato que sabemos que está mal, y demuestra que ahí la
   columna "Uni x Art Term" quedó pisada con el valor de golpe. El 3 de la chica en ese
   bloque es, muy probablemente, el mismo 3 arrastrado de la grande.
2. **La hoja principal cierra sola.** `KG x Uni c/Desp = Peso Neto ÷ (1 − Desperdicio)`, y da
   exacto en las dos: grande 0,00495 ÷ (1 − 0,2703) = **0,0067835** ✓ y chica 0,00172 ÷
   (1 − 0,28234) = **0,0023967** ✓. El bloque del final **no tiene ni peso neto ni
   desperdicio** (columnas vacías): no se puede verificar nada de ahí.

**Regla que deja**: cuando el Excel de flejes diga dos cosas distintas, ganar la fila que
tenga **peso neto y desperdicio cargados** — es la que se puede verificar con la cuenta.

### La app YA pide GOLPES (2026-08-31)

`[usuario 2026-08-31]` Dicho textual: *"Yo quiero que ellos anoten golpes, que es lo que
dice el contador que tienen en la matriz que está puesta, o en el alimentador o en el
balancín. Entonces, en función de la cantidad de golpes que ellos hagan para calcular las
unidades que fabricaron, se multiplica automáticamente con un factor que vos tengas
normalizado dentro de tu base."*

Es la **regla de oro** aplicada a la producción: el operario anota el dato **crudo** que ve
(golpes del contador) y el factor vive **en la base, en un solo lugar**. El día que se
cambia una matriz se toca `matriz.uni_x_golpe` y no hay que reeducar a nadie ni corregir
registros viejos.

- **App de operarios** (`Operarios_GP2.html`): el botón **C (Cajón)** ahora dice *"Ingresa
  los GOLPES del contador"* y debajo del campo se ve en vivo *"Matriz 348: cada golpe saca 2
  unidades. 240 golpes = 480 unidades."* En las matrices de factor > 1 pide **confirmación**
  antes de mandar (es donde vive el riesgo de que tipeen unidades por costumbre).
- **Registro Producción** (`Registro_GP2.html`): campo **Golpes del contador** + campo
  **Unidades producidas** de sólo lectura que se calcula solo.
- **BD**: `registrar_evento_prod` y `registrar_produccion` aceptan `golpes` y hacen
  `uni = golpes × matriz.uni_x_golpe`. `produccion` guarda **las tres cosas**: `golpes` tal
  como los tipeó el operario, `uni_x_golpe` (**foto del factor** al momento del registro, así
  cambiar el factor mañana no mueve la producción vieja) y `uni`. Si el payload NO trae
  `golpes` (app vieja en un celular sin actualizar), se comporta **exactamente como antes**.
- **Interruptor**: `GP2.parametro.registro_en_golpes` ('1' pide golpes, '0' vuelve a
  unidades directas). Está por la duda de planta de abajo — se cambia una fila y la app
  entera vuelve atrás sin tocar código.

**Por qué esto además ARREGLA el premio**: `tiempo_toma = segundos ÷ unidades` y
`tiempo_historico` es por unidad. Si el operario contaba golpes en una matriz de 2, las
unidades registradas eran la mitad, el `tiempo_toma` el doble y el premio salía mal **en
contra del operario**. Verificado con rollback: 240 golpes en la 348 con 300 s dan 480 uni y
`tiempo_toma` 0,625 s/uni (no 1,25). `[dato]` `GP2.produccion` está **vacía** (0 filas), así
que no hay historia que migrar.

**Duda abierta `[usuario, va a confirmarlo en planta]`**: si hoy los operarios cuentan
golpes o unidades. *"Ahí tenemos una duplicación de unidades en todos lados que nos va a
confundir si es que lo hacen mal."* La app ya está del lado de los golpes y el aviso en
pantalla dice la cuenta en voz alta; si en planta resulta que cuentan unidades, se apaga con
el interruptor.

## 2c-quinquies. Pinza de fiambre: UN corte y DOS estampados (2026-08-31)

`[usuario 2026-08-31]` Dicho textual: *"La pinza fiambre se corta en alimentador con la
misma matriz y después se estampa con dos diferentes (una para cada lado). 63 estampa la
derecha, 65 la izquierda."* Y confirmó: **corta la 64**.

**Lo que GP2 tenía mal**: modelaba **dos cortes**, uno por lado, cada uno con su propia tira
intermedia:

```
MAL:  A4 --m62--> A4-M62 --m63--> F9  (derecha)
      A4 --m64--> A4-M64 --m65--> F10 (izquierda)

BIEN: A4 --m64--> A4-M64 --m63--> F9  (derecha)
                        \--m65--> F10 (izquierda)
```

Es **exactamente la forma que la pinza de fideos ya tenía bien** (m60 corta → m61 der /
m75 izq). Las dos gemelas quedan iguales.

**Qué se corrigió**: las 4 rutas de fiambre (130/132 art 595 y 53 por la derecha,
131/133 por la izquierda) pasan por la 64; el componente intermedio **A4-M62 se borró**
(no tenía stock, ni movimientos, ni recetas, ni precios — era puro producto del modelado
equivocado); la **64 se renombró** de *"Corte Pinza Fiambre Izquierda"* a **"Corte Pinza
Fiambre"**, porque ya no corta un lado sino la pieza entera; y **`uni_x_golpe = 2`**, que es
lo que decía el Excel y ahora cierra: un golpe saca las dos punteras.

**La 62 NO se borró** — la matriz física existe, pero `[usuario 2026-08-31]` está
**inactiva**. Se agregó `GP2.matriz.activa` (boolean, default true) y la 62 quedó en `false`:
las apps **no la ofrecen** en el buscador de matrices ni la aceptan tipeada ("está dada de
baja, no se usa más"), pero sigue en el diccionario para poder ponerle nombre a un registro
viejo. Es la única matriz inactiva de GP2.

**Impacto en el costo — el error valía plata**: el artículo 595 (y su gemelo 53) pasó de
**$353,08 a $270,46**. Contaba **la tira dos veces**: al salir F9 y F10 de tiras distintas,
el recorrido de costos sumaba dos cortes de fleje para una pinza que sale de **uno solo**.
Cambiaron exactamente esos 2 artículos y ninguno más de los 537 componentes.

**Cómo se detecta este error en otro lado**: si dos piezas que van juntas en el mismo
artículo salen de **tiras intermedias distintas** (`X-M##`) pero en la planta salen del
mismo golpe, el material está duplicado. Señal de alarma: dos matrices de corte con el mismo
fleje de entrada y el **mismo costo exacto** (A4-M62 y A4-M64 daban los dos US$ 0,083693).
`[dato]` Se barrió el resto de GP2 buscando matrices con "Derecha/Izquierda/Der/Izq" en el
nombre y **la de fiambre era la única mal modelada**.

**Verificación que cierra**: 594 (fideos) y 595 (fiambre) quedaron con la misma estructura,
US$ 0,094316 y US$ 0,096879 de material. La diferencia que queda ($304,52 vs $270,46) es
**sólo mano de obra**: fideos tiene 19 s cargados (m60 3 + m61 8 + m75 8) y fiambre tiene 0
porque la 63, la 64 y la 65 están entre las 34 matrices sin tiempo medido.

## 2c-sexies. Tiempos de la pinza de fiambre: qué tiene el vecino (2026-08-31)

`[dato 2026-08-31]` Se buscó en **las 4 tablas** del vecino. Resultado:

| Matriz | Maestro `Matrices` | `db_n8n_espejo` (+histórico) | `Registros Historicos` |
|---|---|---|---|
| 62 Corte Fiambre Der | 0 | — | — |
| 63 Estampado Fiambre Der | 0 | — | — |
| **64 Corte Fiambre** | 0 | — | **17 registros, ago–sep 2025** |
| 65 Estampado Fiambre Izq | 0 | — | — |

O sea: **63 y 65 no tienen ni un registro en ningún lado**. La 64 sí, pero **no sirve como
está**: de los 17 registros, **5 están anulados** (`Anular_Tiempo = true`) y los 12 que
quedan van de **9,3 a 50 s por unidad** — una dispersión de 5x. Los mejores son las tandas
largas de un mismo operario (394, 553, 387 y 670 uni): **9,3 / 11,2 / 11,4 / 14,1**.

**Lo que NO cierra y hay que resolver antes de cargar nada** `[pendiente]`: la 64 es
**alimentador** (tipo A en el vecino) y el usuario dijo que el alimentador va a **≈1 golpe
por segundo**; sacando 2 por golpe eso daría **~0,5 s/uni**, no 9–14. Y su **gemela exacta**,
la m60 *Corte Pinza Fideos* — mismo fleje A4, mismo alimentador, misma operación, también 2
por golpe — mide **2,30 s/uni** en el espejo (12 registros, 12.009 uni). La 64 daría **4 a 6
veces más lenta que su gemela haciendo lo mismo**. Alguna de estas tres es cierta y hay que
saber cuál: (a) el operario cargaba **cajones o golpes** en vez de unidades, (b) esos
registros de 2025 no son de esta operación, (c) la 64 realmente tarda eso.

`[dato]` Tiempos reales de la gemela, por si sirven de referencia mientras tanto — **medidos,
no los del maestro**: m60 corte **2,30** s/uni (maestro dice 3) · m61 estampado der **11,02**
(maestro 8) · m75 estampado izq **10,49** (maestro 8). Los tres estampados de balancín dan
~10-11 s, que sí cierra con "el balancín tarda 6 a 10 segundos" (§2c-ter).

## 2c-septies. El 506 va con SKIN: Gentile y el garage (2026-08-31)

`[usuario 2026-08-31]` Dicho textual: *"El 506 va con skin (o sea con Gentile y con
Martin/Carlos entregando en Cervantes garage)"*. Es el **mismo patrón de las bombillas
557/558** (§ del garage): quien arma entrega el cuerpo en el garage y **Gentile hace el
skin, que ES el packaging**, y de ahí sale a Virgilio.

```
ANTES:  partes -> Martin/Alex ------------------------> 506 -> Virgilio   (+ cartón $89)
AHORA:  partes -> Martin/Alex -> GRJ7 (garage) -> Gentile -> 506 -> Virgilio
        skin V3A ------------------------------> Gentile -> 506 -> Virgilio
        caja A11 ------------------------------> Gentile -> 506 -> Virgilio
```

**Las piezas YA existían sueltas y sólo había que conectarlas**: `GRJ7` *"Abrelata Uña 506"*
(Sector Garage) estaba **sin BOM, sin ruta y sin receta**, y `V3A` *"Skin 506"* estaba
marcado **discontinuo**. Ahora GRJ7 = A10 + C10 + V9, la receta del 506 es **GRJ7 ×1 +
V3A ×1 + caja ×1/12** (las partes sueltas y el cartón salieron), y las 8 rutas de partes
pasan por Gentile.

### `[usuario]` CARLOS = ALEX ESCALANTE — la misma persona
Dicho textual: *"carlos = alex, dejámelo decirte así y vos entendé que hablo del mismo"*.
Cuando el usuario dice **"Martin/Carlos"** habla de **Martin Cornejo + Alex Escalante**, que
son justo los dos que ya tenía el 506: **no hubo que cambiar ningún tallerista**. Cargado en
`contraparte_alias` ('Carlos' → tallerista 2). `[pendiente]` GP2 tiene además un tallerista
**"Carlos Aguirre" (id 9, 32 pasos)** — preguntar si es otra persona o un duplicado del
mismo; **no se fusionó nada**.

### El precio del skin: pliego + autoadhesivado
`[usuario]` *"el pliego de cartón es de $768 (pero hay que sumar el costo del
autoadhesivado)"*. O sea el skin **no** son los $89 del cartón común. Por la **regla de oro**
los dos costos tienen que vivir separados (cambia el autoadhesivado → se toca un número).
`[pendiente]` faltan **el costo del autoadhesivado** y **cuántos 506 entran por pliego**;
hasta que lleguen, **V3A quedó SIN precio** (cuenta en `faltan_precios`) en vez de inventar
uno. También falta **cuánto cobra Gentile el envasado del 506** (el de bombillas es $69/uni).

### Lo que se encontró de paso
- **V9 "Remache uña niq." tenía un placeholder de 1 USD** en `precio_proveedor` que inventaba
  **$1.535 por unidad** en cuanto V9 entraba por BOM en vez de por ruta: GRJ7 daba $1.795,93.
  Borrado el placeholder, GRJ7 = **$260,93**, y V9 conserva su costo real por ruta ($4,45 del
  remache + $1,48 de niquelado = $5,93). Snapshot de los 537 componentes: **no cambió ningún
  otro**. `[dato]` **quedan 35 placeholders de 1 USD** en `precio_proveedor` — la auditoría
  había limpiado los de `precio_servicio`, estos siguen ahí y muerden igual.
- `[dato]` **16 filas de `v_valor_stock` tienen stock NEGATIVO, por −$7.274.776.** Explican
  por qué el stock total neto da $8,6M. Sin relación con este cambio (GRJ7 y V3A tienen
  stock 0) — **pendiente de revisar aparte**.
- La **caja** ahora la arma Gentile, porque es quien entrega a Virgilio. `[deducido]` — el
  usuario no lo dijo; si la siguen poniendo Martin/Alex, se vuelve atrás.

### ⚠️ TRAMPA QUE MORDIÓ EN ESTE MISMO CAMBIO: buscar componentes POR CÓDIGO
El BOM de GRJ7 se cargó con `where codigo in ('A10','C10','V9')` y salieron **5 filas en vez
de 3**: `A10` es la pieza *"Cpo Uña LK C/M Pint."* (id 85) **y** el *"Fleje N° 8"* (id 174);
`C10` es *"Uñas Zinc."* (id 103) **y** el *"Fleje N° 62"* (id 208). Los dos flejes entraron
como si fueran partes del abrelatas. Corregido cargando por id.
**Los códigos de componente NO son únicos: siempre por `id`.** Es la misma regla que el
usuario dictó el 2026-08-30 para cargar precios, y se rompió igual — vale para TODO, no sólo
para precios.

## 2c-octies. El rollo depende de la PIEZA, no solo de la matriz (2026-08-31)

`[usuario 2026-08-31, con foto]` *"A15 usa un tipo de rollo (inox) y J2/J5 usa otro"*. Hay
matrices que **cortan de dos flejes distintos** según qué pieza salga:

| Matriz | Pieza | Fleje |
|---|---|---|
| **28** Corte Cuerpo Uña | A15 (Cpo Uña Crom.) | **Fleje N° 94 / F1A** (inox) |
| | J2 / J5 (Cuerpo Uña p/Pintar) | **Fleje N° 13 / A1** |
| **37** Corte Cuerpo Sacac. | F3-M37 | Fleje N° 22 / F3 |
| | F3A-M37 | Fleje N° 93 / F3A |

`[dato]` Barrido de `ruta_paso`: **son exactamente estas 2** las que cortan de más de un
fleje. Todo el resto es un fleje por matriz.

**El bug**: el bundle devolvía **UN solo fleje por matriz** (`matriz_fleje`,
`distinct on (n_matriz) order by c.id`), así que para la 28 ganaba siempre A1. El operario
que elegía A15 tenía que agarrar un rollo A1 igual, y **el descuento de stock salía del
fleje equivocado** (el común en vez del inox). No era cosmético.

**Arreglo**: `registro_operarios_bundle` agrega `matriz_fleje_pieza`
(`n_matriz → comp_salida_id → fleje`). La app:
- con **pieza elegida**, ofrece solo los rollos del fleje de esa pieza;
- en una matriz de 2 flejes **sin** pieza elegida, si la pantalla va a pedir la pieza
  (2+ salidas) espera a que la elija; si no la va a pedir, ofrece los rollos de **los dos**
  flejes con el código a la vista — nunca deja al operario sin ninguno;
- matriz de un solo fleje: igual que siempre (`matriz_fleje` de fallback).

`matriz_fleje` se mantiene para las matrices de un fleje y como respaldo si un celular corre
un bundle viejo.

## 2c-nonies. Un solo buscador de matriz (2026-08-31)

`[usuario 2026-08-31, con foto]` *"si puedo escribir arriba y busca, sacá lo de abajo"*. La
pantalla de operarios tenía **dos cajas de texto** para lo mismo: el campo *"Ingresa el
número"* (que ya filtra la lista por número **y** por nombre) y un *"Buscar por número o
nombre…"* debajo. Se sacó el de abajo (`#matrizSearch`); el filtro sale siempre del campo de
arriba.

## 2c-decies. Versiones y UX de la app de operarios (2026-08-31)

Varios pedidos del usuario sobre `Produccion/RegistroApp/Operarios_GP2.html` en una tarde:

- **Sin número de versión en pantalla** `[usuario]`: *"sacá el badge de versión... no hace
  falta que ahí haya un número de versión"*. Venía con versión propia (`1.9.0`) escrita en 3
  lugares (`?v=` del script, `MI_V` del auto-recargador, `APP_VERSION` del badge); al bumpear
  uno y olvidar otro el badge mentía y recargaba al pedo en cada celular. Ahora el badge
  `#syncBadge` es **solo estado de cola** (`✓ al día` / `⚠ N sin enviar`). Lo único versionado
  es el `?v=` del script (cache-busting, no a la vista) y el `MI_V` que lo sigue. El
  `test_tokens_cache` fija que no reaparezca una versión.

- **Un solo buscador** `[usuario]`: el campo *"Ingresa el número"* ya filtra la lista por
  número Y nombre; se sacó el `#matrizSearch` de abajo que era la misma cosa.

- **La lista colapsa en match exacto** `[usuario: "cuando elijo 1 no me muestres las demás"]`:
  si lo tipeado matchea EXACTO el número de una matriz, la lista muestra **solo esa** (antes,
  tipear "1" dejaba 1, 10, 11, 112...).

- **Rollos en BOTONES, no desplegable** `[usuario]`: `#rolloGrid` con botones `.rl` (kg grande
  + fleje · disponibles), mismo patrón que matriz/pieza. El elegido queda en `rolloSel` (antes
  el `value` de un `<select>`).

- **La pieza elegida va a la DERECHA del número de matriz y achica la pantalla** `[usuario]`:
  al elegir la pieza, la card de la matriz muestra un chip con el código de la pieza a la
  derecha (`.mz.has-chip` + `.mz-chip` "acá va el stock"), y el box amarillo de selección se
  **colapsa a una línea** ("Fabricás A15 · … — cambiar"). Tocar "cambiar" reabre el grid.


## 2c-undecies. Stock en Movimiento (Sector Tránsito): sin mín/máx ni carteles (2026-08-31)

`[usuario 2026-08-31, con foto]` sobre `StockMovimiento/StockMovimiento_GP2.html`:

- **Solo el botón "Atrás"** en el header: sacados "Exportar CSV", "Stock SC" y "Stock SP".
- **Sacados los dos carteles amarillos**: el explicativo ("Piezas entre matrices…") y el de
  factores ("De 43 componentes, 43 sin `kg_x_uni`…").
- **No van mínimo ni máximo**: se quitaron las columnas Mínimo/Máximo, el KPI "Bajo mínimo" y
  el filtro "Bajo mínimo". Se hizo con un flag `sin_min_max: true` en el `STOCK_CFG` de esta
  pantalla, honrado por el renderer compartido `gp2-stock-sector.js` (bumpeado a ?v=1.3.0 en
  las 9 pantallas que lo usan). **StockSC / StockSP siguen con min/máx** — verificado.

**Por qué el Sector Tránsito no tiene mín/máx ni `kg_x_uni`/`uni_x_cajon`** `[dato]`: son las
piezas **intermedias entre matrices** (los `X-M##`, "Fleje N° 13 tras M28"): una matriz ya las
cortó y la siguiente todavía no las consumió. Es **trabajo en curso transitorio**, no algo que
se stockea, se pesa por kilo o se guarda en cajones ni que se "repone" a un mínimo — por eso
esos campos nunca se cargaron y salían "—". El stock en **Uni** es correcto igual. Cargar
`kg_x_uni`/`uni_x_cajon` ahí sería inventar un dato que el negocio no usa.

## 2c-duodecies. La tarjeta de Recepción muestra SOLO la OC (2026-08-31)

`[usuario 2026-08-31, con foto, en dos pasos]` sobre `StockFlejes/RecepcionInsumos_GP2.html`.
Primero: **"está mostrando lo último que recibí, está mal"** — el número verde de la tarjeta
era la ÚLTIMA RECEPCIÓN (A1 decía "280 kg" = lo recibido ese día) y, sin etiqueta (la palabra
"ult." se había sacado el 2026-08-29 a pedido), se leía como si fuera el stock. Se probó
mostrar el stock real (v3.19.0, A1 "959,12 kg") y el usuario cerró la decisión: **"no quiero
el stock, solo la OC. Si no hay OC, nada ahí abajo"**. Desde v3.20.0 la tarjeta es código +
descripción + medida + **la OC abierta** ("OC: lo que falta + unidad") — y sin OC, nada
debajo de la medida. Al recibir, lo único que importa mirar es qué pedido está esperando ese
insumo; el stock se consulta en las pantallas de stock. Regla general que dejó el ida y
vuelta: **un número sin etiqueta en una tarjeta se lee como stock** — cualquier otra cosa
(última carga, consumo) lleva etiqueta sí o sí, o directamente no va. El bundle sigue
mandando `stock` (clave agregada hoy a `recepcion_bundle`, `GP2.inventario` en la ubicación
del sector del insumo) y `ultima` por si hacen falta, pero la tarjeta no pinta ninguno.

## 2c-terdecies. Limpieza de placeholders de 1 USD (2026-08-31)

`[usuario]` "los 35 placeholders de 1 USD que quedan". Barrio de una: **23 borrados, 12
quedan pendientes de precio real**.

### Borrados sin dato del usuario (23)

**A) 15 fabricados por ruta** (crudo + niquelado ya los costea, el 1 USD solo inventaba plata
apenas entraban por BOM en vez de ruta — mismo patron que V9 ayer):
V1, V2, V3, V4, V5, V6, V7, V8, V12, V18D (remaches propios niquelados) · CV13, CV18D (sus
crudos) · D7 (Fleje N° 50, sale de ruta) · GRJ5, GRJ6 (bombillas armadas en garage).

**B) 8 discontinuos** (no hay proveedor real):
C1B (Carton 574), I3B (Carton 119), L4B1 (Carton 516), PB1, CV17, CV20, V18C, V20.

Sobre V20 (Tornillo Corta Queso): sigue en 3 rutas (arts 119/574/809) pero los 3 estan
**discontinuados** — es coherente, no es huerfano.

### DESCUBRIMIENTO IMPORTANTE — el 1 USD costeaba mas de lo que parecia
7 componentes cayeron **$1.535 -> $0** al borrar el placeholder (G4, M1, CV13, CV18D, D7,
V18D, D7-M23). Estos NO tienen ruta que los produzca y NO tienen precio real: el 1 USD era
lo unico que los hacia "costar algo". Ahora `faltan_precios=1` los marca como incompletos,
que es la verdad. Cargar el precio real cuando venga.

### Pendientes de precio real (12 comprables)
- **Cimarron** `[usuario 2026-08-31]`: "a Cimarron NO le compramos BOM12, le compramos la
  BOMBILLA entera 557/558". VERIFICADO: no hay NINGUN precio de Cimarron en la base hoy.
  BOM12 (Cano Inox 140 mm), BOM8 (Resorte), BOM13 (Filtro), BOM14 (Precinto) son componentes
  intermedios de recetas — si vos comprás la bombilla armada, no son insumos de compra. Falta
  cargar el precio de la 557/558 armada como compra a Cimarron; los BOM* siguen usandose en
  las recetas de fabricacion propia si algun dia la hacemos.
- Z19A (Alambre Corta Queso, 546), F12 (Fleje N° 49), C13 (Bastidor Corta Queso), V10 (Rem
  Alum Canel), V14 (Remache Pinza), V11 (Rem Sacacorcho), CV14, CV16.

## 2c-quaterdecies. Tiempos de matrices derivados del vecino (2026-08-31)

`[usuario 2026-08-31]` "los tiempos que puedas sacar del vecino, sacalos". El agente
`gp2-auditor-costos` propuso el protocolo (mediana + IQR, filtros por máquina, exclusiones
por dispersión), la sesión principal ejecutó y verificó con snapshot antes/después.

**Método**: unión de las 3 tablas del vecino con producción — `db_n8n_espejo`, su
histórica (`_20260419`), `Registros Historicos`. Filtros: `Eliminar<>'S'`, `Anular_Tiempo`
false, `Uni>0`, `Segundos_Trabajados>0`. Cada registro da `seg/uni`. Sobre esos:

- **N usado**: solo tandas con `Uni >= 10` (las de <10 mienten mucho).
- **Mediana** (no promedio, resiste outliers).
- **Dispersión** = `IQR / mediana`. Si `IQR > 2 x mediana` → DUDOSA, no se carga.
- **Rango por máquina** (§2c-ter): alimentador 0,4–4 s/uni; balancín 4–12. Fuera de esos
  rangos = DUDOSA.

**CARGADAS (15)** — 34 activas sin tiempo → 19:

| Nº | Descripción | Máquina | N | Mediana s/uni |
|---|---|---|---|---|
| 14 | Corte Engranaje chico (uxg=2) | alim | 5/5 | 0,53 |
| 32 | Corte Cuerpo 3 en 1 | alim | 5/5 | 2,61 |
| 40 | Corte Sacatapita (uxg=2) | alim | 24/24 | 0,84 |
| 44 | Corte Cuchufli | alim | 7/7 | 1,06 |
| 68 | Corte Resorte U | alim | 6/6 | 1,41 |
| 137 | Cortar arandela Batidor | alim | 5/5 | 0,73 |
| 152 | Corte Pza Ch Sacaf Gast | alim | 4/4 | 2,10 |
| 153 | Corte Pza Grande Sacaf Gast | alim | 7/7 | 3,69 |
| 155 | Estampado Pza Ch Sacaf Gast | balan | 11/11 | 8,04 |
| 169 | Doblado Vast Pala Canelón | balan | 3/3 | 6,09 |
| 346 | Corte Vast Corta Pizza Gr | alim | 4/4 | 1,84 |
| 347 | Corte Cuch Untar Mgo Plast | alim | 7/7 | 1,37 |
| 355 | Corte Pala Canelón | alim | 6/6 | 3,02 |
| 365 | Corte Pza Gr Sacaf Pizz | alim | 5/5 | 2,41 |
| 366 | Corte Super Mariposita | alim | 12/12 | 2,00 |

**DUDOSAS (2)** — NO cargadas:
- **m64 Corte Pinza Fiambre**: mediana 25,58 s/uni. Confirmado lo de la mañana: cargaban
  golpes o cajones, no unidades. Su gemela m60 (mismo alimentador, misma operación) mide
  2,30. Sigue en 0 hasta cronometrar en planta.
- **m16 Corte Arandela manguito (uxg=4)**: mediana 0,26 s/uni, muy bajo para alimentador
  (piso 0,4). Sospecha simétrica a la 64: pudieron haber cargado unidades × 4 (o sea el
  golpe multiplicado). Como uxg=4 es el mayor de la fábrica, el ruido es mayor.

**Impacto medido**: 76 componentes movidos, todos hacia arriba, delta máximo $27,66 (art
508: corte engranaje chico + estampado 3en1). Ningún componente ajeno cambió — el snapshot
demostró que las cirugías previas siguen aisladas.

**Bug propio detectado**: el auditor `gp2-auditor-costos` no tenía `execute_sql` — su
frontmatter decía `mcp__Supabase__` pero el server real del proyecto es
`mcp__c1349a3b-...__`. Corregido en los 3 agentes que tocan la base. La sesión principal
tomó el protocolo (la parte útil) y ejecutó las consultas.

## 2e-bis. `minimo` y `maximo` no miden lo mismo (2026-09-02)

Se confundieron una vez, así que queda escrito:

- **`minimo` = lo que consumís.** `consumo_uni_mes × ubicacion.meses_minimo` (en flejes, kg).
  Lo calcula **`recalcular_minimos()`** (creada el 2026-09-02, idea 7211), el espejo de las
  de máximos que ya existían. Marca las filas que toca con `minimo_origen = 'consumo'`.
- **`maximo` = lo que entra.** En crudo/procesado es físico (5 cajones ×`uni_x_cajon`,
  `maximo_origen 'cinco_cajones'` o `'fisico'`); en los sectores de insumo sale de la Est
  Madre, que también es consumo (`consumo × meses_stock`, `maximo_origen 'est_madre'`).

**Por eso `minimo > maximo` puede ser correcto**: significa que en ese lugar **no entra lo
que gastás** en esos meses. Después del recálculo quedan **77 filas así**, todas de máximo
físico — el caso más duro es **V9 en Sector Remache**: mínimo 113.912, máximo 10.581,
consumo 28.478/mes, o sea que ahí entran **menos de 15 días** de remaches. No es un dato
para arreglar: es la planta, y el que compra tiene que saberlo.

**Lo que NO se hizo, a propósito**: se había propuesto "topar el faltante contra el
máximo". Mirando el código no corresponde — `oc_bundle` y `crear_oc` **no usan `minimo` ni
`maximo`** (la OC pide por `consumo × meses_stock − stock`), así que nunca pedían de más
por esto. El único que usa el mínimo es `faltantes_bundle`, y ahí la marca de faltante
**tiene que quedar prendida** en esas 77 filas: es verdad que falta. Topearla sería tapar
la señal.

**Cuidado al recalcular**: los mínimos son **carga original del usuario** (los 766 del
estado limpio). `recalcular_minimos()` por eso **no toca** las filas cuyo consumo es 0 o
desconocido — el número del usuario es mejor dato que un cero calculado — ni las de
tallerista y proveedor de servicio, que tienen otro origen. La foto previa quedó en
`GP2.inventario_minimo_backup_20260902` para poder volver atrás.

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

## 2i-ter. Módulo "Recepciones · Checklist Pagos" (2026-09-02)

`[usuario 2026-09-02]` *"Hace un módulo que reciba todas las recepciones de los insumos o de
los talleristas... aquí tengo un checklist de las facturas que tiene que cargar el sector
de pagos al sistema. Después vemos qué información le agregamos, mínima tienen que estar
los ítems que reciben y las cantidades, con el cod de prov y el cod de isis de cada item"*.
Pantalla nueva `Compras/Recepciones_GP2.html` alimentada por la vista
`GP2.v_recepcion_unificada` (UNION de `recepcion_insumo` + `entrega_prov_at`). Cada línea
trae `cod_prov` (código ISIS del proveedor: viene de `proveedor_insumo.cod_prov` para
insumos y de `proveedor_at.cod_prov` para talleristas — nuevo campo agregado a
`proveedor_insumo`, se llena a demanda) y `cod_isis` (código del componente/artículo).
Filtros: origen (Insumo/Tallerista/Todo), con/sin factura, rango de fechas, buscador
libre. KPIs con conteos y botón imprimir. Enlace en el menú, grupo Insumos, como secundario
(los 2 principales del grupo son y siguen siendo Órdenes de Compra + Recepción Insumos).
El sector Pagos usa esta pantalla como checklist antes de cargar las facturas al sistema.

## 2i-bis-800. Aclaración: la pinza chica 800 NO se importa (2026-09-02)

`[usuario 2026-09-02]` *"800 no la importa chef. es la misma que 560 pero de chef. ya lo
hablamos y ya te contesté esto"*. El artículo 800 es la **versión Chef** de la pinza chica
(el 560 es la versión Loeke); ambos comparten cuerpo N7, remache CV14 y proceso completo
(fabricación en Cervantes → Pedernera croma todo entero → Carlos Aguirre envasa y entrega
en Virgilio). NO hay componente "800_importado" ni proveedor Chef en la cadena de armado —
Chef es solo el cliente al que se le vende esa versión. **Cero cambios estructurales para
el 800**: sigue con las 4 rutas actuales (201 cuerpo, 458 remache CV14, 428 cartón O5A,
533 caja A8) todas rematando en Carlos Aguirre → virgilio, cruzando con Pedernera.

## 2i. Pinza Chica 560 (y 800): Pedernera croma + envasa + entrega (2026-09-02)

`[usuario 2026-09-02]` *"el proceso del 560 es largo, pero lo importante es que su
fabricación entera se hace en Cervantes y cuando ya está listo para cromar, se le manda a
Pedernera (el dueño es Carlos Aguirre) para que lo crome y él mismo (Carlos Aguirre) lo
envasa y entrega en Virgilio"* + *"este artículo se arma entero en crudo y se manda a
cromar entero"* + *"no existe V, V14 niquelado"*. **Clave**: Pedernera (proveedor de
servicio) y Carlos Aguirre (tallerista) son la MISMA persona / mismo taller — Cervantes le
manda el 560 crudo entero, él croma **todo junto** (cuerpo + remache + lo que lleve
adentro), envasa y lo entrega en Virgilio como 560 terminado.

**Consecuencia estructural**: el remache "V14 niquelado" NO existe como pieza aparte. Solo
existe CV14 (crudo). Todo lo que hoy se veía como "cromar el remache aparte" era ruido de
modelado. **Aplicado**:
- Componente V14 (id 283) BORRADO. articulo_componente 445 (560) y 461 (800): componente_id
  283 → 525 (CV14).
- Ruta 457 (art 560): se sacó el paso `proveedor_servicio` que "cromaba" el remache (era
  Guazzaroni CV14→V14) y quedó: `ingreso CV14 → tallerista Carlos Aguirre → 560 → virgilio`.
  El cromado del cuerpo+remache YA está en la ruta 200 (N7 → Pedernera → Carlos Aguirre →
  virgilio).
- Ruta 458 (art 800): mismo criterio, `insumo V14` cambió a `insumo CV14`.
- Precio CV14 = $4,4487 ARS (Excel `A_Costos_VIGENTES` hoja Costos, columna Remaches del
  560). Proveedor: Bella Vista (mismo que el resto de los remaches acá).

**Cruce Pedernera / Carlos Aguirre — artículos que él entrega en Virgilio**
`[usuario 2026-09-02: "pedernera/carlos aguirre... 544/802/580/560/700"]`:
- **544, 802, 580, 560**: ya correctos. Cadena típica: `Alex Escalante arma el GRJ10/10A/N7
  crudo → Pedernera Ilario croma → Carlos Aguirre envasa → virgilio`. Prov 544 en 4 rutas,
  802 en 4, 580 en 5, 560 en 4 — todas cruzan bien.
- **700 (Sacacorchos Cimarrón)**: NO cruza así hoy — hoy figura Jade (G2→B8) + Danica Garcia
  como entrega. Falta confirmación del usuario para reasignar el cromado y entrega a
  Pedernera + Carlos Aguirre y aclarar si el código de salida del cromado sigue siendo B8 o
  pasa a ser una sola pieza como en los otros (entrada = salida). **Pendiente**.

**Regla derivada** `[deducido]`: cuando un artículo se ensambla entero en crudo y va
completo al cromado, el cromado del remache/tornillo NO se modela como paso separado — va
con el cuerpo. Un paso `proveedor_servicio X→Xniquelado` en la ruta del remache es
sospechoso: casi siempre sobra.

## 2i-bis. Pedernera / Carlos Aguirre: 1 depósito, 2 códigos ISIS (2026-09-02)

`[usuario 2026-09-02]` *"me entrega Carlos Aguirre pero debe descontar stock de Pedernera"*
+ *"a Pedernera se le manda en función del stock que tenemos nosotros en sector procesado,
pero a Carlos Aguirre hay que mandarle para un mes de estadística madre... no tienen las
mismas reglas"* + *"es medio lo mismo, porque se entrega a la misma persona"* + *"pedernera
y carlos aguirre son dos prov diferentes para ISIS"*. **Regla capital**:

- **Stock físico unificado**. Pedernera (taller) y Carlos Aguirre (dueño / persona que firma
  el remito) son el mismo depósito. Al entregar cajas en Virgilio, la pieza se descuenta de
  ahí. Migración `unificar_pedernera_carlos_aguirre_ubi_stock`: se agregó
  `tallerista.ubicacion_stock_id` (nullable, FK a ubicacion); Carlos Aguirre (id 9) apunta
  a ubi 18 (Pedernera). El inventario de la ubi 29 se consolidó en ubi 18 (sumando
  cantidades, tomando el máximo de mínimos y máximos por componente), y la ubi 29 fue
  borrada. Ubi 18 renombrada "Pedernera / Carlos Aguirre".
- **Reglas de reposición distintas por componente en esa misma ubi** `[deducido, pendiente
  de implementar]`: los crudos/cromados (N7, GRJ10, GRJ10A, cuerpos p/cromar) se reponen en
  kg según lo que Cervantes tiene en Sector Procesado; los insumos de envasado (cartones
  G3C, O5A, C1A, G7A, P4A, I2A + cajas A8, A2, A4, A5, A11) se reponen en uni según 1 mes
  de est madre del artículo terminado. La ubicación es una, la regla por fila.
- **Facturación ISIS separada**. Aunque el depósito es uno, en ISIS son 2 proveedores:
  Pedernera Ilario cod_prov 701 (factura el cromado como servicio) y Carlos Aguirre
  cod_prov 4306 (factura la mano de obra del tallerista). Ambos catálogos conviven en la BD
  (`proveedor_servicio` y `tallerista`) y la separación NO se toca.
- **Frontend**: `gp2-motor.js` (v20260902a) al armar el bundle usa
  `tall[X].ubi_stock` para redirigir `UB["tall:" + X]` a la ubi compartida cuando
  corresponde. Todo lo demás (pantallas de Envíos a Talleristas, Envíos a Proveedores,
  Stock, etc.) no cambia — ambas puertas llegan al mismo stock.
- **Deuda residual** `[dato]`: la ubi 18 tiene cantidades negativas históricas por descuentos
  mal aplicados antes de la unificación: A2 (-51), A4 (-63), C1A (-612), P4A (-1512),
  GRJ10 (-2124). Falta decidir con el usuario si se blanquean a 0 con un movimiento de
  ajuste (para no perder trazabilidad) o si primero se investiga el desfase.
- **Pendiente**: aplicar el mismo criterio al **700** (hoy Jade + Danica Garcia) si el
  usuario confirma que también lo entrega Carlos Aguirre.

## 2c-quindecies. Costos cargados con datos reales del Excel `A_Costos_VIGENTES.xlsx` (2026-09-01)

`[usuario 2026-09-01, sesión en vivo]` "vamos con los costos". Se cargaron los precios reales
del **506** y **11 bombillas** desde el Excel oficial (planilla que el usuario mantiene, no
inventar valores). El agente `gp2-cargador-excel` está para cargas grandes con el mismo
protocolo. **Regla capital**: el usuario NO responde de memoria valores de plata — TODO se
verifica contra el Excel (`/root/.claude/uploads/.../A_Costos_VIGENTES.xlsx` o el que aporte)
y contra `public."Lista de Precios "`, `public."Bombillas"`, `public."Talleristas"`,
`public."Cajas "`, `public." Cartones"` en el vecino. Si no está en el Excel, se le pregunta y
si dice "buscalo vos", se busca — no se inventa ni se asume.

### Convenciones descubiertas para MODELAR pliegos con skin en GP2 (todos los productos que se blistereann)

**El proceso real** (Loeke lo hace igual para 506 y para las bombillas Mate):
1. **Talleres Gráficos Pol** (prov 2147) imprime la **cartulina** y la vende en **paquetes
   de 100 pliegos** con la impresión específica del articulo (uno por SKU).
2. Cervantes **manda a AJ - Adhesivos Termoactivos** (prov 697) mínimo 2 paquetes; AJ pega el
   **skin** (adhesivo termoactivo) sobre cada pliego y devuelve.
3. El **pliego con skin** va a **Gentile Norberto** (prov 3709, tallerista_id=8) con las
   piezas del garage; Gentile envasa y entrega en Virgilio.

**Cómo se modela en GP2** (mismo patrón para todos):
- `CART506` / `CART_MATE` / etc. — **componente "paquete"** (sector cartón=10,
  `unidad_medida='paquete'`), precio en pesos por PAQUETE (ej. $77.700 el 506, $78.600 la
  línea Mate). Stock se lleva en paquetes.
- `V3A` (Skin 506) / `PLIEGO557`, `PLIEGO558`, `PLIEGO654`, etc. — **componente "pliego"**
  (sector cartón=10, `unidad_medida='pliego'`), precio en pesos por PLIEGO **ya adhesivado**
  = precio Pol/100 pliegos + precio AJ/pliego (ej. $917/pliego para 506 = $777+$140; $915
  para bombillas = $786+$129). Stock se lleva en pliegos.
- **Ruta de trazabilidad** `CART_XXX → PLIEGO_XXX (via AJ)` — solo para OC/auditoría, no
  calcula costo (el precio del pliego con skin va directo como `precio_proveedor`).
- **Ruta insumo del articulo terminado**: consume el pliego con skin, con
  `cantidad = 1/N` donde N es el rendimiento del pliego (12 para el 506, **16 para las
  bombillas Mate**). El cartón crudo NO entra en la ruta del articulo — se estropea la
  trazabilidad al pretender que el articulo consume paquetes.
- **Precio del adhesivado por medida** en `precio_servicio_pieza(AJ, pliego, precio)` para
  trazabilidad — el motor no lo suma porque el pliego ya viene con precio directo, pero deja
  registro de la tarifa AJ por pliego (útil para OC y auditorías).

**Medidas y precios AJ 2026-06-17** (fila 225-227 LP, precio POR PLIEGO):
- 56 x 41 mm = **$140** (Uña 506)
- 56 x 38 mm = $134,28
- 47 x 43 mm = **$129** (Bombillas)

### Costo del 506 (Uña) cargado completo

`[usuario 2026-09-01, aprobado paso a paso]`

| Concepto | Componente/Servicio | $ | Cantidad | Aporte al 506 |
|---|---|---|---|---|
| Cartulina Pol | CART506 (paquete 100 pliegos) | $77.700/paq | (via V3A) | — |
| Pliego c/skin | **V3A** (Skin 506) $917/pliego | (agrupa $777+$140) | 1/12 | **$76,42** |
| Uña armada | Alex/Martin arma GRJ7 (A10 pintado o C10 zincado + V9 remache) | — | 1 | ~$260 |
| Envasado | **Gentile** (tallerista) | $70/uni | 1 | **$70** |
| Caja | A11 Caja N°29 $166,86 | (dentro caja) | 1/12 | $13,90 |

**Total 506: $420,88** (era $274,46 antes de esta carga). PLIEGO506 fue creado y luego
**fusionado en V3A por normalización** — V3A es el código nativo y ya existía.

### Costo de 10 bombillas (5 modelos × 2 códigos LK/Chef) cargado completo

`[usuario 2026-09-01, aprobado paso a paso]`

**Los 5 modelos físicos** (con doble código LK/Chef — el Chef NO se stockea; se descuenta del stock LK):

| Modelo físico | LK | Chef | Fabricación | Costo total |
|---|---|---|---|---|
| Resorte Chata | 557 | 762 | LK fabrica: BOM12 caño+BOM8 resorte, Martin arma GRJ6 | **$401,54** |
| Resorte Trad | 558 | 763 | LK fabrica: idem, arma GRJ5 | **$401,54** |
| Autolimpiante Inox | 654 | 769 | Compra a **Cimarron** (GRJ4 = $1.578) | **$1.715,10** |
| Plana Ancha Metalizada | 658 | 758 | Compra a Cimarron (GRJ15 = $1.035) | **$1.172,10** |
| Pico de Loro | 659 | 759 | Compra a Cimarron (GRJ14 = $2.005) | **$2.142,10** |

**Componentes comunes** (para todas las bombillas Mate):
- **Cartulina** en paquete `CART_MATE` = $78.600 (100 pliegos) — Pol prov 2147
- **PLIEGO xxx c/Skin** = $915/pliego = $786 (Pol/100) + $129 (AJ 47x43 mm) — uno por SKU
- **Rendimiento**: 16 uni por pliego (⚠️ contradicción histórica: la fórmula del cartón usaba
  /12 en versiones viejas; el usuario aclaró **es /16**)
- **Caja A8 (Caja N°2)** $261,82 / **24 uni** por caja → $10,91/uni (todas las bombillas usan la misma caja)
- **Envasado Gentile** $69/uni (fila 233 LP, cod ISIS "557/558/654" pero aplica a los 10)

**Componentes de fabricación LK (para 557/558/762/763)**:
- **BOM12 Caño Inox 140mm**: **$12,48 USD/kg × kg_x_uni=0,0095** (9,5 grs) — prov **3327 Metalurgica Giser**
- **BOM8 Resorte Bombilla Niquelado**: **$35,80 ARS/uni fijo** — prov **4466 Grudzien Claudia Laura**
- **Martin Cornejo** (prov 3805, tallerista_id=6) arma GRJ5/GRJ6 = **$47,25/uni**

**Componentes comprados a Cimarron** (para 654/658/659):
- Los 3 componentes en Sector Garage (GRJ4, GRJ14, GRJ15) ya existían, se les cargó
  `precio_proveedor` con `cod_prov='Cimarron'`. **Cimarron entrega en Garage** (mismo lugar
  para todos los modelos).

**Costo del 550** (Filtro Para Bombillas, modelo distinto de las Mate):
- **Precintos Omega** (prov 4444 "4 Zurdos") $38 c/u × **2 por uni** = $76
- **Filtro s/Envasar** (prov 4444) $13,25 c/u × 2 por uni = $26,50
- **Envasado García** (prov 4317) $51/uni
- **Cartón C** $89/uni (NO es el pliego Mate — es otro tipo de cartón)
- **Caja A8 (Caja N°2)** $146,42 / **36 uni** (rinde 36, no 24) = $4,07
- **Total 550: ~$247** aprox

### Reglas duras para próximas cargas de costos

- **Precio directo del componente `precio_proveedor(componente_id, precio, moneda,
  precio_por_kg)`** — SÍ pasa al costo del articulo.
- **Motor tiene bug residual con GRJ fabricados sin `precio_proveedor`**: los articulos que
  usan un GRJ armado internamente (no comprado) muestran `faltan_precios=1` aunque el costo
  esté bien calculado por la ruta. Ignorar el flag, mirar el `total_pesos`.
- **`estado_compra='fabricacion'`** en un componente del sector "comprado por defecto"
  (fleje/cartón/plástico/etc.) lo excluye del CTE `comprado` y lo trata como fabricado por su
  ruta. Cuidado con esto — si además tiene `precio_proveedor`, el motor lo vuelve a tratar
  como comprado.
- **NO INVENTAR CÓDIGOS DE PROVEEDOR**: el `cod_prov` en `precio_proveedor` es el que aparece
  en `public."Lista de Precios "` col2 ("Cod Prov"). El nombre a veces no está en
  `public."Proveedores"` (razón social vacía) — el usuario lo dice cuando corresponde.
- **Convención doble código LK/Chef**: cuando un modelo físico tiene 2 códigos (uno por
  marca), **stock solo LK**; los articulos Chef se crean para reportes de venta pero SIN
  inventario. Consumo se suma en aplicación.
- **Al `precio_tallerista` no le apunten `articulo_id`** (no existe la columna). Se apunta
  al **componente Terminado** por su `codigo` (igual al código del articulo pero en sector 12).
- **Cada articulo tiene su propio cartón/pliego** aunque comparta costo y proveedor con otro
  (la impresión es específica del SKU). `[usuario 2026-09-01, correctivo]`: el cartón 550
  cuesta lo mismo que el del 501 ($89 de Pol) pero son **componentes distintos** en GP2 —
  CCG6B "Cartón 550" y D2A "Cartón 501". No reusar componentes de cartón/pliego entre
  articulos distintos, aunque el precio y el proveedor sean idénticos.

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
