# GP2_MAPA.md — Contratos de los bundles del schema GP2

> **Para que sirve:** antes de escribir o tocar una pantalla que hable con GP2, buscar
> aca el contrato del bundle. Extraido del codigo de los modulos conectados
> (2026-08-28). Complementa `ANALISIS_GP2_2026-08-28.md` y `SQL_GP2_PENDIENTES.sql`.

## Regla de oro

**NO existe una convencion unica: cada `*_bundle` serializa a su manera.** La misma
entidad cambia de nombre y forma entre bundles (`rp` con `tp/m/pr/ta` en Programa vs
`tipo/mat/prov/tall` en Movimientos; `sect` como `{t}`, `{nom}` o `{nom,tipo}`;
`tall` como string plano o `{nom}`; `mat.r` ≡ `mat.ppk`). **Nunca copiar el shape de
un bundle a otro modulo sin verificar.** Al crear bundles nuevos, converger al
"diccionario canonico" de abajo.

Patron de consumo comun a todos:

```js
var SB = createClient(URL, ANON_KEY, { db: { schema: 'GP2' } });
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
| `rp` | dict `String(ruta_id)` → lista de pasos `{ o, tp, ce, cs, m, pr, ta }`. **Nombres CORTOS**: `tp` ∈ ingreso\|fleje\|matriz\|proveedor_servicio\|tallerista\|afilado\|virgilio; `m`→mat, `pr`→prov, `ta`→tall. Se ordena por `o` |
| `art` | LISTA `{ id, cod, fam }` |
| `bom` | LISTA plana `{ a (art_id), c (comp_id), q }` |
| `children` | dict `String(comp_padre)` → lista `{ c, q }` (sub-BOM; su existencia define "convergencia") |
| `mat` | dict `String(matriz_id)` → `{ n, d, r }`. `r` = rendimiento uni/kg (mismo dato que `ppk` en otros bundles) |
| `prov` | dict → `{ n (nombre), p (proceso) }` |
| `tall` | dict → **string plano** con el nombre (puede traer espacios colgantes → `.trim()`) |
| `rutas_by_art` | dict `String(art_id)` → lista `{ id (→rp), f (comp_id del fleje; null = ruta de insumo) }` |
| `tall_art` | dict `String(art_id)` → lista de NOMBRES (strings) de talleristas alternativos |

## faltantes_bundle() — Faltantes/Faltantes.html (solo lectura)

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

**Escritura**: `SB.from('movimiento').insert([{ fecha, tipo_mov, comp_id,
ubic_origen_id, ubic_destino_id, cantidad, comp_transformado_id,
cantidad_transformada, unidad_origen, unidad_destino }])` — los triggers
`fn_movimiento_calc`/`fn_movimiento_aplicar` actualizan `inventario`. Existe la RPC
`registrar_movimientos(p_rows jsonb)` sin usar: decidir una via y borrar la otra.

## verificacion_bundle() — Verificacion/Verificacion_GP2.html (solo lectura)

| Clave | Forma |
|---|---|
| `rutas` | LISTA `{ art, fam, fleje, fleje_desc, nom, ce_sect, cs_sect, pasos[] }`. `nom/ce_sect/cs_sect` solo alimentan la busqueda |
| `rutas[].pasos` | lista ordenada `{ tp, actor, ... }`. `tp` ∈ ingreso\|matriz\|insumo\|proveedor_servicio\|tallerista\|virgilio |
| `counts` | `{ rutas, arts, pasos }` (informativo) |

Falta persistencia: no puede guardar confirmaciones/problemas (ver
`SQL_GP2_PENDIENTES.sql` §2: `ruta_confirmada` / `ruta_problema` + RPCs).

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
| `empleados` | dict legajo → nombre (string). **Suplanta la tabla empleado que no existe** (ver SQL_GP2_PENDIENTES.sql §1) |
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
| `tall[].nom` | `tallerista.nombre` (+ `cod_prov`, `clase`) |
| `bom_comp` | `componente_bom.componente_padre_id` / `.componente_hijo_id` / `.cantidad` |

`movimiento`: `id, fecha, tipo_mov, comp_id, ubic_origen_id, ubic_destino_id,
cantidad, comp_transformado_id, cantidad_transformada, unidad_origen,
unidad_destino, _delta_orig, _delta_dest` (los dos ultimos los calcula el trigger
`fn_movimiento_calc`; no escribirlos a mano).

**`ubicacion.tipo` tiene CUATRO valores, no tres**: `sector`, `tallerista`,
`proveedor_servicio` y **`virgilio`** (id 33, la distribucion). Los 84 articulos
terminados (sector 12) no tienen ubicacion de sector: viven en Virgilio.

`tipo_mov` en uso: `compra`, `envio_ps`, `envio_tallerista`, `fabricacion`,
`entrega_tallerista`, `consumo_armado`. `crear_entrega_ps` escribe `entrega_ps`.

**Como funciona el motor de stock**: al insertar en `movimiento`,
`fn_movimiento_calc` convierte cantidades a la unidad canonica del componente con
`to_canonical` y guarda `_delta_orig`/`_delta_dest`; despues
`fn_movimiento_aplicar` llama a `inv_delta` restando en el origen y sumando en el
destino (`coalesce(comp_transformado_id, comp_id)`). Una ubicacion en `null` se
ignora, asi que una compra (sin origen) solo suma y un consumo (sin destino) solo
resta. **En DELETE el trigger revierte exactamente** — verificado.

⚠ **Inconsistencia a vigilar**: `crear_envio_ps`, `crear_entrega_ps` y
`crear_envio_tallerista` buscan la ubicacion de un sector **por nombre**;
`crear_recepcion_insumo` y `crear_entrega_tallerista` la buscan **por `ref_id`**.
Hoy coinciden en las 11 filas, pero renombrar un sector rompe las tres primeras.

## Pendiente de verificacion

1. `has_function_privilege('anon', oid, 'EXECUTE')` — que puede tocar la anon key
   (critico: GP2 concentra todo el stock en `inventario`/`movimiento`).
2. Cuerpo de los bundles de lectura, para confirmar los shapes de arriba contra
   el SQL (hoy estan inferidos del JS que los consume).
3. `fn_espejo_produccion` / `fn_espejo_entrega_tallerista`: sobre que tablas
   estan colgados y en que direccion espejan.

Las queries exactas estan al final de `SQL_GP2_PENDIENTES.sql`.
