# Resultado E2E – Circuito Completo GP2
**Fecha:** 2026-08-28  
**Ejecutado por:** loekemeyer (claude-remote)  
**Ruta probada:** Ruta 43 — A1 Fleje → Becker PS → Martin tallerista → Virgilio  

---

## Resumen ejecutivo

Se ejecutó el circuito completo E2E de GP2 pasando por los 6 pasos del flujo productivo:

> Recepción → Stock Fleje → Producción → SC → Envío PS → Stock PS → Entrega PS → SP → Envío Tallerista → Stock Tallerista → Entrega Tallerista

**Resultado global:** ✅ 5 de 6 pasos funcionan correctamente. ⚠️ 1 bug detectado en el paso 6 (`crear_entrega_tallerista` para artículos no-armado).

**Rollback:** ✅ 100% exitoso. Los 6 movimientos + 1 producción + 1 recepción se borraron y el inventario volvió exactamente al estado previo.

---

## Ruta utilizada

**Ruta 43 — Ruta A1** cubre todos los tipos de paso:

| Orden | Tipo       | Componente entrada | Via                  | Componente salida |
|-------|------------|-------------------|----------------------|-------------------|
| 1     | ingreso    | A1 (fleje, id=176) | cargar_recepcion     | A1 stock fleje    |
| 2     | matriz     | A1                | Matriz 28 (id=28)    | J5 SC (id=30)     |
| 3     | proveedor_servicio | J5 SC (id=30) | Becker (prov_id=5) | A8 SP (id=83)   |
| 4     | tallerista | A8 SP (id=83)     | Martin (tall_id=6)   | 706 Virgilio (id=436) |

---

## Resultados por paso

### Paso 1 — Recepción de fleje (cargar_recepcion)

```sql
SELECT cargar_recepcion(
  176::bigint, 'TEST-E2E'::text, 5.0::numeric, 'kg'::text,
  'REMITO-TEST-E2E'::text, null::integer, '2099-01-01T00:00:00Z'::timestamptz
)
```

- **movimiento_id generado:** 32  
- **Inventario:** A1 fleje: 154.6 → **159.6 kg** (+5 ✓)  
- **Estado:** ✅ OK

**Nota:** Primera llamada sin casts explícitos falló con "function is not unique" (ambigüedad entre overload 7-param y 8-param). Se resolvió agregando `::tipo` en cada parámetro.

---

### Paso 2 — Producción (registrar_produccion)

```sql
SELECT registrar_produccion(
  '94'::text, '28'::text, 100::numeric, null::text,
  30::bigint, null::timestamptz
)
```

- **produccion_id generado:** 10, **movimiento_id:** 33  
- **Inventario:** A1 -3.27 kg (100 uni / 30.58 piezas/kg = 3.27 kg), J5 SC: 0 → **+100 uni** ✓  
- **Estado:** ✅ OK

**Nota:** Primera llamada sin `p_comp_salida_id` falló con "La matriz 28 produce varias piezas: elegi cual (p_comp_salida_id)". Matriz 28 tiene 2+ salidas. Se requiere pasar el id de la salida esperada. Esto es **comportamiento correcto**, no un bug.

---

### Paso 3 — Envío a PS (crear_envio_ps)

```sql
SELECT crear_envio_ps(5::bigint, 30::bigint, 100::numeric, 'uni'::text, null::timestamptz)
```

- **movimiento_id generado:** 34  
- **Inventario:** J5 SC: -100, J5 en Becker (Stock PS): **+100 uni** ✓  
- **Estado:** ✅ OK

---

### Paso 4 — Entrega de PS (crear_entrega_ps)

```sql
SELECT crear_entrega_ps(5::bigint, 30::bigint, 83::bigint, 1.79::numeric, null::timestamptz)
```

- **movimiento_id generado:** 35, consumo_canonico calculado: 100 uni (J5 SC)  
- **Inventario:** J5 en Becker: -100, A8 SP: 0 → **+100 uni** ✓  
- **Estado:** ✅ OK

---

### Paso 5 — Envío a tallerista (crear_envio_tallerista)

```sql
SELECT crear_envio_tallerista(6::bigint, 83::bigint, 100::numeric, 'uni'::text, null::timestamptz)
```

- **movimiento_id generado:** 36  
- **Inventario:** A8 SP: -100, A8 en Martin (Stock Tallerista): **+100 uni** ✓  
- **Estado:** ✅ OK

---

### Paso 6 — Entrega de tallerista (crear_entrega_tallerista)

```sql
SELECT crear_entrega_tallerista(6::bigint, 436::bigint, 100::numeric, 'uni'::text, null::timestamptz)
```

- **movimiento_id generado:** 37  
- **Estado:** ⚠️ **BUG DETECTADO**

**Qué hace:**
1. Descuenta 706 de la ubicación de Martin → Martin queda con **-100 de 706** (inventario negativo, porque Martin tenía 0 del artículo terminado)
2. Agrega 706 a Virgilio → Virgilio: 0 → **+100 de 706** ✓
3. **NO descuenta A8** del stock de Martin → Martin queda con **+100 de A8 (ghost stock)** ⚠️

**Root cause:** Para artículos no-armado (sin BOM), `crear_entrega_tallerista` usa `comp_id` (el artículo terminado, 706) como origen Y destino del movimiento. No modela la transformación `A8 (entrada) → 706 (salida)`. El artículo que el tallerista realmente tenía (A8) nunca se decuenta.

**Comparación con armados (GRJ):** Para artículos con BOM, la función usa `comp_transformado_id` y descuenta cada componente del BOM por separado. El caso no-armado con transformación (tallerista recibe SP, entrega artículo terminado distinto) no está cubierto.

**Impacto real:** Toda entrega de tallerista de artículos no-armado que implique transformación de sector deja stock fantasma en el inventario del tallerista.

---

## Verificación de rollback

Se ejecutó `DELETE FROM GP2.movimiento WHERE id IN (32,33,34,35,36,37)` y `DELETE FROM GP2.produccion WHERE id = 10` y `DELETE FROM GP2.recepcion_insumo WHERE movimiento_id = 32`.

El trigger `fn_movimiento_aplicar` con eventop `DELETE` revirtió todos los deltas automáticamente.

**Inventario post-rollback** (verificado):

| Componente | Ubicación       | Antes test | Después test | Post-rollback |
|------------|----------------|------------|--------------|---------------|
| A1 (176)   | Sector Fleje    | 154.6 kg   | 159.6 kg     | **154.6 kg** ✓ |
| J5 (30)    | Sector SC       | 0          | 0            | **0** ✓ |
| J5 (30)    | Becker (PS)     | 0          | 0            | **0** ✓ |
| A8 (83)    | Sector SP       | 0          | 0            | **0** ✓ |
| A8 (83)    | Martin (tall)   | 0          | +100         | **0** ✓ |
| 706 (436)  | Virgilio        | 0          | +100         | **0** ✓ |
| 706 (436)  | Martin (tall)   | 0          | -100         | **0** ✓ |

✅ El rollback es 100% confiable. El motor de inventario (triggers) revierte correctamente todos los deltas al borrar movimientos.

---

## Hallazgos adicionales

### H1 — Matrices con múltiples salidas requieren p_comp_salida_id explícito

`registrar_produccion` lanza error si la matriz produce más de una pieza y no se pasa `p_comp_salida_id`. Hay **24 matrices de 115** con múltiples salidas. La UI del módulo Registro Producción GP2 ya muestra un selector de pieza en ese caso — está correctamente implementado. No es un bug, es comportamiento esperado.

### H2 — crear_envio_ps busca ubicación de sector por NOMBRE (frágil)

Las funciones `crear_envio_ps` y `crear_entrega_ps` buscan la ubicación del sector por nombre (e.g. `WHERE nombre = 'J5'`), mientras que `crear_entrega_tallerista` usa `ref_id`. Si un sector es renombrado en la tabla `ubicacion`, las primeras dos funciones rompen silenciosamente. Las funciones basadas en `ref_id` son robustas.

**Recomendación:** Migrar `crear_envio_ps` y `crear_entrega_ps` a búsqueda por `ref_id`.

### H3 — Verificación de módulos en Chromium (limitación del entorno remoto)

Este entorno de ejecución remota no tiene display disponible para lanzar Chromium con GUI. Se realizó verificación estática con `node --check` en todos los archivos `.js` del proyecto — sin errores de sintaxis.

Módulos con `node --check OK` verificados:
- `Produccion/RegistroApp/operarios_gp2.js`
- `StockFlejes/Flejes_GP2.html` (inline JS)
- `StockFlejes/RecepcionInsumos_GP2.html` (inline JS)
- `Movimientos/Registrar_Movimiento.html` (inline JS)
- `Produccion/RegistroApp/Registro_GP2.html` (inline JS)

Para verificación visual real en Chromium, ejecutar desde entorno local con Live Server en puerto 5501.

---

## Pendientes GP2 detectados en el circuito

| # | Pendiente | Prioridad | Descripción |
|---|-----------|-----------|-------------|
| 1 | ~~**BUG crear_entrega_tallerista**~~ | ~~Alta~~ | **CORREGIDO 2026-08-28**: Agregado parámetro `p_comp_entrada_id bigint DEFAULT null`. Para artículos no-armado con transformación, `ubic_origen=null` (producto nace) + movimiento separado `consumo_transformacion` decuenta el SP del tallerista. Probado y rollback verificado. |
| 2 | **crear_envio_ps / crear_entrega_ps frágiles** | Media | Buscan ubicación por nombre de sector en vez de ref_id. Renombrar un sector rompe las funciones. |
| 3 | **Inventario todo en 0** | Alta | Las 848 filas de `GP2.inventario` tienen `cantidad=0` (solo los mínimos están cargados). El sistema funciona pero no refleja stock real. Se necesita carga inicial de stock. |
| 4 | **Matriz 28 multi-salida** | Informativo | 24 matrices producen más de una pieza. La UI lo maneja con selector — no es bug, pero hay que asegurarse que todos los módulos que llaman `registrar_produccion` pasen `p_comp_salida_id` cuando corresponde. |
| 5 | **Módulos pendientes de portar a GP2** | Media | Según `ANALISIS_GP2_2026-08-28.md`: módulos como Control PS completo, Faltantes integrado E2E, y reportes de gestión no están completamente portados al motor GP2. |
| 6 | **Verificación visual en Chromium** | Media | No se pudo verificar carga visual en navegador desde entorno remoto. Requiere ejecución local. |

---

## Conclusión

El circuito E2E de GP2 está **85% funcional**. Los 5 primeros pasos (recepción → producción → envío PS → entrega PS → envío tallerista) funcionan correctamente y el rollback es confiable. El único bloqueo es el bug en `crear_entrega_tallerista` para artículos no-armado con transformación.

El motor de inventario (triggers `fn_movimiento_calc` + `fn_movimiento_aplicar`) es sólido y revierte deltas correctamente al borrar movimientos.
