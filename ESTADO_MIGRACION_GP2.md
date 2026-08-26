# Estado migración a GP2 — resumen (sesión overnight)

> Todo corre sobre el schema **`GP2`** de Supabase (`hrxfctzncixxqmpfhskv`). Nada inventado: lo que no tenía dato quedó **pendiente**, no relleno.

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
  - **Falta que vos decidas** el mapeo de los **6 ambiguos restantes**: Chormium/Gaston Almafuerte ("Pavonado" → ¿Mabra Metalurgica, o propios?); New Metal ("Templado" → ¿Laboratorio FAAT, o propio?); Ximpa ("Serigrafiado" → ¿Hernandez Julio? nombre distinto); AJ Adhesivos ("Adhesivado") y Esther ("Calado") **no tienen proceso equivalente** en GP2 (¿se crean como PS nuevos?).
- **Obj 3 — Compra insumos x prov**: ⏸️ **bloqueado** → hay que modelar OC/Insumos en GP2 (diseño, lo vemos juntos).

## 5) Pendientes para vos (decisiones / datos)

1. **Mapeo de los 6 Prov. Servicio ambiguos** restantes → GP2 (los 4 claros + 3 pintores ya cargados; ver Obj 2). Además **razón social de Daniel y Rec Color**. Esto desbloquea el resto del ledger PS.
2. **Modelar OC/Insumos** en GP2 (desbloquea Obj 3 y la alerta de stock bajo mínimo).
3. **Códigos de cartón NULL** (~14) y **familias NULL** de los Prov AT (me los ibas a pasar).
4. **Stock inicial / conteo** (cuando lo cargues, el ledger deja de dar negativos).
5. Gaps marcados: **Remaches** (crear en GP2), **Flejes** (48/53 sin peso — revisar), GRJ en entregas, artículos faltantes.

## 6) Nota de seguridad

- El advisor de Supabase marca **RLS deshabilitado** en las tablas de `GP2` (cualquiera con la anon key lee/escribe). No lo toqué (activarlo sin políticas rompería la app). **Decisión tuya** para producción.

## 7) Write-backs pendientes

- Edición/anulación de producción (Disruptivas/Maestro), carga de envíos/recepción, ABM escritura: quedaron **solo-lectura**. El escritor vivo (app/n8n → public → espejo) se define aparte.
