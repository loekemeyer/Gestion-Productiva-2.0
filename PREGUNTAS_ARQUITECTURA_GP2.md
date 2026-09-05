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

**Dato agregado el 2026-09-05 (ciclo 2s).** La columna `inventario.cajones_x_ubicacion` (154 valores
en Crudo/Procesado, "Max Caj Cerv" del Excel viejo) **no la lee nadie**: ninguna función, vista ni
pantalla (el máximo vigente sale de `parametro.max_cajones_x_ubicacion` = 5 para todos). Si A,
se borra la columna (con respaldo CSV en `db/`); si B, es el dato de entrada de la regla pendiente.

**Pregunta concreta.** ¿A o B? (y con eso, ¿se borra `cajones_x_ubicacion`?)

---

## 6. `MACRO_ENTREGAS_SUPABASE.bas` y `.nojekyll`

**Problema encontrado.** La macro VBA lee `public` desde el Excel "Control Partes
Talleristas" (¿sigue sincronizando?). `.nojekyll` sólo sirve para GitHub Pages y el deploy es
Vercel (`vercel.json`).

**Recomendación.** Borrar los dos (la macro real vive en el `.xlsm`, no acá).

**Pregunta concreta.** ¿El Excel sigue sincronizando desde `public`? ¿El deploy es solo Vercel?

---

## 7. ¿«CARLOS» en las entregas de Virgilio es Alex Escalante (2) o Carlos Aguirre (9)?

**Problema encontrado.** `contraparte_alias` tenía `'CARLOS' → 9 (Carlos Aguirre)` y también
`'Carlos' → 2 (Alex Escalante)`; el trigger que espeja las entregas de Virgilio compara en
mayúsculas, así que la segunda nunca matcheó (se borró en el ciclo 2; hoy manda la primera). En
`public."Entregas Tallerista Virgilio"` «CARLOS» entrega 535, 307, 335, 248, 635/636, 515, 395,
510, 580…; «AGUIRRE CARLOS RODOLFO» entrega 544 y 561 por separado. En GP2 el 510 y el 515 los
hacen **Alex Escalante / Martin Cornejo** (rutas y precios a nombre de Alex), el 544 lo hace
**Carlos Aguirre**, y el 580 figura de Carlos Aguirre aunque en Virgilio lo entrega «CARLOS».

**Alternativa A.** `'CARLOS' → 2` (Alex Escalante) y revisar la ruta del 580.
**Alternativa B.** Queda `'CARLOS' → 9` (Carlos Aguirre).

**Recomendación.** A: la evidencia de Virgilio (510/515) apunta a Alex; «Aguirre Carlos Rodolfo»
ya tiene su alias propio.

**Impacto.** Una fila de `contraparte_alias`; las entregas espejadas de «CARLOS» descuentan las
partes del tallerista equivocado mientras esté mal.

**Pregunta concreta.** ¿A o B? ¿Y el 580 lo envasa Alex o Carlos Aguirre?

---

## 8. Datos que el sistema no puede deducir (lista corta, una línea cada uno)

Cada uno tiene la consulta y el detalle en los informes de auditoría (`REFACTOR_GP2.md`).

1. **550**: la columna dice caja **A8** y la receta dice **A9** (el catálogo viejo también dice
   N° 22 = A9). ¿Cuál es? (recomendación: A9, corregir la columna).
2. **PA10 / PEP3**: están en sector Procesado (decisión 2026-09-04) pero los 240 de stock de
   PEP3 viven en la ubicación *Sector Plástico* y no hay fila en Procesado. ¿Se mueven con dos
   ajustes (−240 Plástico, +240 Procesado)? (recomendación: sí).
3. **32 stocks negativos en talleristas** (IJUPA −1.896 en 11 piezas, Pettofrezza −1.200 en 12,
   W6 −2.400): son consumos de Virgilio sin envío ni stock inicial cargado. ¿Se releva el stock
   de esos dos talleristas y se carga como ajuste trazado, o se blanquea a 0? (recomendación:
   relevar; los negativos son la lista exacta de lo que hay que contar).
4. **574** está `discontinuado` pero la Est Madre le pide 1.060/mes (también 119: 150, 615: 24,
   809: 16). ¿Sigue discontinuado? Y 9 componentes `discontinuo` siguen en rutas vivas (A1C1,
   A9, BOM10, C12, GRJ13, I3B, IZ19A, L4B1, V20): ¿se sacan de la ruta o vuelven a activos?
5. **GRJ1**: está en la receta del 500 y tiene inventario, pero ninguna ruta lo produce ni lo
   consume (las 10 rutas del 500 entran por C1/V9/pliego/A11). ¿Quién arma el GRJ1
   (Alex/Martin, espejo del GRJ7) o el 500 se envasa con las partes sueltas?
6. **863** tiene PEP8 en la receta y ninguna ruta lo toca. ¿Falta la ruta `Fleje 27 -> Art 863`
   con Maspoli, o PEP8 no va en el 863?
7. **Federico Realini** tiene dos legajos (274 inactivo, 401 activo). ¿Reingreso (se deja) o
   error de carga (unificar)?
8. **Matriz «S/N» (117)** está en 2 rutas (ID5→W5) sin tiempo ni tipo; **138 (119)** dice tipo A
   (alimentador) y tipo_matriz B (balancín). ¿Cuál vale? (`tipo_matriz` se va a borrar: nadie la
   lee).
9. **Mínimo > máximo en 80 filas** (X4 87.892 vs 20.020; V9 113.912 vs 10.581): el mínimo es
   consumo × meses y el máximo es el lugar. Como la OC pide «llenar el lugar», ¿el mínimo se
   topea en el máximo o se deja como alerta?
10. **IE3, IC2 e IF12** (flejes) no tienen `kg_x_uni`: cualquier movimiento en unidades falla.
    ¿Peso por pieza? (dato físico).
11. **Z12, C13 y 1686** (crudo/procesado) no tienen `uni_x_cajon` (Z12 y C13 tampoco
    `kg_x_uni`): sin eso no se calcula el máximo de 5 cajones.
12. **`precio_proveedor.cod_prov` contradice `componente.proveedor`** en 6 códigos (797 Pat Bet
    Plast en 9 piezas de Pettofrezza; 2147 Pol en Vihal/Blist-Pack; 2339 Maspoli en PEP5 de
    Pintos; 2635 Aperam en IB7 de Hermac; 3810 Hermac en IA1 de Basconia; 3917 Tierra Nativa en
    IE13 «Importado»). ¿Quién cotiza y quién entrega?
13. **`proveedor_insumo.cod_prov` está vacío en 35 de 39**; los precios permiten deducir 18
    (Basconia 302, Brawin 419, Bella Vista 890, Vihal 1218, Szapiro 116, JL Metales 1744,
    Pettofrezza 1895, Mandelli 2224, Giser 3327, Suipacha 3808, Grudzien 4466, Cimarron 4444, Pol
    2147, Pat Bet Plast 797, Aperam 2635, Hermac 3810, AJ Adhesivos 697; ¿Pintos 2339?). ¿Se
    cargan así?
14. **`fleje_detalle.kg_uni_desp`** difiere de `componente.kg_x_uni` en 2 flejes (IE4 0,01463 vs
    0,01482; IE5 0,01603 vs 0,01642). ¿El kg oficial ya incluye el desperdicio (se borra la
    columna) o no (se conserva como `kg_x_uni_desp`)?
15. **`uni_x_articulo_x_caja`** (434 filas, copia del Excel «Cajas» de LK y CH): nadie la lee
    salvo `ControlAT_GP2`; es la única fuente del catálogo **CH** (18 códigos son otro producto
    en CH que en LK) y de las unidades por caja de 48 artículos de Prov AT que no están en
    `articulo`; contradice `articulo.articulos_por_caja` en 5 (508: 12 vs 6; 034/043/658/802: 12
    vs 24). ¿GP2 modela CH (columna `empresa` en `articulo`) o se descarta y se borra la tabla?
16. **`proveedor_at` (12) vs `tallerista`**: misma clase de contraparte (recibe cartón/cajas y
    entrega terminado a Virgilio) y 3 personas están en las dos (Maspoli, Pettofrezza, Tierra
    Nativa). Fusionarla en `tallerista` con `clase='prov_at'` saca una tabla y 2 FKs pero toca
    ~15 funciones. ¿Se hace? (recomendación: sí, en un ciclo propio).
17. **13 artículos entregados en Virgilio que no existen en GP2** (535 con 482 cajas históricas,
    727E, 877E, 599, 943, 948, 207, 584E, 590E, 590ES, 823, 817, 760): quedan en
    `virgilio_espejo_pend`. ¿Se dan de alta?
18. **071**: la ruta lleva la caja A4 y ahora la receta también (ciclo 2); el usuario dijo «al 071
    no le hagas cartón» (cartón ≠ caja). ¿La caja A4 va? Si no, se saca la fila.
19. **Cronograma de relevamiento «Bolsa Plást»** (2 fechas) no tiene `sector_id`, así que ese
    conteo no se puede abrir. ¿Es sector Plástico (6) o Cartón (10)?
20. **`recepcion_control` / `recepcion_control_rollo`** (pesaje por pallet con rollos) siguen en
    0 filas: ninguna recepción de Basconia/Hermac se controló todavía desde la pantalla. ¿El
    pesaje por pallet se usa de verdad? Si no se va a usar, son 2 tablas + 3 vistas + 3
    funciones para borrar.

---

## 21. El sector 13 «Alambre»: ¿es un sector de insumo comprado?

**Problema encontrado.** El sector 13 se creó el 2026-09-04 para `FLEJE90_BRUTO` (lo compra
Altrak, entra por el flujo Altrak de Recepción Insumos). Tiene `tipo = 'crudo'` (el mismo tipo que
el Sector Crudo de piezas propias) y rubro de OC 5 (sube a Fleje en la OC), pero **no está entre
los sectores de insumo** (`sector.es_insumo`, que hasta hoy era una lista fija de ids 5..11 adentro
de `_es_sector_insumo`).

**Por qué existe una duda.** Con `es_insumo = false` la lista genérica de Recepción no lo
muestra, `crear_recepcion_insumo` lo rechaza ("no es un insumo") y los máximos automáticos lo
saltean; hoy funciona sólo porque Altrak tiene su flujo propio. No sé si eso es lo buscado (Altrak
es especial) o un descuido al crear el sector.

**Alternativa A.** `update sector set es_insumo = true, tipo = 'fleje' where id = 13`: pasa a ser
un insumo comprado como Fleje/Plástico (aparece en Recepción y en máximos automáticos).

**Alternativa B.** Dejarlo como está (sólo entra por Altrak) y que `tipo` quede en `crudo`.

**Recomendación.** A: es material comprado, no una pieza propia. Y `tipo='crudo'` en un sector
comprable confunde a cualquier consulta por tipo.

**Impacto.** Una línea de datos; ninguna función (`es_insumo` es la columna que leen las 6).
Dato agregado el 2026-09-05 (ciclo 2s): el sector 13 **no tiene ubicación** propia. Su único
componente, `FLEJE90_BRUTO` (50 kg), vive en la ubicación de Resortes Charcas (`cargar_compra_mp`
lo manda ahí), pero `ubic_de_componente()` lo resuelve a Virgilio. Si A, hay que decidir también
dónde "vive" el alambre bruto (¿ubicación "Sector Alambre" o la de Charcas?) — `db/verificar.sql`
(regla A) va a marcar el sector insumo sin ubicación hasta que se resuelva.

**Pregunta concreta.** ¿A o B? Y si A, ¿el stock del alambre bruto queda en Charcas o en un sector propio?

---

## 22. `entrega_prov_at` es un segundo ledger: ¿se deja o se lleva a `movimiento`?

**Problema encontrado.** Las entregas de los proveedores de artículo terminado (125 filas:
proveedor, cod_art, cajas, remito, factura) viven en `entrega_prov_at`, no en `movimiento`: no
mueven stock GP2 (van directo a Virgilio) y guardan datos comerciales que el ledger no tiene.

**Por qué existe una duda.** Es conceptualmente el mismo evento que "el tallerista entregó",
pero con destino Virgilio y sin `componente` (el `cod_art` es texto libre de `articulo_prov_at`,
sin FK a `articulo`). Unificar exige que cada artículo AT exista como componente terminado.

**Alternativa A.** Dejarla como está: registro comercial, no de stock.

**Alternativa B.** Cada entrega es un `movimiento` tipo `entrega_prov_at` hacia la ubicación
Virgilio; remito/factura en `nota` o en una tabla chica de facturas.

**Recomendación.** A por ahora. B sólo si se quiere ver el stock de Virgilio completo (propio +
AT) en una sola pantalla.

**Impacto.** A: nada. B: tabla, RPC, pantalla Entregas AT y el espejo de Virgilio.

**Pregunta concreta.** ¿A o B?

---

## 23. Una OC en `borrador` se puede "recibir"

**Problema encontrado.** `_aplicar_recepcion_a_oc` cruza lo recibido contra las OC `enviada` **y
también** `borrador` (primero las enviadas). Una OC que nunca se mandó al proveedor queda
`recibida` sola.

**Por qué existe una duda.** Puede ser un descuido o puede reflejar la práctica (nadie marca
"enviada" y la mercadería llega igual).

**Alternativa A.** Cruzar sólo contra `enviada`; el borrador es un papel de trabajo.

**Alternativa B.** Como hoy.

**Recomendación.** A, y que la pantalla de OC avise "hay OC en borrador de este proveedor" al
recibir.

**Impacto.** Una línea en la función.

**Pregunta concreta.** ¿A o B?

---

## 24. La alerta «stock bajo mínimo» está apagada desde agosto

**Problema encontrado.** `alertas_bundle` trae la alerta desactivada con un motivo viejo
("stock negativo irreal"). Hoy el inventario cierra con el ledger (0 desvíos).

**Por qué existe una duda.** Falta la regla: avisar por `cantidad < minimo` por ubicación de
sector (lo que ya muestra Faltantes) o por `cantidad < maximo` (lo que pide la OC), y a quién.

**Alternativa A.** Reactivar con `minimo`, sólo sectores de insumo, mostrando la cantidad de
renglones (no la lista).

**Alternativa B.** Dejarla apagada; Faltantes y la OC ya cubren el aviso.

**Recomendación.** A.

**Impacto.** Sólo `alertas_bundle` y la pantalla de Inicio.

**Pregunta concreta.** ¿A o B?

---

## 25. `recalcular_minimos()` hoy cambiaría 48 mínimos

**Problema encontrado.** Es una herramienta manual sin llamador; la última corrida fue el
2026-09-02 (respaldo en `db/respaldo_inventario_minimo_20260902.csv`). El consumo de la Est
Madre se movió desde entonces: correrla hoy cambia 48 mínimos.

**Por qué existe una duda.** Los máximos sí se recalculan solos cuando cambia la Est Madre
(`trg_maximos_est_madre`); los mínimos no. No sé si eso fue una decisión (los mínimos los fija la
persona) o quedó a medio hacer.

**Alternativa A.** Colgar `recalcular_minimos` del mismo trigger que los máximos: mínimo y máximo
salen del mismo consumo y no se desfasan.

**Alternativa B.** Seguir corriéndola a mano cuando el usuario lo pida.

**Recomendación.** A.

**Impacto.** Una línea en `fn_recalc_maximos_insumos`; la primera corrida cambia 48 mínimos.

**Pregunta concreta.** ¿A o B? Si B: ¿la corro ahora?

---

## 26. La entrega del tallerista está escrita DOS veces

**Problema encontrado.** La pantalla Entregas Talleristas usa el motor JS (`gp2-motor.js` →
`recepcionTall` arma las filas y las manda por `registrar_movimientos`: la entrega como
*transformación* entrada→salida más `consumo_tall` por las otras líneas del BOM). En la base
existe la RPC `crear_entrega_tallerista` (misma regla de negocio, otra forma en el ledger: la
salida "nace" y TODAS las líneas del BOM son `consumo_tall`) **que ninguna pantalla llama**.

**Por qué existe una duda.** El inventario queda igual por los dos caminos; lo que cambia es
cómo se lee después el ledger, y la filosofía GP2 dice que el motor vive en la base.

**Alternativa A.** La pantalla llama la RPC por renglón (ya acepta `p_comp_entrada_id` para el
caso ambiguo y descuenta el BOM) y `recepcionTall` se borra del JS.

**Alternativa B.** Se borra la RPC y el JS queda como única implementación.

**Recomendación.** A, con `test_entregas_tall_gp2.js` reescrito al contrato de la RPC.

**Impacto.** Una pantalla, un test, ~80 líneas menos de JS (idea 7260).

**Pregunta concreta.** ¿A o B?

---

## Cómo responder

Con el número y la letra alcanza ("1B", "21A"...). Lo que se responda se aplica en la sesión
siguiente y se tacha acá.
