# Qué puede hacer la clave pública en Gestión Virgilio (2026-09-28)

**Solo lectura. No se cambió nada** (ni base, ni Storage, ni Edge Functions, ni el repo de Gestión Virgilio).
Proyecto Supabase `hrxfctzncixxqmpfhskv` (compartido por Gestión Virgilio, Planify, GP2 y el programa viejo).

## 0. El punto de partida

- La `sb_publishable_…` está en el repo **público** `loekemeyer/Gestion-Virgilio` → la tiene cualquiera.
  Con esa clave la base te trata como rol `anon`.
- En Gestión Virgilio **los operarios entran por legajo** (se guarda en el navegador, `vir_legajo_auth`):
  para la base son `anon`. Los supervisores entran con Google (`authenticated`).
- Consecuencia: todo lo que el operario puede hacer desde la tablet, **lo puede hacer un extraño desde su
  casa** con un `curl`. Cerrar a `anon` sin darle antes al operario una identidad en la base **rompe la
  tablet**. Por eso cada arreglo de abajo dice si toca o no a los operarios.

## 1. CRÍTICO — daño hoy, con solo la clave

| # | Qué | Medido | Toca operarios |
|---|-----|--------|----------------|
| C1 | `planify.employees` legible por anon **con `pass_hash`** (5 bcrypt), email, teléfono, fecha de nacimiento; y **INSERT abierto** | 57 filas, respuesta 206 | No |
| C2 | Política de Storage `diag_ins`: INSERT para anon **sin condición de bucket** → sube archivos a **cualquier** bucket (incl. privados `isis-lk`/`isis-ch` y el público `planify_page` = hosting de phishing con dominio supabase.co del proyecto) | política leída | No (revisar Planify diag) |
| C3 | Bucket privado `planify_sanciones` (19 archivos): anon LEE, SUBE, PISA y BORRA | políticas leídas | No |
| C4 | `planify.planify_admin_user_guardar` / `_borrar` SECURITY DEFINER **sin chequeo de quién llama** → cualquiera crea/modifica/borra usuarios admin de Planify y sus módulos | código leído | No |
| C5 | 12 tablas de `public` **borrables** por anon: `Registros Produccion Cervantes` (16.435), `db_n8n_espejo` (14.984), `Envios a Talleristas`, `Partes x Tallerista`, `Despiece x Articulo`, `Matrices`, `Articulos Virgilio X Tallerista`, `Entregas PS`, `Pendientes`, `Proporcion_Articulo_Tallerista`, `Rutas_Problemas`, `Rutas_Confirmadas` | grant + política `true` | **Sí** (la app de producción escribe `db_n8n_espejo`) |

## 2. ALTO

| # | Qué | Medido |
|---|-----|--------|
| A1 | `public`: anon INSERT en 107 tablas y UPDATE en 76 (incl. `Empleados`, `Proveedores`, `Precios_Proveedores`, `Ordenes_Compra`, `articulos`) | grant ∧ política abierta |
| A2 | Datos personales legibles: `Empleados` (70 emails), `Proveedores` (1.513 con CUIT/tel/email), `GV_Clientes_Contacto` (2.029 WhatsApp), `whatsapp_clientes` (942), `GV_Clientes_Whatsapp` (764), `Fichadas_Historico` (17.890 con email), direcciones | conteos en vivo, 206 |
| A3 | Funciones que anon ejecuta: `public` 477 (267 SECURITY DEFINER, **96 escriben sin chequear identidad, 23 borran**: `anular_picking_virgilio`, `insumo_borrar`, `gv_oc_generar_pendientes`, `gv_pedido_horario_*`, `tanda_*`, `rc_borrar`, `sync_stock_desde_matrices`, `gv_refrescar_precio_facturado`, `gv_supers_sync`…); `planify` 69 (26 escriben sin chequeo, 6 borran: `planify_chat_limpiar`, `planify_matriz_borrar`…); `procesos` 8 (5 escriben) | `pg_proc` + `has_function_privilege` |
| A4 | `planify`: anon INSERT 19 tablas, UPDATE 15 (`asistencia_diaria`, `novedades_manuales`, `vacaciones_lapsos`, `premios`, `recorrido_paradas`…), DELETE 3 (`tasks`, `task_lists`, `recorrido_destinos`) | grant ∧ política abierta |
| A5 | `wa_factura_grupo` (SQL dinámico con lista blanca, sin inyección) devuelve facturas por CUIT/fecha a anon | código leído |

## 3. MEDIO / BAJO

- `remitos` bucket público (401 fotos) con anon total — ya registrado como problema 584, migración propuesta **rechazada** el 28/09; no se reintenta.
- `planify_matriceria` (0 archivos) anon total; `planify_diag_priv` anon BORRA; `planify_manuales` anon LEE; `planify_chat` anon SUBE.
- 3 tablas de `GP2_bak` legibles por anon.
- `wa_sim_cleanup(_all)` borran solo filas de simulación.
- Bien: ninguna vista SECURITY DEFINER abierta a anon (arreglado 12/09); `gv_imp_cc_deuda_set` (chequea supervisor + lista blanca); liquidaciones/paritaria/sanciones (tablas) protegidas por `planify_is_maestro()`.

## 4. Edge Functions (`verify_jwt = false`)

_(pendiente: resultado del relevamiento de las funciones — se completa abajo)_

## 5. Arreglos propuestos (nada ejecutado)

Orden: primero lo que **no toca a los operarios** (se puede hacer ya, sin romper nada), después lo que necesita
darle identidad al operario.

**Sin tocar operarios**
1. C1: `revoke select (pass_hash) on planify.employees from anon, authenticated` (o mover el hash a una tabla sin grant) + cerrar INSERT anon.
2. C2: borrar `diag_ins` o agregarle `bucket_id = '<bucket de diagnóstico>'`.
3. C3: sacarle a anon las 4 políticas de `planify_sanciones` (dejarlo para `planify_is_maestro()`).
4. C4 + A3 (planify): en cada función admin, `if not planify_is_maestro() then raise … end if`; revocar EXECUTE a anon.
5. A2: vistas acotadas o `revoke select` de columnas personales a anon en las tablas que la tablet no lee (hay que cruzar con el código de `index.html` antes).

**Necesita identidad del operario** (decisión pendiente: legajo solo / **legajo + PIN validado en la base** / Google)
6. C5 + A1 + A3 (public): revocar DELETE/UPDATE/INSERT anon y reemplazar por RPCs que validen al operario.
   **Revisado en el código: sacar DELETE a anon hoy SÍ rompe.** La app de operarios (`cervantes/app.js`
   L1183 y L1413) borra en `Registros Produccion Cervantes` y `db_n8n_espejo` cuando el operario deshace un
   registro, y las pantallas de `cervantes-admin/` borran en `Entregas PS`, `Proporcion_Articulo_Tallerista`,
   `Rutas_*`, `Matrices`, `Pendientes`. Lo que sí se puede ya: el DELETE del operario pasa a una RPC
   `borrar_registro(id)` que solo borra filas **del día y de ese legajo**, y recién ahí se revoca DELETE.
