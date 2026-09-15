# Inyectores — material por pieza: CERRADO (2026-09-15)

**Giro respecto de lo que yo creía:** el modelo de inyección **ya estaba en la base** vía
`componente.material_id` (la resina que usa cada pieza) + ubicación de inyector +
`enviar_material_inyector` + la pantalla `Compras/Inyectores_GP2.html`. **NO hubo cirugía de
rutas ni cambio de costeo**: las piezas se costean por su **precio de compra** (`origen='precio'`
en `v_costo_componente`), no por el material; `material_id` solo maneja la **demanda de resina**
(cuánta bolsa mandarle al inyector) y el descuento de resina al recibir la pieza.

## Estado final (48 piezas; PEP5 "Mango Madera" queda sin material a propósito: es madera)
- **45 ya tenían `material_id` correcto** (coincidía con la planilla del usuario, `db/Conteo_y_Pedido_Sector_Plastico_VACIO.xls`).
- **Se completaron/corrigieron 3, con los datos que dio el usuario (2026-09-15):**
  - **PA3** (Muñeco Antiderrame) → **Santoprene** (`SANTO`, id 930, creada sin precio) + kg 0,008 (de la planilla).
  - **PC16** (Inserto Chef) → **PP 2630** + kg 0,0038.
  - **PB8A** (Mgo Sacac Plast) → cambiado de PP a **ABS** ("seguí lo que dice la planilla").
- **Santoprene creada sin precio** (`componente` sector 14 + inventario 0 en ubic 57). Hasta que
  tenga precio, la demanda/costeo por material de PA3 no computa (PA3 igual costea por su precio de compra).

## Invariantes tras los cambios
A2 (inyector con material sin ubicación) = 0. Sin stock negativo. Único invariante > 0 = AE=2,
**preexistente** (artículos 537/567 sin receta/ruta, no es de este trabajo).

## Lo que NO se hizo, a propósito
- **No aparecen en "Prov. de servicio" del Tablet.** En GP2 los inyectores son **inyectores**
  (`proveedor_insumo` + `material_id`), NO `proveedor_servicio`. Modelarlos como PS con rutas sería
  un segundo modelo redundante que choca con el que ya existe. El envío de bolsas al inyector vive
  en `Compras/Inyectores_GP2.html` (`enviar_material_inyector`). Si el usuario quiere un acceso
  directo desde el Tablet, es re-linkear esa pantalla (lo que se había hecho y se sacó), no crear PS.
