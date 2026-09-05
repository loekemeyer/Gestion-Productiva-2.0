# GP2_MAPA.md — Contratos de los bundles del schema GP2

> **Para que sirve:** antes de escribir o tocar una pantalla que hable con GP2, buscar
> aca el contrato del bundle. Extraido del codigo de los modulos conectados
> (2026-08-28, revisado 2026-09-04). Complementa `ANALISIS_GP2_2026-08-28.md` y `REFACTOR_GP2.md`.

## Regla de oro

**NO existe una convencion unica: cada `*_bundle` serializa a su manera.** La misma
entidad cambia de nombre y forma entre bundles (`rp` con `tp/m/pr/ta` en Programa vs
`tipo/mat/prov/tall` en Movimientos; `sect` como `{t}`, `{nom}` o `{nom,tipo}`;
`tall` como string plano o `{nom}`; `mat.r` ≡ `mat.ppk`). **Nunca copiar el shape de
un bundle a otro modulo sin verificar.** Al crear bundles nuevos, converger al
"diccionario canonico" de abajo.

Patron de consumo comun a todos:

```js
var SB = GP2_SB();   // supabase-config.js: schema GP2, sin sesion persistida (desde 2026-09-05; antes cada pantalla hacia su createClient)
var D = {};
function __run(){ /* todo el codigo que usa D */ }
async function __boot(){
  var r = await SB.rpc('<modulo>_bundle');
  if (r.error) throw r.error;
  Object.assign(D, r.data);   // r.data es UN objeto jsonb, no un array
  __run();
}
__boot();
```

---

## programa_bundle() — Programa/Programa.html (solo lectura)

| Clave | Forma |
|---|---|
| `sect` | dict `String(sector_id)` → `{ t }`. `t` = tipo en minusculas: crudo, procesado, transito, afilado, fleje, plástico, bombilla, remache, garage, cartón, caja, terminado |
| `comp` | dict `String(comp_id)` → `{ cod, d, s (sector_id), id }` |
| `rp` | dict `String(ruta_id)` → lista de pasos `{ o, tp, ce, cs, m, pr, ta }`. **Nombres CORTOS**: `tp` = `ruta_paso.tipo_paso` tal cual, y los valores que existen en la base (verificado 2026-09-03) son ingreso\|insumo\|matriz\|proveedor_servicio\|tallerista\|virgilio — **`fleje` y `afilado` NO existen**; `m`→mat, `pr`→prov, `ta`→tall. Se ordena por `o` |
| `art` | LISTA `{ id, cod, fam }` |
| `bom` | LISTA plana `{ a (art_id), c (comp_id), q }` |
| `children` | dict `String(comp_padre)` → lista `{ c, q }` (sub-BOM; su existencia define "convergencia") |
| `mat` | dict `String(matriz_id)` → `{ n, d, r }`. `r` = rendimiento uni/kg (mismo dato que `ppk` en otros bundles) |
| `prov` | dict → `{ n (nombre), p (proceso) }` |
| `tall` | dict → **string plano** con el nombre (puede traer espacios colgantes → `.trim()`) |
| `rutas_by_art` | dict `String(art_id)` → lista `{ id (→rp), f (comp_id del fleje; null = ruta de insumo) }` |
| `tall_art` | dict `String(art_id)` → lista de NOMBRES (strings) de talleristas alternativos |

## faltantes_bundle() — Despiece x Articulo/Despiece_GP2.html (solo lectura; lazy)

**Desde el 2026-09-05 es un envoltorio de `movimientos_bundle()`**: mismo diccionario, con `art`
como LISTA (ordenada por id) y `mat.primera` siempre boolean. Cualquier clave nueva de
`movimientos_bundle` aparece acá sola.

| Clave | Forma |
|---|---|
| `art` | LISTA `{ id, cod, fam, est }`. `est` = demanda mensual (est>0 ⇒ hay demanda) |
| `rp` | dict → lista `{ o, tipo, art, ce, cs, flje, mat, tall, prov }`. **Nombres LARGOS** (distinto de Programa). `tipo` conocidos aca: ingreso, insumo |
| `comp` | dict → `{ cod, d, s, um }`. `um==='kg'` activa logica de fleje (kg via ppk) |
| `bom_art` | dict `String(art_id)` → lista `{ c, q }` |
| `bom_comp` | dict `String(comp_padre)` → lista `{ c, q }` (existencia = es sub-conjunto) |
| `mat` | dict → `{ n, primera, ppk }`. `primera` marca la matriz preferida para conversion; `ppk` piezas/kg (mismo dato que `r` en Programa) |
| `ubic` | dict `String(ubic_id)` → `{ tipo ('sector'\|'tallerista'\|'proveedor_servicio'), ref (id → tall/prov_serv), meses }. meses 0/null excluye` |
| `inv` | dict `'compId:ubicId'` → `{ min, cant }`. min<=0 excluye la fila |
| `tall` | dict → `{ nom }` (**objeto**, no string — distinto de Programa) |
| `prov_serv` | dict → `{ nom }` |
| `sect` | dict → `{ nom }` |

## movimientos_bundle() — Movimientos/Registrar_Movimiento.html (lee bundle, escribe `movimiento`)

Shape tomado del snapshot que estaba congelado en el HTML (fixture completo en el
repo git: linea 114 del archivo antes del commit del 2026-08-28). Claves que el
codigo CONSUME: sect, ubic, comp, prov_serv, tall, mat, bom_art, bom_comp, rp, c2a
(`art` e `inv` vienen en el bundle pero nadie los lee en esta pantalla).

| Clave | Forma |
|---|---|
| `sect` | dict → `{ tipo, nom }` (ej. `{tipo:'crudo', nom:'Sector Crudo'}`) |
| `ubic` | dict → `{ tipo, ref, nom, meses }` |
| `art` | LISTA `{ id, cod, fam, cja, por, est }` |
| `comp` | dict → `{ cod, d, s, um, kg_x_uni }` |
| `prov_serv` / `tall` | dict → `{ nom }` |
| `mat` | dict → `{ n, d, tipo, ppk, primera }` |
| `bom_art` / `bom_comp` | dict → lista `{ c, q }` |
| `rp` | dict → lista `{ o, tipo, flje, mat, prov, tall, ce, cs, art }` (nombres largos + `flje`) |
| `inv` | dict `'compId:ubicId'` → `{ cant, min }` |
| `c2a` | dict `String(comp_id)` → art_id (componente terminado → su articulo) |

**Escritura**: SOLO por RPC. Desde el 2026-08-31 `anon` no tiene INSERT/UPDATE en ninguna
tabla GP2: `gp2-motor.js` manda las filas a `registrar_movimientos(p_rows jsonb)` (que las
inserta tal cual, con el CHECK de vocabulario de `tipo_mov`) y cada flujo tiene su
`crear_*`. Los triggers `fn_movimiento_calc` / `fn_movimiento_aplicar` actualizan `inventario`.
Un `SB.from('movimiento').insert/update` desde una pantalla falla con "permission denied"
(así estaba roto «Desmarcar» en control-cajas/control-remaches hasta el 2026-09-05:
ahora `descontrolar_recepcion`).

## verificacion_bundle() — Verificacion/Verificacion_GP2.html (solo lectura)

| Clave | Forma |
|---|---|
| `rutas` | LISTA `{ art, fam, fleje, fleje_desc, nom, ce_sect, cs_sect, pasos[] }`. `nom/ce_sect/cs_sect` solo alimentan la busqueda |
| `rutas[].pasos` | lista ordenada `{ tp, actor, ... }`. `tp` ∈ ingreso\|matriz\|insumo\|proveedor_servicio\|tallerista\|virgilio |
| `counts` | `{ rutas, arts, pasos }` (informativo) |

La persistencia de confirmaciones/problemas vive en `ruta_revision` (RPCs `ruta_confirmar` /
`ruta_reportar` / `ruta_resolver`); la pantalla de esta seccion se fusiono en Despiece_GP2.

## despiece_bundle() — Despiece x Articulo/Despiece_GP2.html (solo lectura)

| Clave | Forma |
|---|---|
| `art` | LISTA `{ cod, fam, por, comp[] }` — **sin `id`**: la identidad es `cod` |
| `art[].comp` | lista `{ cod, d, s, q, kg, uxc, um }` |
| `sect` | dict → `{ nom, tipo }`. `nom` obligatorio (lo usa el export CSV) |

## produccion_bundle(p_matriz, p_anio) — Produccion/rendimiento_GP2.js (solo lectura)

Se llama 2 veces: sin args al init (usa `matrices` + `empleados`) y con
`{p_matriz, p_anio}` (usa `rows`).

| Clave | Forma |
|---|---|
| `matrices` | LISTA `{ N_Matriz, Matriz }` (N_Matriz admite sufijo tipo "101B") |
| `empleados` | dict legajo → nombre (string), derivado de `produccion` (la tabla `empleado` existe y la usan otros bundles; este todavia no la lee) |
| `rows` | LISTA de filas de produccion YA filtradas por el RPC (Eliminar<>'S', Legajo<>1, Uni>0, Tiempo_Toma>0). Campos con nombre LEGACY: `Fecha` ("YYYY-MM-DD..."), `Legajo`, `Uni`, `Segundos_Trabajados`, `Tiempo_Toma`, `Premio`, ... |

---

## Convenciones implicitas (fragiles — hoy viven hardcodeadas en el JS)

- **Ids de ubicacion por offset** en Registrar_Movimiento.html: `ubic_tall = 20 + tall_id`,
  `ubic_prov = 12 + prov_id`, `33 = Virgilio`, `TALL_FABRICA = 3`. Si se insertan
  ubicaciones nuevas fuera de ese orden, esa cuenta se rompe. Lo correcto es resolver
  por `ubic.tipo + ubic.ref` (como hace Faltantes).
- **Sectores con semantica fija**: `comp.s === 12` = articulo terminado, `s === 9` =
  garage (Faltantes y Movimientos dependen de esos ids literales).
- `mat.r` (Programa) y `mat.ppk` (Faltantes/Movimientos) son el mismo dato con dos nombres.
- Ids siempre se indexan como `String(id)`; no esta confirmado si el jsonb los
  serializa como number o string en todos los bundles.

## Diccionario canonico sugerido (para bundles NUEVOS)

`sect {nom,tipo}` · `ubic {tipo,ref,nom,meses}` · `comp {cod,d,s,um,kg_x_uni}` ·
`art {id,cod,fam,cja,por,est}` · `mat {n,d,tipo,ppk,primera}` · `tall {nom}` ·
`prov_serv {nom}` · `rp {o,tipo,flje,mat,prov,tall,ce,cs,art}` · `inv 'c:u' {cant,min}`
— es el shape de `movimientos_bundle`, el mas completo. Los tres bundles viejos que
difieren (programa, faltantes, despiece) quedan como estan hasta que se los toque.

## Nombres REALES de las tablas (verificado 2026-08-28)

Los bundles serializan con nombres cortos; **las tablas usan otros**. Al escribir
SQL o RPCs nuevas, estos son los buenos:

| Bundle | Tabla / columna real |
|---|---|
| `comp[].cod` / `.d` / `.s` / `.um` / `.kg_x_uni` | `componente.codigo` / `.descripcion` / `.sector_id` / `.unidad_medida` / `.kg_x_uni` — **y ademas `uni_x_cajon`**, que ningun bundle expone todavia (228 componentes lo tienen cargado) |
| `ubic[].tipo` / `.ref` / `.nom` / `.meses` | `ubicacion.tipo` / **`.ref_id`** / `.nombre` / **`.meses_minimo`** |
| `inv['c:u'].cant` / `.min` | `inventario.cantidad` / **`.minimo`** (+ `componente_id`, `ubicacion_id`, `actualizado_en`) |
| `tall[].nom` | `tallerista.nombre` (+ `cod_prov`; la columna `clase` se borró el 2026-09-05: era `'tallerista'` en las 13 filas) |
| `bom_comp` | `componente_bom.componente_padre_id` / `.componente_hijo_id` / `.cantidad` |

`movimiento`: `id, fecha, tipo_mov, comp_id, ubic_origen_id, ubic_destino_id,
cantidad, comp_transformado_id, cantidad_transformada, unidad_origen,
unidad_destino, _delta_orig, _delta_dest, cajones, faltante, nota` (`_delta_*` los calcula el
trigger `fn_movimiento_calc`, no escribirlos a mano; `nota` es el texto libre del operario —
el motivo de una devolucion, desde el 2026-09-05 — y reemplaza a la tabla cabecera
`devolucion_tallerista`, borrada).

**`ubicacion.tipo` tiene CUATRO valores, no tres**: `sector`, `tallerista`,
`proveedor_servicio` y **`virgilio`** (id 33, la distribucion). Los 84 articulos
terminados (sector 12) no tienen ubicacion de sector: viven en Virgilio.

`tipo_mov` (vocabulario del ledger, verificado 2026-09-04): `compra` (recepciones de insumo y
compras de MP), `consumo` (MP consumida por un PS híbrido: Charcas/Eclipse), `envio_ps` /
`entrega_ps`, `envio_tallerista` / `entrega_tallerista` / `consumo_tall` (partes consumidas al
entregar un armado) / `devolucion_tallerista`, `envio_prov_at`, `fabricacion` (producción con
matriz), `armado_fabrica` / `consumo_prod` (armado en fábrica desde Stocks General),
`recepcion_virgilio` / `consumo_virgilio` (espejo de las entregas en Virgilio), `stock_inicial`,
`ajuste`. Antes convivían `recepcion_tall` (JS) y `consumo_armado` / `consumo_transformacion`
(SQL) para lo mismo: se unificaron en la auditoría del 2026-09-04. **Desde el 2026-09-05 el
vocabulario es cerrado**: `movimiento_tipo_mov_chk` rechaza cualquier otra palabra (también las
que manda el JS por `registrar_movimientos`). Un tipo nuevo se agrega en el CHECK y en el mapa
`TIPOS` de Stocks General / `gp2-composicion.js`.

**Como funciona el motor de stock**: al insertar en `movimiento`,
`fn_movimiento_calc` convierte cantidades a la unidad canonica del componente con
`to_canonical` y guarda `_delta_orig`/`_delta_dest`; despues
`fn_movimiento_aplicar` llama a `inv_delta` restando en el origen y sumando en el
destino (`coalesce(comp_transformado_id, comp_id)`). Una ubicacion en `null` se
ignora, asi que una compra (sin origen) solo suma y un consumo (sin destino) solo
resta. **En DELETE el trigger revierte exactamente** — verificado.

**Resolucion de ubicaciones (desde el 2026-09-04): una sola puerta, `ubic_de(tipo, ref_id)`.**
Antes `crear_envio_ps`, `crear_entrega_ps` y `crear_envio_tallerista` buscaban la ubicacion
**por nombre** y el resto por `ref_id` (renombrar un sector rompia tres funciones). Ahora las
~25 busquedas de 32 funciones/vistas pasan por `"GP2".ubic_de(p_tipo, p_ref_id)`: devuelve el
`ubicacion.id` de `(tipo, ref_id)`, y para `tallerista` respeta primero
`tallerista.ubicacion_stock_id` (deposito compartido: Carlos Aguirre guarda en la ubicacion 18
«Pedernera / Carlos Aguirre», que es de tipo `proveedor_servicio`). Indices unicos sobre
`ubicacion(tipo, ref_id)` y sobre los singletons (`virgilio`, `analisis`) garantizan que la
respuesta sea una sola. Ninguna funcion busca mas una ubicacion por nombre
(`tests`: consulta `prosrc ~ 'from ubicacion .* where nombre'` da vacio).

## Pendiente de verificacion

1. `has_function_privilege('anon', oid, 'EXECUTE')` — que puede tocar la anon key
   (critico: GP2 concentra todo el stock en `inventario`/`movimiento`).
2. Cuerpo de los bundles de lectura, para confirmar los shapes de arriba contra
   el SQL (hoy estan inferidos del JS que los consume).
3. `fn_espejo_produccion` / `fn_espejo_entrega_tallerista`: sobre que tablas
   estan colgados y en que direccion espejan.

Las queries de verificacion estan en los informes de la auditoria del 2026-09-04 (`REFACTOR_GP2.md`).
