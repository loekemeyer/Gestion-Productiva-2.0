# Lo que todavía mira `public` — y lo que ya se borró

Estado al **2026-09-12**, después del borrado de las pantallas viejas.

GP2 —el schema y sus 43 pantallas— **no lee `public`** (Regla 0 en `CLAUDE.md`,
auditoría en `CONOCIMIENTO_GP2.md` §4cf). Lo que queda abajo es el resto del programa viejo
("Gestión Productiva Entero") que convivía en esta carpeta.

## Lo que queda mirando `public` (5 archivos)

| Archivo | Qué es | Por qué sigue |
|---|---|---|
| `Facturas/index.html` | "Lectura de Facturas": cruza facturas de proveedores contra `Entregas PS`, `Partes x PS`, `Precios_Proveedores` | **hueco**: el menú lo tiene con destino `null` |
| `Facturas/EntregaProveedoresCervantes.html` | "Entrega Proveedores Cervantes" | **hueco**: `null` en el menú |
| `ControlRemitos/controlRemitos.js` (+ su `index.html`) | "Control Carga Remitos": lee `Control_Carga_Remitos`, que llena una página externa (`loekemeyer.github.io/Control-Carga-Remitos-FC`) | **hueco**: `null` en el menú |
| `Preavisos/index.html` | "Preaviso de Entrega": el tallerista/proveedor avisa qué va a traer | **hueco**: ni figura en el menú |
| `Produccion/InformesVirgilio/renderer.js` | Informes de **Gestión Virgilio** (`Registros_Produccion_Virgilio`, `PPP_*`) | **no es GP2**: pertenece a otro sistema, que tiene su propio repo (`loekemeyer/Gestion-Virgilio`) |

Los cuatro primeros son los únicos candidatos a "construir en GP2" que deja el programa viejo, y
el usuario ya dijo que **hoy no son útiles** para el estado actual de GP2 (2026-09-13).

**Ya migrado: Calcular Cajones** (2026-09-13) → `CalcularCajones_GP2.html`, sobre
`GP2.calculadora_cajones_bundle()`. Era el único de la lista que estaba **vivo** (se llega desde
`calculadora.html` y está en la whitelist del rol `envios`). Para eso se creó **`GP2.cajon`**, el
catálogo de cajones de movimiento con su tara, migrando los 10 números de `public.peso_cajones`.

## Lo que se borró (2026-09-12)

**109 archivos** (50 pantallas con su HTML/JS/CSS): Alertas, Compras/cajas, Control Envíos y
Entregas (app/exportar/stock), Despiece, Despiece x Artículo, Disruptivas, Informes, Producción
(abm, entrevistas, import, maestro, monitor, monitor2, rendimiento, tiempos, ProblemasMatrices,
RegistroApp), Prov. Art. Terminado, Prov. Servicio, StockFlejes (bombillas, cajas, cartones,
garage, plásticos, recepción, remaches, stock-flejes, menú), StockMovimiento, StockSC, StockSP,
StockTránsito, Stocks General, Talleristas (ABM, Control, Envíos, Faltante Partes, Proporciones,
Recepción Cervantes, Devolución Cervantes, Entrega Cervantes Fotos, Recepción Virgilio),
VerifMadres y Verificación.

Cada una tenía su reemplazo `*_GP2.html` andando; ninguna colgaba del menú GP2. Siguen en el
historial de git (`git show <commit>^:<ruta>`) y en `loekemeyer/GestionProductivaEntero`.

**Dos cosas se relinkearon ANTES de borrar**, porque apuntaban a las viejas:

1. `envios-only.html` (la pantalla del rol `envios`): Envíos PS, Envíos Tall, Entrega PS y
   Entrega Tall Cervantes ahora abren `EnviosPS_GP2` / `EnviosTalleristas_GP2` /
   `EntregaPS_GP2` / `EntregasTalleristas_GP2`.
2. `auth-guard.js`: la whitelist del rol `envios` nombraba las páginas viejas (`enviostall.html`,
   `recepcion cervantes.html`, `stockflejes/recepcion.html`, `produccion/monitor.html`…). Ahora
   nombra las GP2, más `recepcionvirgilio_gp2.html`. **Sin este cambio el rol `envios` se quedaba
   sin acceso a todo.**

Se conservaron dos archivos que la lista original marcaba como muertos: `StockFlejes/stock-flejes.css`
(lo usa `ControlRemitos/index.html`, que se queda) y `calcular-cajones.html` (está vivo, ver arriba).
