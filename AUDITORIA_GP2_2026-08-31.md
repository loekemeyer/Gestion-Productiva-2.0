# Auditoría GP2 — 2026-08-31 (5 agentes en paralelo)

Revisión pedida por el usuario tras cargar los precios reales: normalización de Supabase
y código. **Todo lo que sigue está verificado con consultas a la base**, no es opinión.
Lo que se arregló ya está marcado ✅; lo que queda, con su SQL o su decisión pendiente.

---

## ✅ ARREGLADO EN ESTA PASADA

### 1. `carton_formato` estaba rota (la rompió esta misma sesión, el 31-08)

La tabla **ya existía** con 3 filas y semántica documentada en `REGLAS_OC_INSUMOS.md:25-33`:
`pliegos_multiplo` = **múltiplo del PEDIDO TOTAL** (C 12.000 · LOKE 16.000 · 8 30.000),
`codigo_multiplo` = 1.000, `min_codigo_x_multiplo` = 1.000.

La carga de categorías interpretó esos campos como "posiciones por pliego" y creó
**`Loke`** (duplicado case-sensitive de `LOKE` — el nombre es la PK y Postgres lo aceptó)
y **`Huevo`**, ambas con los tres campos mal. 28 cartones Chef quedaron apuntando a la
fila falsa y `LOKE`, la buena, quedó huérfana.

**Qué rompía**: `Compras/OC_GP2.html:264` valida `cantidad % codigo_multiplo`. Con
`codigo_multiplo = 16000`, cada código Chef exigía pedidos de 16.000 unidades — para el
Cartón 706 (2.249 uni/mes) eso es 7 meses de stock, y cualquier cantidad razonable
deshabilitaba el botón de crear OC.

**Fix**: los 28 componentes repuntados a `LOKE`, fila `Loke` borrada, `Huevo` corregida a
25.000/1.000/1.000. Quedan 4 formatos coherentes: C→32 cartones, LOKE→28, Huevo→10, 8→3.
Los precios no se tocaron.

**Pendiente de confirmar**: el múltiplo de pedido del formato Huevo (25.000) es `[deducido]`
del patrón y de que el usuario nombró "veinticinco mil". Confirmar con Gráfica Pol.

### 2. La OC mostraba y congelaba el precio del clavo inflado 153×

`oc_bundle` (CTE `pv`) y `crear_oc` leían `precio_proveedor.precio` **sin mirar la columna
nueva `precio_por_kg`**. El clavo PCP3 se cotiza a **USD 3,30 por kg** y pesa 6,53 g: la OC
lo mostraba como **USD 3,30 por unidad** (real: USD 0,0215), el subtotal y el total de la
barra lo multiplicaban así, `crear_oc` lo congelaba como foto histórica y **salía inflado en
la hoja impresa que se le manda al proveedor**.

**No llegó a hacer daño**: 0 órdenes abiertas y el clavo nunca se pidió. Verificado antes
de tocar nada.

**Fix aplicado** (migración `oc_respeta_precio_por_kg`): las dos funciones convierten a la
unidad de pedido (`precio * kg_x_uni`) cuando el flag está prendido, igual que ya hacía
`v_costo_componente`. Verificado: OC y valorización dan lo mismo (US$ 0,0215) y los flejes
siguen intactos ($3,58/kg, se piden en kg).

---

## 🔴 CRÍTICO — PENDIENTE (necesita datos o decisión del usuario)

### 3. Dos agujeros de escritura anónima

La clave anon viaja en el HTML, así que lo que protege es RLS + escritura solo por RPC
`SECURITY DEFINER`. Dos excepciones reales:

- **`GP2.empleado`**: policies de INSERT y UPDATE `TO {anon, authenticated}` con
  `WITH CHECK (true)`. Cualquiera con la URL puede crear legajos, renombrar gente o
  desactivar la planta entera. Y `legajo` cruza con `public.db_n8n_espejo` (premios).
  **OJO: no se puede revocar sin más** — `Produccion/abm_GP2.html:209-210` y `:224`
  escriben ahí directo. Primero hay que migrar esa pantalla a una RPC.
- **`GP2.inv_delta(bigint,bigint,numeric)`**: RPC `SECURITY DEFINER` ejecutable por anon
  que escribe `inventario.cantidad` **salteando `movimiento`** (sin auditoría, sin
  validar signo ni ubicación). **Ninguna pantalla la llama** (grep del repo: 0 usos).
  Revocarla es una línea y no rompe nada:
  `revoke execute on function "GP2".inv_delta(bigint,bigint,numeric) from anon, authenticated;`

Antecedente: en `agente_propuestas` se abrió escritura anon por error el 30-08 y se
revirtió a los 74 segundos. Acá nunca se revirtió.

### 4. 13 placeholders de 1 USD todavía mandan el costo — $ 47,8 M/mes de costo ficticio

Son **37 filas** con placeholder (no 17 como decía CONOCIMIENTO), y en las 37 el
placeholder es el precio **vigente**. De esas: 12 en `fabricacion` y 10 en `discontinuo`
quedan inertes (el motor las costea por ruta o en cero, correcto). **Las 13 con
`estado_compra` NULL sí contaminan**: valen $1.535 la pieza.

11 de ellas tienen consumo real → **$ 47.856.695/mes de costo inventado**, que es **el
doble del valor de todo el stock** ($ 23,0 M). Los peores:

| Código | Descripción | Consumo/mes | $/mes ficticio |
|---|---|---|---|
| C13 | Corta Queso Bastidor c/Cilindro | 5.655 | 8.680.425 |
| BOM13 | Filtro p/Bombilla | 5.064 | 7.773.240 |
| BOM14 | Precinto p/Bombilla | 5.064 | 7.773.240 |
| GRJ5 | Bombilla Resorte Trad 558 | 2.123 | 6.517.610 |
| BOM8 / BOM12 | Resorte y Caño de bombilla | 3.163 c/u | 4.855.205 c/u |

Cualquier número de valorización o costo de artículo para 557/558/546 hoy es basura.
**Regla que sale de acá: lo que neutraliza un placeholder es marcar el `estado_compra`,
no borrar la fila.** Los precios reales son pendiente del usuario (Cimarrón y el bastidor
importado).

### 5. 34 matrices con `tiempo_historico = 0` y el semáforo no las ve

34 matrices usadas en rutas tienen el tiempo en **0** (una más en NULL). Resultado: 23
componentes de Crudo/Procesado tienen **mano de obra $ 0** — la regla de $2/segundo
simplemente no se aplica en esas cadenas (Z2B, Z3B, J10, J12, F9, F10, K7, L8…).

**Lo grave es que la vista miente**: `v_costo_componente.faltan_tiempos` cuenta solo
`IS NULL`, así que da **0** y la pantalla dice "todo bien". Fix de una línea en la vista:
`count(*) FILTER (WHERE coalesce(m.tiempo_historico,0) <= 0)`. El arreglo de fondo es
cargar los 34 tiempos.

---

## 🟠 IMPORTANTE

### 6. La regla de oro del costeo NO está garantizada por el modelo

`precio_servicio_pieza.proceso` **no participa del join** de `v_costo_componente` (el join
es por `proveedor_servicio_id + componente_id`). Es una etiqueta de texto libre, sin FK, y
los valores ya divergen: `precio_servicio_pieza.proceso` en minúscula (`niquelado`) vs
`proveedor_servicio.proceso` en Title Case (`Niquelado`), más `'Templado, Cementado'` que
son dos procesos en una celda.

O sea: `UPDATE ... WHERE proceso = 'Niquelado'` no actualiza nada. El "sube el niquelaje,
un update y todo se revaloriza" depende hoy de adivinar la capitalización. **Falta una
maestra `GP2.proceso` con FK.**

Lo mismo con la tarifa: **33 de 68 filas de `precio_servicio_pieza` son redundantes** (el
niquelado de Guazzaroni está repetido en 17 filas). Falta `tarifa_servicio(proveedor,
proceso, unidad, precio)` como capa por defecto, dejando `precio_servicio_pieza` solo para
las excepciones reales (Pedernera cromado tiene 35 tarifas distintas: ahí sí es por pieza).

### 7. El precio del cartón sigue cocinado en 73 filas

4 tarifas ($89 / $66,75 / $42,72 / $35,60) repetidas en 73 filas de `precio_proveedor`.
`carton_formato` **no tiene columna de precio**, así que la frase "sube el pliego y se
recalculan las 4 tarifas" hoy **no es cierta**: el formato es una etiqueta, el precio sigue
por componente. Falta `precio_pliego` + `posiciones_x_pliego` en la maestra y que la vista
lo lea. (Nota: hay 3 cartones en formato C con $79 — los pelapapas, descuento por volumen.)

### 8. `precio_proveedor` no sabe quién es el proveedor

No tiene FK a `proveedor_insumo`: el proveedor vive en `cod_prov` (text sin destino) y
embebido en el texto de `producto`. Mientras siga así, "la tarifa vive en el proveedor" no
se puede implementar: no se puede pedir "la lista de Basconia" sin parsear strings.

**Bug latente**: los 9 precios de Recicor están cargados como referencia
(`componente_id NULL`) con fecha más nueva que los vigentes de Corrugadora del Plata. El
día que alguien los vincule a un componente, **las 9 cajas cambian de proveedor solas y en
silencio** (el único desempate es `fecha_lista DESC`). Hoy el discriminador es una
mayúscula en `rubro` (`caja` vigente vs `Caja` referencia): convención invisible.

### 9. Monedas: dos criterios distintos dentro de la misma vista

`v_costo_componente` normaliza defensivo en compras (`upper(...) LIKE '%US%'` else ARS)
pero compara **estricto** en servicios (`= 'USD'` / `= 'ARS'`). Un valor fuera de esos dos
en `precio_servicio*` **desaparece del costo en silencio**. Hoy no pasa (87/87 en 'ARS'),
pero `precio_proveedor` ya tiene un tercer valor: 11 filas en `'Peso'` (cartones viejos sin
componente, hoy inocuas). Falta maestra de monedas o un CHECK.

### 10. Cinco flejes redondos que la OC no está pidiendo (~478 kg/mes)

C3, E4, E5, E13 y E1 tienen consumo real en unidades pero `consumo_kg_mes = 0` → máximo
null → la OC los ignora. El peso **está cargado** en `fleje_detalle.kg_x_uni`; lo que falla
es que `v_consumo_fleje_kg_v2` necesita la matriz de corte para convertir, y estos entran
directo al armado (mismo patrón ya anotado de GRJ10). E4 y E5 tienen stock 0.

### 11. La receta que no cierra con la ruta deja 5 componentes en consumo 0

Si la receta lista un componente que **no es el último de la ruta**, todo lo que viene
después queda en cero (la vista siembra desde la receta y camina hacia atrás). Casos:
E6-M194 (570, 858), D5-M78 y D6-M78 (507), B1-M78 y B2-M78 (707). No aparecen en Faltantes
ni en Orden de Producción, y el costeo se saltea la mano de obra de las matrices 78 y 194.

### 12. Discontinuados que siguen en artículos activos

C12 y BOM10 (en 515 con 334 uni/mes y 615 con 46), el Cartón 516 (en 516 con 333 uni/mes) y
V18C (hijo de M1, 3.763 uni/mes). Se costean en **$ 0**, así que esos artículos salen
subvaluados. Y el artículo **574 está `discontinuado=true` pero tiene 936 uni/mes en la Est
Madre** — contradicción abierta: o la Est Madre está vieja o el flag está mal.

### 13. La normalización de cartones se aplicó sin migración

`carton_formato`, `carton_categoria` y las columnas `componente.carton_formato/categoria`
existen en la base pero **no tienen migración** (las tablas de precios del 30-08 sí la
tienen). Un rebuild desde migraciones no las tendría. Falta la migración retroactiva.

### 14. El respaldo `db/` quedó viejo

Export del 29-08: 84 funciones / 7 vistas / 41 tablas, contra **100 / 15 / 49** vivas. Falta
todo el motor de costos. Hay que regenerarlo.

---

## 🟡 MENOR (anotado, sin urgencia)

- **`carton_categoria` nació muerta**: 5 filas, 0 componentes asignados. Ganó
  `carton_formato`. Dos mecanismos para lo mismo, del mismo día.
- **El banner de Valorización miente**: sigue diciendo "precios de regulación, todo vale
  1 USD" cuando 241 de 278 filas ya tienen precio real (`Valorizacion_GP2.html:51-52`).
- **Los discontinuados se valorizan en $0 sin aviso** (`faltan_precios = 0`): hoy inocuo
  porque ninguno tiene stock, pero es una bomba silenciosa.
- **Un componente sin código** (id 522, "Cartón 506"): el índice único es parcial
  (`WHERE codigo IS NOT NULL`), así que los NULL se escapan.
- **44 componentes de Tránsito sin `kg_x_uni`** (el 100%) y 54 matrices sin
  `partes_por_kilo_de_fleje`: en esa intersección no hay ni peso ni fallback.
- **El máximo de 5 cajones tiene 2 pendientes, no 1**: se sumó C13 a Z12.
- **3 rutas huérfanas sin artículo** (35, 151, 152); la 151 tiene dos pasos completamente
  vacíos. Son los únicos 4 pasos anómalos de 2.432.
- **5 remaches huérfanos totales** (CV10, CV11, CV14, CV16, V11): sin estado, sin receta,
  sin ruta, sin BOM. Y los pares CV→V de niquelado siguen sin crearse.
- **`est_madre.cod` va sin ceros a la izquierda** y `articulo.codigo` con ceros: un join
  literal pierde 10 artículos y 17.434 uni/mes. Las vistas ya normalizan; cuidado en
  queries nuevas.
- **21 pares de rutas comparten nombre** pero ninguna es duplicado real (distinto
  tallerista o distintas matrices). El nombre no discrimina la variante.
- **`movimiento.ubic_origen_id` está 100% NULL** en las 58 filas: verificar si es diseño o
  hueco de trazabilidad.
- **Las 15 vistas son security-definer de hecho** (sin `security_invoker`): hoy inocuo
  porque todas las tablas base son legibles por anon.
- **Cascada de recálculo**: `proyeccion_madre → est_madre → recalcular_maximos_insumos`
  recalcula el walk completo **una vez por fila** (369 filas × ~30 ms) cada miércoles.
- **12 funciones sin llamador** en el repo, y 2 trigger-functions sin trigger
  (`fn_espejo_produccion`, `fn_espejo_entrega_tallerista`).
- **La suite (29 tests) pasa 29/29 pero quedó ciega**: todos stubean Supabase, así que un
  cambio de schema no los toca. `test_oc.js` no tiene `precio_por_kg` en el stub — por eso
  el bug del clavo pasó sin despeinarse.

---

## Lo que está SANO (para que quede constancia)

- **Integridad referencial impecable**: 0 huérfanos en recetas, BOM, inventario y rutas;
  0 duplicados de (código, sector); 0 stock negativo; 85/85 artículos con receta, rutas,
  cartón y caja.
- **El JS no duplica el motor de costos**: Valorización solo re-suma lo que devuelve la
  vista y nunca inventa un tipo de cambio.
- **Las 96 funciones tienen `search_path` fijo** y anon no tiene CREATE en ningún schema:
  el vector de escalada por SECURITY DEFINER está cerrado por partida doble.
- **Cero SQL dinámico** en las funciones: sin superficie de inyección.
- **El cron del dólar está sano e intacto** (jobid 65, 09:10 UTC).
- **`oc_bundle` filtra `estado_compra is null`**: los discontinuados no aparecen en la OC.
- **Los joins del front van por `id`, no por código.**
- **Las tablas de precios nuevas tienen las UNIQUE y FKs correctas.**

---

## Orden sugerido

1. **Hoy**: revocar `inv_delta` (una línea, no rompe nada). Decidir qué hacer con
   `empleado` (requiere migrar `abm_GP2.html` a RPC primero).
2. **Cuando haya datos**: los 13 placeholders con estado NULL (5 filas resuelven el 80%:
   C13, BOM8, BOM12, BOM13, BOM14) y los 34 tiempos de matriz.
3. **Cuando se toque costos**: maestra de `proceso` + `tarifa_servicio` (mata 33 filas
   redundantes y es lo que hace verdadera la regla de oro), precio del pliego en
   `carton_formato` (mata 70 más), FK de proveedor en `precio_proveedor`.
4. **Higiene**: migración retroactiva de cartones, regenerar `db/`, arreglar el semáforo
   `faltan_tiempos`, sacar el banner viejo de Valorización.
