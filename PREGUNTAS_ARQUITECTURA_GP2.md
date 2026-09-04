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

## 3. (se van agregando a medida que los agentes terminan)
