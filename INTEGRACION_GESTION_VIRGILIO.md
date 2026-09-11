# Integración Gestión Virgilio ↔ GP2 (spec para el repo `gestion-virgilio`)

Escrito el 2026-09-11 desde GP2. **Del lado de GP2 ya está todo hecho y probado** (3 RPC en el
schema `GP2`, con EXECUTE para `anon`/`authenticated`). Lo que falta es del lado de Virgilio
(`recepcion.js` / `index.html` de ese repo) y se hace en una sesión sobre ESE repo.

Los dos programas viven en el **mismo proyecto Supabase** (`hrxfctzncixxqmpfhskv`): Virgilio ya
llama funciones de GP2 con `supabase.schema("GP2").rpc(...)`. No hay puente ni copia de datos.

## 1. Recibir la OC de materia prima plástica

Las bolsas de 25 kg (PP, ABS, Alto Impacto, Nylons, PE, PS) las compra GP2 (`Compras/OC_GP2.html`)
y **se entregan en Virgilio 2788**. El Master Bach por ahora se entrega y stockea en Cervantes: esas
OC **no** aparecen acá (`proveedor_insumo.entrega_en = 'Cervantes 2868'`).

```js
// 1) qué OC de material están por llegar (borrador/enviada, todos los items del sector 14)
const { data: ocs } = await supabase.schema("GP2").rpc("oc_pendientes_virgilio");
// [{ oc_id, numero, proveedor, cod_prov, estado, creado_en, fecha_entrega_estimada, nota,
//    items: [{ item_id, comp_id, codigo, codigo_isis_ch, descripcion, unidad:'kg',
//              cantidad, recibido, pendiente }] }]

// 2) llegó el camión: el operario elige la OC, carga los kg de cada material y confirma
const { data, error } = await supabase.schema("GP2").rpc("recibir_oc_virgilio", {
  p_oc_id: 21,
  p_items: [{ comp_id: 742, cantidad: 350 }, { comp_id: 743, cantidad: 25 }],   // kg
  p_remito: "0001-00012345",
  p_legajo: "77"                                                                  // quién recibió
});
// data = { ok, oc_id, numero, estado ('recibida' cuando se completó), recepciones: [{comp_id, kg, recepcion_id, oc_cruzada}] }
```

Qué hace GP2 por adentro: por cada item llama a `crear_recepcion_insumo` → movimiento `compra` al
sector 14 (ubicación «Sector Materia Prima Plástica (en Virgilio)»), cruce FIFO contra las OC
abiertas de ese material (`orden_compra_item.recibido`), y la OC pasa a `recibida` sola cuando
está completa. Errores que devuelve como `error.message`: OC inexistente / ya recibida o anulada,
componente que no está en esa OC, cantidad ≤ 0.

Propuesta de UI en `recepcion.js`: una tercera entidad **«📦 Materia Prima (GP2)»** junto a
tallerista / prov AT: combo de OC (número + proveedor + fecha estimada), una fila por item con el
pendiente precargado (letra grande, `inputmode="decimal"`), remito, confirmar.

**Ledger único**: el stock de bolsas manda GP2 (`GP2.inventario` sector 14). El catálogo `Insumos`
de Virgilio con las bolsas (PP AF7, AI AF14, NR AF20, NV AF5, ABS AF3, PS AF13, PE AF10, N25 AF11,
EBA Q34) **queda por ahora** [usuario 2026-09-11: "que vivan en GV, más adelante se va a unificar
todo"]. Cuando se unifique, esos códigos se retiran de `Movimientos_Stock deposito='insumos'`.

## 2. Cajas/cajones de Sector Crudo / Procesado guardados en Virgilio

Virgilio guarda cajas de piezas (crudo y procesado) que son de Cervantes. En GP2 eso es **otro
depósito**: ubicaciones tipo `virgilio_sector` («Sector Crudo en Virgilio», «Sector Procesado en
Virgilio»). Un traslado es un movimiento `traslado`:

```js
// cajas que van de Cervantes a Virgilio ('ida') o vuelven ('vuelta'). p_cantidad en UNIDADES
// (uni_x_cajon está en GP2.componente si se carga por cajón: cantidad = cajones × uni_x_cajon)
await supabase.schema("GP2").rpc("traslado_virgilio", {
  p_comp_id: 46, p_cantidad: 2144, p_sentido: "ida", p_nota: "1 cajón L8"
});
// -> { ok, movimiento_id, sentido, stock_cervantes, stock_virgilio }
```

Para listar qué hay en Virgilio de cada sector: `stock_sector_bundle(1)` / `(2)` →
`filas[].en_virgilio` (o consultar `GP2.inventario` por `ubicacion_id = ubicacion_virgilio_id`).
Buscar componentes por código: `GP2.componente` (`codigo`, `sector_id` 1/2, `uni_x_cajon`).

## 3. Lo que NO cambia

- Las entregas de talleristas y prov AT siguen como hoy (`"Entregas Tallerista Virgilio"`,
  `"Entregas Prov AT"`, `gv_oc_aplicar_recepcion`); GP2 las espeja solo.
- Virgilio no escribe tablas GP2 a mano: **siempre por RPC**.
