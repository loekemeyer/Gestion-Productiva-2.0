# PREGUNTAS_ARQUITECTURA_GP2.md — para responder el martes

> Dudas que salieron de la auditoría de arquitectura del 2026-09-04 y que dependen de una regla
> del negocio (no se pueden deducir técnicamente). El loop NO se frenó por ninguna: se anotó y se
> siguió con otra cosa. Cada una trae qué se encontró, por qué hay duda, dos alternativas, la
> recomendación, el impacto y la pregunta concreta. Responder con el número y la letra alcanza
> ("1B", "2A"…).

---

## 1. ¿Se borran del repo las pantallas del programa viejo (schema `public`)?

**Problema encontrado.** El repo tiene ≈50 páginas HTML (+≈30 JS) que pegan al schema `public`
(la casa del vecino): `StockSC/StockSC.html`, `Produccion/monitor.html`, `Facturas/index.html`,
`Talleristas/Envios/EnviosTall.html`, etc. Ninguna está linkeada desde el menú `GP2_MODULOS.html`
salvo *Entrega Virgilio* (marcada "app vieja"). Son un tercio del repo y todas escriben o leen
tablas que GP2 no mira.

**Por qué existe una duda.** Técnicamente no puedo saber si alguien las abre por URL directa
(bookmark, tablet, el sector Pagos con `Facturas/index.html` según `PERFILES.md`) o si el programa
viejo corre desde OTRO deploy y estas son copias muertas.

**Alternativa A.** Borrarlas todas (quedan en git si hacen falta) menos las que el menú todavía
usa (*Entrega Virgilio*) y las 5 "bloqueadas" del menú que son la referencia para migrar
(Facturas, Control Remitos, Entrega Cervantes Fotos, Entrega Proveedores Cervantes, Chat Ventas).

**Alternativa B.** Dejarlas como están y sólo borrar backups/ejemplos/duplicados exactos.

**Recomendación.** A. Las pantallas viejas que tienen versión GP2 (StockSC, StockSP, monitor,
maestro, rendimiento, tiempos, abm, entrevistas, Disruptivas, ControlPS/EnviosPS/EntregaPS,
ControlTall/EnviosTall/Recepcion Cervantes, ControlAT/EnviosAT, StocksGeneral, StockTransito,
StockMovimiento, Despiece, Verificación, VerifMadres, Informes, Alertas, Faltante Partes,
Proporciones, ABM Artículos, StockFlejes/*.html viejos) son copias del vecino dentro de mi casa:
contradicen la regla de oro (no se copia la casa del vecino) y cada arreglo de UX se hace dos veces.

**Impacto.** Sólo archivos del repo (ninguna tabla). Hay que dejar un redirect en las 4 que la
tablet todavía linkea (ver pregunta 2).

**Pregunta concreta.** ¿A o B? Si A: ¿alguna de las viejas la usa alguien hoy por URL directa
(Pagos con `Facturas/index.html`, Thomas, la tablet)?

---

## 2. La tablet de logística (`envios-only.html`) sigue abriendo 4 pantallas VIEJAS

**Problema encontrado.** `envios-only.html` linkea `Prov Serv/Envios/EnviosPS.html`,
`Prov Serv/Entregas/EntregaPS.html`, `Talleristas/Envios/EnviosTall.html` y
`Talleristas/Recepcion/Recepcion Cervantes.html`, que escriben en `public` (`Envios a PS`,
`Entregas PS`, `Envios a Talleristas`, `Entregas Tallerista Virgilio`). Lo que se carga desde la
tablet **no entra a GP2** (salvo las entregas de Virgilio, que el trigger espeja). Desde la PC se
usan las `_GP2`, que escriben en `GP2.movimiento`. Dos libros distintos para el mismo movimiento.

**Por qué existe una duda.** No sé si la tablet sigue a propósito en el programa viejo (corrida
en paralelo hasta cargar el stock inicial real) o si quedó así por olvido cuando se hicieron las
pantallas GP2.

**Alternativa A.** La tablet pasa YA a las 4 pantallas GP2 (`EnviosPS_GP2`, `EntregaPS_GP2`,
`EnviosTalleristas_GP2`, `EntregasTalleristas_GP2`) — un cambio de 4 links + la lista del rol
`envios` en `auth-guard.js`.

**Alternativa B.** Sigue en las viejas hasta que el ledger GP2 tenga el stock inicial real.

**Recomendación.** A. El ledger GP2 ya recibe cargas reales desde las pantallas de PC (Fleje90,
Charcas, Eclipse, talleristas); tener la tablet en otro libro es la fuente de desfasaje más grande
que hay hoy. (Relevamiento ya se cambió: el usuario lo había decidido.)

**Impacto.** `envios-only.html`, `auth-guard.js`; y habilita borrar las 4 pantallas viejas + sus
JS/CSS (≈120 KB).

**Pregunta concreta.** ¿A o B?

---

## 3. Los 5 módulos con candado del menú: ¿se migran o se borran?

**Problema encontrado.** `GP2_MODULOS.html` tiene 5 botones bloqueados (🔒) cuyas pantallas
viejas siguen en el repo: *Lectura de Facturas Entrantes* (`Facturas/index.html`, 100 KB,
borra e inserta en `public."Entregas PS"`), *Entrega Proveedores Cervantes* (23 KB), *Ver
Cargas* (`ControlRemitos/`, 9 KB), *Entrega Cervantes Fotos* (47 KB) y *Chat Bot Ventas*
(`Ventas Chat/`, 51 KB, sin Supabase). 230 KB que ni se abren ni se migran.

**Por qué existe una duda.** Un candado significa "pendiente de migrar"; no sé si siguen en
plan o si ya se descartaron (Pagos podría estar usando `Facturas/index.html` por URL directa).

**Alternativa A.** Se migran a GP2 (cada una es un módulo nuevo: hay que diseñarlo).
**Alternativa B.** Se borran, y los 5 botones desaparecen del menú.

**Recomendación.** B para *Chat Bot Ventas* (es un stub sin datos) y *Entrega Cervantes Fotos*
(prototipo OCR). Para las 3 de Pagos/Remitos, decidir con el sector Pagos.

**Impacto.** Solo archivos + 5 líneas del menú.

**Pregunta concreta.** Por cada uno de los 5: ¿A, B, o "lo usa alguien hoy por URL"?

---

## 4. Documentos del programa viejo que CLAUDE.md todavía manda leer

**Problema encontrado.** `CLAUDE.md` tiene secciones enteras que describen la casa del vecino
(`public`): *Verificación - Trazado de Rutas* (tablas `Rutas_Confirmadas`/`Rutas_Problemas`),
*Patrón GRJ* (configura `Recepcion Cervantes.html` vieja), *Tablas Madre y Derivadas* (`SP Kg`,
`SC Kg`, `Despiece x Articulo`…), *Causa-Efecto*, y referencia archivos que no existen
(`ANALISIS_LOGICA_GP2.md`, los 3 HTML con `var D`). Además hay 3 puertos distintos para el
servidor local (5501 en CLAUDE.md, 5503 en `.vscode`, 5509 en `.claude/launch.json`).
`GP2_MAPA.md` (los contratos de los bundles, viva y útil) no la linkea nadie.

**Por qué existe una duda.** Si el programa viejo sigue operando desde este repo, esas
secciones siguen siendo instrucciones válidas para quien lo toque; si el vecino vive en otro
lado, son ruido que confunde a cada sesión nueva.

**Alternativa A.** CLAUDE.md queda solo GP2: se quitan las 4 secciones del vecino (quedan en
git y en `Tablas_Madre_y_Dependencias.xls`), se linkea `GP2_MAPA.md`, se unifica el puerto.
**Alternativa B.** Se dejan, marcadas "(programa viejo — solo si tocás `public`)".

**Recomendación.** A, junto con la respuesta a la pregunta 1.

**Impacto.** `CLAUDE.md`, `AUDITORIA_RUTAS_2026-04-18.md`, `Tablas_Madre_y_Dependencias.xls`.

**Pregunta concreta.** ¿A o B? ¿Y cuál es el puerto real del Live Server?

---

## 5. `PENDIENTES_UBICACIONES_2026-08-30.md` + `SQL_MAXIMOS_POR_UBICACIONES.sql`: ¿regla vigente?

**Problema encontrado.** El doc describe la regla *"sólo se nombra la primera ubicación
ocupada"* y el SQL define `maximos_sector_por_ubicaciones_ocupadas()`, que **no existe en la
base**. Lo que sí corre hoy es `recalcular_maximos_cajones()` (5 cajones por ubicación,
`parametro.max_cajones_x_ubicacion`, columnas `inventario.cajones_x_ubicacion/ubicaciones`).

**Por qué existe una duda.** No sé si la regla de "ubicaciones ocupadas" se descartó o si
quedó pendiente de aplicar.

**Alternativa A.** Se descartó: borrar los 2 archivos.
**Alternativa B.** Sigue pendiente: pasarla a `IDEAS-GP2.md` con código, y borrar los archivos.

**Recomendación.** B (la idea queda registrada, el SQL en git).

**Pregunta concreta.** ¿A o B?

---

## 6. `MACRO_ENTREGAS_SUPABASE.bas` y `.nojekyll`

**Problema encontrado.** La macro VBA lee `public` desde el Excel "Control Partes
Talleristas" (¿sigue sincronizando?). `.nojekyll` sólo sirve para GitHub Pages y el deploy es
Vercel (`vercel.json`).

**Recomendación.** Borrar los dos (la macro real vive en el `.xlsm`, no acá).

**Pregunta concreta.** ¿El Excel sigue sincronizando desde `public`? ¿El deploy es solo Vercel?

---

## 7. (se van agregando a medida que los agentes terminan)
