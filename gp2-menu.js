/* =========================================================
   gp2-menu.js — LOS MODULOS DE GP2, en UN solo lugar (2026-10-08).

   Lo leen dos pantallas, y por eso vive aca y no adentro de una de ellas:
     - GP2_MODULOS.html (el menu principal) arma sus grupos con esto;
     - gp2-nav.js (la marca GP2 de la barra de TODAS las pantallas) arma el
       selector de modulos con esto mismo.
   Antes el menu estaba escrito solo en GP2_MODULOS.html: agregar el selector
   persistente sin moverlo habria sido una segunda copia que se desfasa.

   Formato de cada modulo: [rotulo, ruta desde la raiz | null (candado), marcas?]
   GP2_MENU = lo visible (v1.196.0, Thomas: "Dos modulos en vez de 10").
   GP2_MENU_OCULTO = el menu completo de hasta v1.195.0, tal cual; se ve con
   GP2_MODULOS.html?todos=1. Para reponer un grupo se lo pasa de uno al otro.
   ========================================================= */
/* v1.197.0 (2026-10-01) - entra "Control Partes Inyectores" en Stocks, debajo de los otros 3
   controles (Talleristas / P.S. / Prov. A.T.). Mismo molde que Control P.S., pero por inyector
   las filas son las RESINAS en kg (Enviado/Consumido/Saldo): el inyector guarda resina, no piezas.
   v1.196.0 (2026-09-28) - MENU REDUCIDO A DOS GRUPOS [Thomas: "Dos módulos en vez de 10 ... El
   resto de los módulos que no te nombro ocultalos, si en algún momento te pido que los vuelvas a
   poner tenes que poder"]. Ninguna pantalla se borro: siguen abriendo por su URL. */
var GP2_MENU = [
 ["▦","Stocks", [
   ["Stock General", "Stocks%20General/StockGeneral_GP2.html"],
   ["Control Partes Talleristas", "Talleristas/Control%20Tall/ControlTalleristas_GP2.html"],
   ["Control Partes P.S.", "Prov%20Serv/Control/ControlPS_GP2.html"],
   ["Control Partes Prov. A.T.", "Prov%20Art%20Terminado/Control/ControlAT_GP2.html"],
   ["Control Partes Inyectores", "Compras/Control%20Inyectores/ControlInyectores_GP2.html"],
   ["Faltantes", "Faltantes/Faltantes_GP2.html"],
   ["Validación Stock", "Relevamiento/Validacion_Stock.html"],
   ["Proporciones", "Talleristas/Proporciones/Proporciones_GP2.html"],
 ]],
 ["🛠","Herramientas", [
   ["Órdenes Compra Insumos", "Compras/OC_GP2.html"],
   ["Órdenes Producción", "OrdenProduccion/OrdenProduccion.html"],
   ["Despiece x Art.", "Programa/Programa.html"],
   ["Consumo x Componente", "Consumo/Consumo_GP2.html"],
   ["Tiempos Matrices", "Produccion/tiempos_GP2.html"],
   ["Casos Especiales", "CasosEspeciales/CasosEspeciales_GP2.html"],
   ["Devolución Cervantes", "Talleristas/Recepcion/DevolucionCervantes_GP2.html"],
   ["Cambiar Tallerista/Prov. A.T.", "CambiarTallerista/CambiarTallerista_GP2.html"],
 ]],
];

/* OCULTOS: el menu completo de hasta v1.195.0, tal cual. No se renderiza salvo ?todos=1. */
var GP2_MENU_OCULTO = [
 ["🔧","Tallerista", [
   ["Control", "Talleristas/Control%20Tall/ControlTalleristas_GP2.html"],
   ["Envío", "Talleristas/Envios/EnviosTalleristas_GP2.html"],
   ["Entregas", "Talleristas/Recepcion/EntregasTalleristas_GP2.html"],
   ["Devolución Cervantes", "Talleristas/Recepcion/DevolucionCervantes_GP2.html"],
   ["Entrega Cervantes Fotos", null],
   // Apagado 2026-09-18 a pedido del usuario ("por ahora no me agregues todo lo que es Virgilio,
   // no me lo generes como movimiento"): la pantalla y su RPC siguen enteras, solo se saca la
   // entrada del menu. Para volver: reponer el href. Ver CONOCIMIENTO_GP2.md 4ej.
   ["Entrega Virgilio", null],
   ["ABM Artículos", "Talleristas/ABM%20Articulos/ABM_Articulos_GP2.html"],
   ["Proporciones", "Talleristas/Proporciones/Proporciones_GP2.html"],
   ["Faltante Partes", "Talleristas/Faltante%20Partes%20Tallerista/FaltantePartesTallerista_GP2.html"],
   ["Preavisos · Qué prometen traer", "Preavisos/Preavisos_GP2.html"],
   ["Historial x Fecha", "Control%20Envios%20y%20Entregas/ControlEnvios_GP2.html?origen=tall"],
 ]],
 ["☰","PS (Prov. Servicio)", [
   ["Control", "Prov%20Serv/Control/ControlPS_GP2.html"],
   ["Envío", "Prov%20Serv/Envios/EnviosPS_GP2.html"],
   ["Entrega", "Prov%20Serv/Entregas/EntregaPS_GP2.html"],
   ["Historial x Fecha", "Control%20Envios%20y%20Entregas/ControlEnvios_GP2.html?origen=ps"],
 ]],
 ["⚙","Casos especiales", [
   ["Charcas / Eclipse · entrega de material", "CasosEspeciales/CasosEspeciales_GP2.html"],
 ]],
 ["📦","Prov. Art. Terminado", [
   ["Control de Stocks", "Prov%20Art%20Terminado/Control/ControlAT_GP2.html"],
   ["Envío Cartón/Cajas", "Prov%20Art%20Terminado/Envios/EnviosAT_GP2.html"],
   ["Entrega Prov AT", "Prov%20Art%20Terminado/Entregas/EntregasAT_GP2.html"],
   ["Historial x Fecha", "Control%20Envios%20y%20Entregas/ControlEnvios_GP2.html?origen=provat"],
 ]],
 ["▦","Stocks", [
   ["Faltantes", "Faltantes/Faltantes_GP2.html"],
   ["Stock SP", "StockSector/StockSector_GP2.html?sector=2"],
   ["Stock SC", "StockSector/StockSector_GP2.html?sector=1"],
   ["Stock en Movimiento", "StockSector/StockSector_GP2.html?sector=3"],
   ["Stock Tránsito PS", "StockTransitoPS/StockTransitoPS_GP2.html"],
   ["Stocks general", "Stocks%20General/StockGeneral_GP2.html"],
 ]],
 ["⋯","Producción", [
   ["Orden de Producción", "OrdenProduccion/OrdenProduccion.html"],
   ["Registro Producción", "Produccion/RegistroApp/Operarios_GP2.html"],
   ["Carga Manual Producción", "Produccion/RegistroApp/Registro_GP2.html"],
   ["Informes Producción", "Informes/informe_persona_GP2.html"],
   ["Informe x Matriz", "Informes/informe_matriz_GP2.html"],
   ["Producciones Disruptivas", "Disruptivas/Disruptivas_GP2.html"],
   ["Maestro Producción", "Produccion/maestro_GP2.html"],
   ["Rendimiento x Mes", "Produccion/rendimiento_GP2.html"],
   ["Alertas", "Alertas/alertas_GP2.html"],
   ["ABM Operarios", "Produccion/abm_GP2.html"],
   ["Monitor en Vivo · Operarios", "Produccion/monitor_GP2.html"],
   ["Cierres del Día · Premios", "Produccion/monitor2_GP2.html"],
   ["Tiempos Matrices", "Produccion/tiempos_GP2.html"],
   ["Problemas con Matrices", "Produccion/ProblemasMatrices/ProblemasMatrices_GP2.html"],
   ["Unidades sin Accidente · Matrices", "Produccion/UnidadesSinAccidente/UnidadesSinAccidente_GP2.html"],
   ["Entrevistas", "Produccion/entrevistas_GP2.html"],
 ]],
 /* Las dos puntas del mismo mapa: Despiece va del articulo a sus partes, Consumo va
    de la parte a los articulos que la piden (y cuanto se gasta por mes). */
 ["◈","Despiece", [
   ["Despiece x Artículo", "Programa/Programa.html"],
   ["Consumo x Componente", "Consumo/Consumo_GP2.html"],
 ]],
 ["🧾","Facturas", [
   ["Recepciones · Checklist Pagos", "Compras/Recepciones_GP2.html"],
   ["Lectura de Facturas Entrantes", "Compras/LecturaFacturas_GP2.html"],
 ]],
 ["▦","Insumos", [
   // El orden y las marcas los pidio el usuario: primero lo que se usa todos
   // los dias (comprar y recibir), despues el stock rubro por rubro, y ultimo
   // Inyectores, que es configuracion — se toca cuando cambia un proveedor.
   ["Órdenes de Compra", "Compras/OC_GP2.html", "principal"],
   ["Recepción Insumos", "StockFlejes/RecepcionInsumos_GP2.html", "principal"],
   ["Flejes", "StockFlejes/Flejes_GP2.html"],
   ["Cajas", "StockSector/StockSector_GP2.html?sector=11"],
   ["Cartones", "StockSector/StockSector_GP2.html?sector=10"],
   ["Partes Plásticas", "StockSector/StockSector_GP2.html?sector=6"],
   ["Remaches", "StockSector/StockSector_GP2.html?sector=8"],
   ["Bombillas", "StockSector/StockSector_GP2.html?sector=7"],
   ["Garage", "StockSector/StockSector_GP2.html?sector=9"],
   ["Bolsas Plásticas", "StockSector/StockSector_GP2.html?sector=14"],
   ["Valorización · Cuánto vale el stock", "Compras/Valorizacion_GP2.html", "secundario"],
   ["Inyectores · Quién hace cada parte", "Compras/Inyectores_GP2.html", "secundario"],
   ["Pintores · Quién pinta cada parte", "Prov%20Serv/Pintores/Pintores_GP2.html", "secundario"],
 ]],
 /* Solo el Relevamiento GP2 nativo [usuario 2026-09-04: "borra relevamientos (viejo) y deja
    solo relevamiento gp2 (nuevo) pero renombralo y ponele Relevamientos"]. El modulo viejo
    (Relevamiento/relevamiento.html, schema relevamiento_cervantes) se BORRO del repo en la
    auditoria del 2026-09-04 (ver REFACTOR_GP2.md); la tablet (envios-only.html) tambien abre el GP2. */
 /* DOS ROLES, DOS PANTALLAS [usuario 2026-09-04]: el OPERARIO cuenta en "Relevamientos"
    y ahi termina; el OPERADOR DEL SISTEMA compara conteo vs programa y toca el stock en
    "Validacion de Stock". El operario nunca decide sobre el stock. */
 ["🗒","Relevamiento", [ ["Relevamientos", "Relevamiento/Relevamiento_GP2.html"],
                        ["Validación de Stock", "Relevamiento/Validacion_Stock.html"],
                        /* 2026-10-06: control fisico de 2 cajones por dia (peso de balanza vs lo esperado). Va
                           aca y no en Produccion porque ese grupo ya no entra en el celular con uno mas. */
                        ["Verificación de Cajones", "Produccion/VerificacionCajones/VerificacionCajones_GP2.html"] ]],
];

/* Accesos directos de la barra del menu (las pastillas de arriba) y del pie del selector. */
var GP2_ACCESOS = [
  ["📱 Tablet Logística", "Tablet/Tablet_GP2.html"],
  ["📱 Tablet Operarios", "Produccion/RegistroApp/Operarios_GP2.html"],
  ["🔑 Monitor", "Produccion/MonitorIngreso/MonitorIngreso_GP2.html"],
];
self.GP2_MENU = GP2_MENU; self.GP2_MENU_OCULTO = GP2_MENU_OCULTO; self.GP2_ACCESOS = GP2_ACCESOS;
