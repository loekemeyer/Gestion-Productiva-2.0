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

## Estado 2026-08-29: el módulo YA EXISTE

`Compras/OC_GP2.html` (menú Insumos → Órdenes de Compra): genera OC desde el consumo con
sugerido = consumo × meses − stock − pendiente OC, valida las reglas de cartón (dormidas
hasta asignar formato), imprime la OC para el proveedor, y la **recepción cruza sola**
contra las OC abiertas (`recibido` + estado `recibida` automático). RPCs: `oc_bundle`,
`crear_oc`, `oc_marcar`, `_aplicar_recepcion_a_oc`.

## Proveedores por rubro (cargados 2026-08-29, dato del usuario)

- **Cartones → `Talleres Gráficos Pol`** (siempre el mismo, los 85 códigos).
- **Cajas → `Corrugadora del Sur`** (siempre el mismo, los 9 códigos).
- **Flejes →** el que ya tenía cada uno en `fleje_detalle` (Basconia 23, Aperam 11,
  Hermac 6, Brawin 6, Szapiro, JL Metales, EstaMetal, Altrak): 50 copiados a
  `componente.proveedor`.
- **`Importado`** (proveedor marcador, no es una empresa): la **Cremallera (E13)** y los
  insumos del **corta queso** (Z19A Alambre, PB1 Cilindro, V20/CV20 Tornillo) ya **no se
  fabrican, se importan**. Las rutas ya son consistentes: E13 y Z19A entran como paso
  `insumo` (compra directa, sin matriz). PENDIENTE: si el tornillo se importa YA
  niquelado, el paso CV20 → niquelado (Guazzaroni) de las rutas 382/577/589 queda muerto
  y hay que sacarlo; si se importa en crudo, queda como está.
- **Plásticos → `Pat Bet Plast`** (29 códigos). El nombre se escribe así, literal. La
  asignación NO se inventó: sale del dato real del vecino `public.Partes_Plasticas`
  (columna Proveedor), matcheando por código y **excluyendo** las piezas que en GP2
  produce un tallerista. OJO: el vecino atribuye **todas** las plásticas a Pat Bet Plast
  (más 2 a Esther: PC2A/PC2B, y 2 a Maspoli: PC12/PEP7) — **no** tiene ninguna a nombre de
  Pettofrezza, aunque hoy también inyecta. PENDIENTE: cuáles pasaron a Pettofrezza.
- **Garage (GRJ1, GRJ7, GRJ10, GRJ10A)**: NO llevan proveedor — los arman los talleristas,
  no se compran.
- **Becker Sandra Nora NO es proveedor de insumos**: es `proveedor_servicio` (pintura /
  serigrafía de piezas metálicas). No confundir.

Faltan proveedor: 8 plásticos (ver abajo), bombillas/resortes 8, remaches 8, fleje F12.

## Pendientes

- Asignar formato/categoría a cada cartón (`componente.carton_formato/carton_categoria`).
- Varillas: proveedor y forma de control.
- Proveedor de: los 8 resortes (BOM10, C9, C12, D14, EP10, I2, I3, LLF8), los 8 remaches
  (V4, V10, V13, V14, V18D, W8, CV13, CV18D) y el fleje F12 (N° 49).
- Los 8 plásticos que quedaron sin proveedor y por qué:
  - `PA10B` Capuchón ф8 s/Serig, `PC16` Inserto Chef — códigos nativos de GP2, el vecino
    no los tiene (PA10B parece la variante sin serigrafía de PA10 = Pat Bet Plast).
  - `PC15A` Cpo doble aleta LK, `PC15B` Cuerpo Sac Aleta, `PEP5` Mango Madera — el vecino
    los tiene con proveedor VACÍO (PEP5 además es de madera, no inyección).
  - `PC12`, `PEP7`, `PEP8` — en GP2 los produce **Maspoli SRL** como tallerista (paso de
    ruta), no se compran como insumo. El vecino coincide en PC12/PEP7 (Maspoli) pero pone
    PEP8 bajo Pat Bet Plast: conflicto a resolver.
- Prov AT: se les manda según la OC de Producción Virgilio (sin punto de stock propio).
- Meses de punto de stock ya definidos: flejes 6, crudo 1, procesado 1, talleristas 1,
  tránsito 0, cartones 6, cajas 6, remaches 4, plásticos 4, bombillas 3.
- **Máximos de flejes e insumos (regla 2026-08-29)**: surgen de la **Est Madre llevada
  para atrás** (consumo mensual explotado por receta/rutas × meses del rubro), NO de
  relevamiento físico. `inventario.maximo_origen='est_madre'`; se **recalculan solos**
  (triggers en est_madre / recetas / rutas, función `recalcular_maximos_insumos`). Los
  máximos FÍSICOS ya relevados (cajas, 11 remaches del vecino) tienen origen `fisico`
  y nunca se pisan. En Punto de Stock los derivados se ven con el tag **EM**.
- Virgilio: NO interesa analizar su entrada/salida — existe solo para medir a los
  talleristas (decisión usuario 2026-08-29). No se construye módulo de despacho/venta.
- ~~Flejes, cartones, plásticos y bombillas sin máximo~~ RESUELTO 2026-08-29: sus máximos
  se derivan de la Est Madre (ver regla arriba), ya no requieren relevamiento.
- Cartones: el formato (C/LOKE/8) de cada cartón se va a identificar POR PRECIO —
  los precios del cartonero están copiados en `GP2.precio_proveedor` (rubro carton).
- Máximos físicos: importados del vecino (SP 80, SC 74, cajas 9, remaches 13) + Virgilio
  (81 posiciones: también se guardan insumos/partes en Virgilio — SP y cajas con sus
  máximos "Virg" del vecino) + talleristas (103, CALCULADOS = 1 mes de Est Madre de los
  artículos que hace cada uno, parte por parte según sus rutas y recetas). Faltan:
  flejes, cartones, plásticos y bombillas (el vecino no los tiene).
- Costos: el vecino tiene precios de cartones en `public.Precios_Proveedores` (por texto
  de producto, sin cod_art); GP2 aún no tiene costos.
