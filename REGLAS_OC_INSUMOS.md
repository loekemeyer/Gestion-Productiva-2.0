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

Los cartones se **reciben en PAQUETES**: el proveedor siempre entrega alturas de
**250 unidades** por paquete (`parametro.carton_uni_x_paquete`), sea cual sea el tipo
(el C viene de a 1.000 = 4 paquetes de 250). La recepción carga paquetes y guarda unidades.

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

## Proveedores de servicio — cuánto mandarles

Al PS **no** se le manda para llegar a X meses de stock propio. La cuenta es contra el
**MÁXIMO FÍSICO del Sector Procesado** (`inventario.maximo` del SP en su sector):
`enviar = máximo físico del SP − online en SP − online del PS`.
Ej: máximo 10, hay 5 en procesado y el PS tiene 3 → se le mandan 2 cajones de crudo
para que los convierta. Implementado como columna **"Sugerido Cajón"** en Envíos PS.
Aparte, el Punto de Stock avisa si ese máximo físico quedó desfasado contra el consumo
(estado "máximo insuficiente"). Las ubicaciones de PS no tienen `meses_stock`.

## Flejes — consumo en KG

El fleje se mide en **kg**, nunca en unidades. El consumo baja del artículo terminado
hasta la matriz que corta el fleje: `kg de fleje = consumo en unidades de la pieza /
partes_por_kilo_de_fleje de la matriz` (las partes por kilo ya incluyen el desperdicio).
Vista: `GP2.v_consumo_fleje_kg`; el Punto de Stock de flejes usa esos kg × 6 meses.

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

- Asignar formato/categoría a cada cartón (`componente.carton_formato/carton_categoria`).
- Varillas: proveedor y forma de control.
- Prov AT: se les manda según la OC de Producción Virgilio (sin punto de stock propio).
- Meses de punto de stock ya definidos: flejes 6, crudo 1, procesado 1, talleristas 1,
  tránsito 0, cartones 6, cajas 6, remaches 4, plásticos 4, bombillas 3.
- Virgilio: NO interesa analizar su entrada/salida — existe solo para medir a los
  talleristas (decisión usuario 2026-08-29). No se construye módulo de despacho/venta.
- Flejes, cartones, plásticos y bombillas NO tienen máximo físico definido (confirmado
  por el usuario): quedan sin analizar hasta que se releven.
- Cartones: el formato (C/LOKE/8) de cada cartón se va a identificar POR PRECIO —
  los precios del cartonero están copiados en `GP2.precio_proveedor` (rubro carton).
- Máximos físicos: importados del vecino (SP 80, SC 74, cajas 9, remaches 13) + Virgilio
  (81 posiciones: también se guardan insumos/partes en Virgilio — SP y cajas con sus
  máximos "Virg" del vecino) + talleristas (103, CALCULADOS = 1 mes de Est Madre de los
  artículos que hace cada uno, parte por parte según sus rutas y recetas). Faltan:
  flejes, cartones, plásticos y bombillas (el vecino no los tiene).
- Costos: el vecino tiene precios de cartones en `public.Precios_Proveedores` (por texto
  de producto, sin cod_art); GP2 aún no tiene costos.
