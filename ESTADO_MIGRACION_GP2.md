# Estado migración a GP2 — resumen (sesión overnight)

> Todo corre sobre el schema **`GP2`** de Supabase (`hrxfctzncixxqmpfhskv`). Nada inventado: lo que no tenía dato quedó **pendiente**, no relleno.

## ⚠️ ACTUALIZACIÓN 2026-08-29 (leer antes que el resto — el detalle de abajo quedó viejo)

Lo que cambió después de este documento (fuente de verdad: `LOCKS.txt` [HISTORIAL] + git):

- **El ledger se VACIÓ y se sembró data de PRUEBA** (58 movimientos `stock_inicial` del top
  10 Est Madre). Los números de ledger de abajo (envíos 1.072, entregas 3.386, PS 339/161)
  ya no están en la base: falta cargar el **stock inicial real**.
- **`GP2.produccion` hoy corre vacía**: el trigger espejo de `db_n8n_espejo` NO está colgado
  (decisión pendiente del usuario: espejar la app vieja o pasar las tablets a la app GP2).
  La app Operarios GP2 escribe nativo vía `registrar_evento_prod` (con premio nativo).
- **Obj 3 (OC insumos) DESBLOQUEADO y construido**: módulo `Compras/OC_GP2.html`, la
  recepción cruza contra OC, reglas en `REGLAS_OC_INSUMOS.md`.
- **Módulos nuevos GP2** (todos en menú `GP2_MODULOS.html`): Recepción Insumos (control por
  proveedor, paquetes de cartón), Punto de Stock, Stock Tránsito PS, Stock en Movimiento,
  Envío Cartón/Cajas Prov AT, Devolución Cervantes (con "Para Analizar"), Control Envíos y
  Entregas (pivote), Problemas con Matrices, Monitor 2.0, Órdenes de Compra, Relevamientos.
  ABM Artículos ahora también **edita el BOM** (con avisos de normalización vs rutas).
- Los historiales de talleristas por fecha se cubren con **Control Envíos y Entregas**
  (pivote partes × fechas sobre el ledger); `envios_tallerista_bundle` /
  `entregas_tallerista_bundle` quedaron sin pantalla propia.
- **Pendientes vigentes** (2026-08-29): stock inicial real, varillas (lunes), formatos de
  cartón por precio, máximos de flejes/cartones/plásticos/bombillas, proveedores de 157
  insumos, decisión RLS, decisión espejo producción, PB6 en recetas, tránsito/_bak_*,
  1.292 entregas históricas de Virgilio.

## 1) Base / motor

- **Schema renombrado** `nuevo` → `"GP2"` (DB, funciones, PostgREST, frontends).
- **Espejo de Producción**: `public.db_n8n_espejo` → `GP2.produccion` (14.394 filas, trigger vivo + backfill).
- **Motor `movimiento` → `inventario`** activo. Ledger cargado:
  - **1.072 envíos a talleristas** (parte → tallerista).
  - **3.386 entregas** (explosión de BOM, modelo B: consume las partes del tallerista → Virgilio).
  - Conservación de masa exacta (suma inventario = 0). **Saldos negativos = esperado** (ledger parcial: falta producción/stock inicial).
  - **Trigger espejo de entregas** vivo (tablas base `Entregas Tallerista Virgilio` + `Cervantes`).

## 2) Prov AT (proveedores de artículo terminado)

- Modelo nuevo: `tallerista.clase='prov_at'`, ruta `insumo(cartón) → tallerista(Prov AT) → virgilio`, BOM = solo packaging.
- **125 artículos** (arrancó en 84). Proveedores cargados: **Lopez Jose** (coladores), **Pintos** (madera), **Maspoli**, **Pettofrezza**, **Carriero**, **The Plast**, **Melinox**, **Paternal Goma**.
- No confiables (Cabral, Manfer, Kuffo): sin artículos reales propios → nada creado.

## 3) Módulos conectados a GP2 (~20)

| Módulo | RPC GP2 |
|---|---|
| Programa de Stock | programa_bundle |
| Faltantes | faltantes_bundle |
| Registrar Movimiento | (insert directo a movimiento) |
| Verificación / Trazado | verificacion_bundle |
| Despiece x Artículo | despiece_bundle |
| Producción · Rendimiento x Mes | produccion_bundle |
| Producción · Maestro | produccion_maestro_bundle |
| Inicio (dashboard) | inicio_bundle |
| Disruptivas | disruptivas_bundle |
| VerifMadres (pesos/sectores) | verifmadres_bundle |
| Informes · Rendimiento x Persona | informes_bundle |
| Informes · Rendimiento x Matriz | informes_matriz_bundle |
| Alertas | alertas_bundle |
| ABM Artículos (lectura) | abm_articulos_bundle |
| Stock General | stock_bundle |
| **Control Talleristas** (obj 1) | control_talleristas_bundle |
| Envío Talleristas (historial) | envios_tallerista_bundle |
| Entregas Talleristas (historial) | entregas_tallerista_bundle |
| Faltante Partes Tallerista | faltante_partes_tallerista_bundle |
| Proporciones | proporciones_bundle |

Todos en `main`. Se abren con Live Server. Los `*_GP2.html` conviven con los viejos.

## 4) Objetivos principales

- **Obj 1 — Control Talleristas/envíos**: ✅ funcionando (ledger + Control + historiales + trigger vivo).
- **Obj 4 — Control Producción**: ✅ mayormente (rendimiento, maestro, informes sobre `produccion`).
- **Obj 2 — Control PS/envíos/entregas**: 🟡 **arrancado (parcial)**. Ledger PS cargado para los **4 proveedores con mapeo confirmado** (por identidad de nombre + proceso): FAAT→Laboratorio FAAT, Guazzaroni→Guazzaroni Patricio, Pedernera→Pedernera Ilario, Scor→Scorrano Mario.
  - `GP2.proveedor_servicio_alias` (nombre viejo → PS de GP2).
  - **284 `envio_ps`** (SC del sector propio → ubicación del PS) + **109 `entrega_ps`** (transformación **SC→SP 1:1 canónica** vía `comp_transformado_id`; conservación exacta, suma inventario = 0).
  - **Diferido (no cargado, para no inventar)**: filas cuyos componentes SC/SP **no existen** en GP2 — sobre todo **remache-crudos** (`V*C`) = gap Remaches #6, y las **entregas de FAAT** (0/32, los SP de Templado no están modelados). Envío/entrega resueltos: FAAT 53/66 y 0/32, Guazzaroni 37/108 y 11/42, Pedernera 182/218 y 89/95, Scor 12/12 y 9/9.
  - **Pintores resueltos (2026-08-26)**: **Jade = Becker Sandra Nora** (mismo proveedor, confirmado por el usuario). **Daniel** y **Rec Color** son proveedores distintos → creados como PS propios en GP2 (proceso Pintado, `cod_prov` NULL). Ledger recargado: ahora **7 PS** en Control PS (envíos 318, entregas 143, conservación exacta). **PENDIENTE: razón social de Daniel y Rec Color** (me la debés → actualizo `nombre`/`cod_prov`).
  - **Resueltos (2026-08-26, 2ª tanda)**: **Ximpa = Hernandez Julio** (mismo, confirmado). **Chormium** (id 11) y **Gaston Almafuerte** (id 13) = propios, Pavonado (ambos pavonan la misma *Cuchilla Pelapapa*, `SC=ST`). **Esther** (id 12) = propio, Calado (mangos pelapapa 505/123, sectores plásticos PC). Ledger recargado: **339 envíos + 161 entregas**, conservación exacta, **11 PS** en Control PS.
  - **Pendientes de charlar / decidir**: **New Metal** ("Templado", 1 envío + 1 entrega de *Cuchilla Pelapapa* `SC=ST`) — ¿propio o = Laboratorio FAAT? **AJ Adhesivos** ("Adhesivado", 7 pliegos) — diferido ("después vemos para qué es"). **Razón social** de Daniel, Rec Color, Chormium, Gaston, Esther (todos con `cod_prov` NULL).
  - **A revisar juntos (recopilado del viejo)**: casos con `SC=ST` (Sector Tránsito: Cuchilla Pelapapa de Chormium/Gaston/New Metal) y con **códigos de sector plástico** (Esther PC1/PC2, varios de Ximpa PA/PB/PC) — resuelven pero conviene validar que el sector elegido sea el correcto.
- **Obj 3 — Compra insumos x prov**: ⏸️ **bloqueado** → hay que modelar OC/Insumos en GP2 (diseño, lo vemos juntos).

## 5) Pendientes para vos (decisiones / datos)

1. **PS restantes**: decidir **New Metal** (Templado, cuchilla) y **AJ Adhesivos** (diferido). Cargados ya 11 PS. **Razón social** de Daniel, Rec Color, Chormium, Gaston Almafuerte, Esther (cod_prov NULL). Validar casos `SC=ST` y plásticos.
2. **Modelar OC/Insumos** en GP2 (desbloquea Obj 3 y la alerta de stock bajo mínimo).
3. **Códigos de cartón NULL** (~14) y **familias NULL** de los Prov AT (me los ibas a pasar).
4. **Stock inicial / conteo** (cuando lo cargues, el ledger deja de dar negativos).
5. Gaps marcados: **Remaches** (crear en GP2), **Flejes** (48/53 sin peso — revisar), GRJ en entregas, artículos faltantes.

## 6) Nota de seguridad

- El advisor de Supabase marca **RLS deshabilitado** en las tablas de `GP2` (cualquiera con la anon key lee/escribe). No lo toqué (activarlo sin políticas rompería la app). **Decisión tuya** para producción.

## 7) Write-backs pendientes

- Edición/anulación de producción (Disruptivas/Maestro), carga de envíos/recepción, ABM escritura: quedaron **solo-lectura**. El escritor vivo (app/n8n → public → espejo) se define aparte.

## 8) Sesión 2026-08-28 — recepción de insumos en dos pasos + circuito de entregas

- **Recepción de insumos rehecha según el proceso real de la fábrica** (contado por el usuario):
  - **Paso 1 (carga)**: se marca todo lo que llega según el remito, SIN controlar. Aperam y
    Basconia informan kg + rollos + pallets; el resto solo kg. Quién informa rollos vive en
    la tabla **`proveedor_insumo`** (no hardcodeado).
  - **Paso 2 (control)**: un pallet por pesada. Peso de balanza + líneas "N rollos × P kg"
    (lo normal una línea; dos para el caso raro de pesos distintos).
  - **Tres chequeos en la base** (vistas `v_control_pallet` y `v_recepcion_control`):
    pallets sin pesar = 0, rollos sin clasificar = 0, y sobrante por pallet entre 4 y 8 kg
    (tara, parametrizada en tabla `parametro`).
  - Tablas nuevas: `recepcion_insumo.rollos/.pallets`, `recepcion_control` (fila por pallet),
    `recepcion_control_rollo`, `parametro`, `proveedor_insumo`.
  - RPC nuevas: `cargar_recepcion`, `pesar_pallet`, `recepcion_bundle`.
  - **UI integrada en `RecepcionInsumos_GP2.html`** (mismo diseño): el popup pide rollos/pallets
    solo si el proveedor los informa, y el botón **⚖ Control** abre el pesaje por pallet.
    Arreglado el vicio del módulo viejo: agregar/quitar una línea de rollos NUNCA modifica
    los números ya cargados.
- **`crear_entrega_tallerista` creada y probada** (la puerta que faltaba para Recepción
  Cervantes/Virgilio): un armado (GRJ) NACE en la entrega (movimiento sin origen) y solo se
  descuentan sus partes del tallerista (`consumo_armado`); una parte sin BOM sale normal.
  Los terminados van a la ubicación `virgilio`. Sin UI todavía.
- **Docs**: `GP2_MAPA.md` (contratos reales de los bundles + nombres reales de tablas),
  `ANALISIS_GP2_2026-08-28.md`, `SQL_GP2_PENDIENTES.sql` (estado por bloque).
- **Permisos del repo**: `.claude/settings.json` con allow/ask/deny (SQL sigue en ask).
- **Decisión del usuario**: `GP2.produccion` queda **vacía por ahora** (sin backfill ni
  trigger espejo enganchado — los `fn_espejo_*` existen como funciones pero NO están
  colgados de ninguna tabla; los únicos triggers vivos son los del motor de `movimiento`).
- **Ojo**: hay componentes con el mismo `codigo` en sectores distintos (ej. `A1`);
  toda búsqueda por código debe desambiguar por sector o usar `comp_id`.
