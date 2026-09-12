# Pantallas viejas que todavía miran `public` — y con qué GP2 las reemplaza

Foto del **2026-09-12**, generada cruzando cada archivo del repo que abre un cliente Supabase sin
schema (cae en `public`) contra las pantallas `*_GP2.html` existentes y contra el menú
`GP2_MODULOS.html`.

**Nada de esto cuelga del menú GP2**: son archivos del programa viejo ("Gestión Productiva
Entero") que quedaron conviviendo en esta carpeta cuando se copió el repo. GP2 —el schema y sus
43 pantallas— no lee `public` (ver Regla 0 en `CLAUDE.md` y `CONOCIMIENTO_GP2.md` §4cf).

**Ojo con borrarlos a ciegas:** los 54 existen también en `loekemeyer/GestionProductivaEntero`,
pero **ninguno es idéntico** — las dos copias se fueron separando (acá se les hicieron arreglos
que allá no están, p. ej. el piso de 18px de la idea 7214). Y esta carpeta es compartida: alguien
puede estar abriendo una de estas páginas con Live Server. Por eso la decisión de borrarlas es
del usuario, no del agente.

## Lo que SÍ tiene reemplazo GP2

| Archivo viejo (mira `public`) | Estado | Equivalente GP2 |
|---|---|---|
| `Alertas/app.js` | reemplazada | Alertas/alertas_GP2.html |
| `Compras/cajas.html` | reemplazada | Compras/OC_GP2.html + Recepciones_GP2.html |
| `Control Envios y Entregas/app.js · exportar.js · stock.js` | reemplazada | Control Envios y Entregas/ControlEnvios_GP2.html (?origen=tall|ps|provat) |
| `Despiece x Articulo/app.js · app-inverso.js` | reemplazada | Despiece x Articulo/Despiece_GP2.html |
| `Despiece/Despiece.js` | reemplazada | Despiece x Articulo/Despiece_GP2.html (absorbió el despiece por sector) |
| `Disruptivas/disruptivas.js` | reemplazada | Disruptivas/Disruptivas_GP2.html |
| `Informes/informes.js` | reemplazada | Informes/informe_matriz_GP2.html + informe_persona_GP2.html |
| `Produccion/InformesVirgilio/renderer.js` | fuera de alcance | es de Gestión Virgilio (otro repo), no de GP2 |
| `Produccion/ProblemasMatrices/index.html` | reemplazada | Produccion/ProblemasMatrices/ProblemasMatrices_GP2.html |
| `Produccion/RegistroApp/app.js` | reemplazada | Produccion/RegistroApp/Registro_GP2.html + Operarios_GP2.html |
| `Produccion/abm.html · entrevistas.html · import.html · maestro.html · monitor.html · monitor2.html · rendimiento.js · tiempos.html` | reemplazada | los `*_GP2.html` de la misma carpeta (abm, entrevistas, maestro, monitor, monitor2, rendimiento, tiempos) |
| `Prov Art Terminado/Control/ControlAT.js · Envios/EnviosAT.js` | reemplazada | ControlAT_GP2.html · EnviosAT_GP2.html · EntregasAT_GP2.html |
| `Prov Serv/Control/ControlPS.js · Entregas/EntregaPS.js · Envios/EnviosPS.js` | reemplazada | ControlPS_GP2.html · EntregaPS_GP2.html · EnviosPS_GP2.html |
| `StockFlejes/ (bombillas, cajas, cartones, garage, plasticos, recepcion, remaches, stock-flejes)` | reemplazada | StockFlejes/Flejes_GP2.html + RecepcionInsumos_GP2.html + StockSector/StockSector_GP2.html?sector=N |
| `StockMovimiento/StockMovimiento.js` | reemplazada | Stocks General/StockGeneral_GP2.html (ajuste y armado en fábrica viven ahí) |
| `StockSC/StockSC.js · StockSP/StockSP.js` | reemplazada | StockSector/StockSector_GP2.html?sector=N |
| `StockTransitoPS/StockTransitoPS.js` | reemplazada | StockTransitoPS/StockTransitoPS_GP2.html |
| `Stocks General/StocksGeneral.js` | reemplazada | Stocks General/StockGeneral_GP2.html |
| `Talleristas/ABM Articulos/ABMArticulosTall.js` | reemplazada | Talleristas/ABM Articulos/ABM_Articulos_GP2.html |
| `Talleristas/Control Tall/ControlTall.js` | reemplazada | Talleristas/Control Tall/ControlTalleristas_GP2.html |
| `Talleristas/Envios/EnviosTall.js` | reemplazada | Talleristas/Envios/EnviosTalleristas_GP2.html |
| `Talleristas/Proporciones/proporciones.js` | reemplazada | Talleristas/Proporciones/Proporciones_GP2.html |
| `Talleristas/Recepcion/Recepcion Cervantes.html` | reemplazada | Talleristas/Recepcion/EntregasTalleristas_GP2.html |
| `Talleristas/Recepcion/Devolucion Cervantes.html` | reemplazada | Talleristas/Recepcion/DevolucionCervantes_GP2.html |
| `Talleristas/Recepcion/Recepcion Virgilio.html` | reemplazada **hoy** | Talleristas/Recepcion/RecepcionVirgilio_GP2.html (2026-09-12) |
| `Talleristas/Recepcion/Entrega Cervantes Fotos.html` | sin uso | el menú lo tiene `null`; las fotos no se portaron |
| `VerifMadres/VerifMadres.js` | reemplazada | fusionada dentro de Despiece_GP2.html (bloque de verificación) |
| `Verificacion/verificacion.js` | reemplazada | `GP2.ruta_revision` + el bloque de rutas de Despiece_GP2.html |
| `calcular-cajones.html` | reemplazada | calculadora.html / el cálculo vive en las pantallas de carga |

## Los 4 huecos reales: lo que HOY sólo existe contra `public`

| Módulo viejo | Qué hace | Estado en GP2 |
|---|---|---|
| `ControlRemitos/controlRemitos.js` | "Control Carga Remitos": lee `Control_Carga_Remitos`, que llena una página externa (`loekemeyer.github.io/Control-Carga-Remitos-FC`) | el menú lo tiene como `["Ver Cargas", null]` — no existe pantalla GP2 |
| `Facturas/index.html` | "Lectura de Facturas": cruza facturas de proveedores contra `Entregas PS` / `Partes x PS` / `Precios_Proveedores` | "Lectura de Facturas Entrantes" está `null` en el menú |
| `Facturas/EntregaProveedoresCervantes.html` | "Entrega Proveedores Cervantes": carga lo que un proveedor entrega en Cervantes | "Entrega Proveedores Cervantes" está `null` en el menú |
| `Preavisos/index.html` | "Preaviso de Entrega": el tallerista/proveedor avisa qué va a entregar antes de traerlo | ni siquiera figura en el menú GP2 |

Tres de los cuatro ya están **declarados como hueco en el menú** (la fila existe con destino
`null`): *Control Carga Remitos · Ver Cargas*, *Facturas · Lectura de Facturas Entrantes* y
*Facturas · Entrega Proveedores Cervantes*. **Preavisos** ni figura.

Son los únicos candidatos a "construir en GP2" que quedan del programa viejo. El resto es
borrar o dejar.
