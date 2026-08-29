# Reglas para el futuro módulo de Órdenes de Compra de insumos

Registrado 2026-08-29 a partir de las definiciones del usuario. Estas reglas viven
parametrizadas en Supabase (`GP2.carton_formato`, `GP2.carton_categoria`,
`GP2.proveedor_insumo.modo_control`) — este documento explica la lógica.

## Idea general

El módulo de OC debe **generar los pedidos a partir del consumo**, no de importar PDFs:

1. El consumo nace de la **Est Madre** (`GP2.est_madre`, sincronizada sola del programa viejo):
   unidades por mes de cada artículo terminado.
2. Se explota por la receta (`articulo_componente`) hasta cada insumo: flejes, cartones,
   cajas, remaches, etc. Eso ya existe como vista: **`GP2.v_consumo_parte`**
   (consumo_uni_mes por componente).
3. Con el consumo + stock + mínimos se decide cuánto pedir, y el pedido se arma
   respetando las reglas de cada tipo de insumo (abajo).

## Cartones (parametrizado en `GP2.carton_formato`)

La unidad de medida de cartones está **pendiente de definir** (posiblemente pliegos).

| Formato | Pedido total múltiplo de | Por código múltiplo de | Mínimo por código |
|---|---|---|---|
| C | 12.000 | 1.000 | 1.000 por cada múltiplo de 12.000 |
| LOKE | 16.000 | 1.000 | 1.000 por cada múltiplo de 16.000 |
| 8 | 30.000 | 1.000 | 1.000 por cada múltiplo de 30.000 |

- El mínimo por código **escala con el múltiplo**: si pido 12.000 tipo C, mínimo 1.000 de
  cada código; si pido 24.000, mínimo 2.000 de cada código. Nunca cantidades intermedias
  (1.500 no se puede).
- **LOKE** lo usan Chef y los artículos LOKE.
- **Tipo C** agrupa los códigos por categoría de pliego (`GP2.carton_categoria`):
  Pisapapas, Pelapapas, Sacacorchos, Abrelatas, y **Resto** — solo en Resto se puede
  mezclar cualquier código con cualquiera.
- Cada cartón se asigna a su formato/categoría en `componente.carton_formato` /
  `componente.carton_categoria` — **datos pendientes de cargar** (los define el usuario).

## Flejes (parametrizado en `GP2.proveedor_insumo.modo_control`)

- Se piden en kg (OC en kg).
- `rollos_remito` (Basconia, Aperam): el remito declara rollos y pallets.
- `pesaje` (Hermac, Brawin, Szapiro, EstaMetal, JL Metales, Altrak): el remito trae solo
  kg; el control en balanza es el mismo (pallets + rollos) pero sin datos declarados.
- **Varillas: pendiente** — el usuario constata cómo se controlan (lunes).

## Remaches — Bella Vista

- Se pide en kg (OC), **factura en unidades**; al anotar la recepción se convierte
  uni→kg (kg_x_uni) y el control pesa el total contra el remito (tolerancia
  `parametro.tol_ctrl_peso_pct`, hoy 2% o 0,5 kg).

## Pendientes

- Unidad de medida de cartones (¿pliegos?).
- Asignar formato/categoría a cada cartón (`componente.carton_formato/carton_categoria`).
- Varillas: proveedor y forma de control.
- Reglas de pedido del resto de los rubros (cajas, plásticos, bombillas).
