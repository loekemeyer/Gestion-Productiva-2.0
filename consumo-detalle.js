/* consumo-detalle.js — el sustento del consumo, tocable.
   Donde una pantalla muestra un consumo mensual (Consumo x Componente, Pintores,
   Orden de Produccion), tocarlo abre este popup con el desglose POR ARTICULO: que
   articulos usan la parte, cuanto proyecta la Est Madre de cada uno y cuanto le
   toca a la parte.
   Lee la RPC GP2.consumo_detalle(p_comp_id), que sale de v_consumo_demanda
   (la demanda atribuida articulo por articulo, no el total del primer nodo).

   RESINA (2026-09-21): una resina no esta en ninguna receta, asi que por articulos
   el popup quedaba mudo. Su sustento son las PIEZAS que se inyectan con ella
   (base = 'piezas'), con el desperdicio ya sumado — la misma cuenta del maximo
   de la O.C. (oc_maximo_desglose).

   Uso: GP2ConsumoDetalle.abrir(SB, compId)
   - SB: el cliente supabase de la pagina (creado con schema GP2).
   - compId: componente.id (siempre id, nunca codigo: hay codigos repetidos).
   Depende de gp2-ui.js (GP2UI.esc) y gp2-numero.js (GP2N.fmt), que la pagina
   carga antes que este archivo (2026-09-04). */
"use strict";
window.GP2ConsumoDetalle = (function () {

  /* Sistema de diseño v2 (2026-10-08): el aspecto sale de gp2-modulo.css — fondo .popup,
     tarjeta .pop-card, tabla table.t, .btn, .sub, .empty. Aca queda el armado propio del popup
     con los tokens del sistema (ningun color ni fuente suelta). */
  var CSS = [
    "#cdOverlay{position:fixed;inset:0;z-index:950;display:flex;align-items:center;justify-content:center;padding:var(--s4)}",
    "#cdCard{max-width:560px;width:100%;max-height:82vh;overflow:auto;padding:var(--s4) var(--s4) var(--s3)}",
    "#cdCard h3{margin:0}",
    "#cdCard .cd-sub{margin:2px 0 var(--s3)}",
    "#cdCard .cd-total{font-size:var(--fs-base);font-weight:750;color:var(--ink);background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-sm);padding:var(--s2) var(--s3);margin-bottom:var(--s3);font-variant-numeric:tabular-nums}",
    "#cdCard table.t>thead{top:calc(-1 * var(--s4))}",
    "#cdCard table.t td{vertical-align:top}",
    "#cdCard table.t td.num,#cdCard table.t th.num{white-space:nowrap}",
    "#cdCard .cd-bar{height:5px;border-radius:3px;background:var(--pri);margin-top:4px;min-width:2px}",
    "#cdCard .cd-via{font-size:var(--fs-sm);color:var(--ink-3)}",
    "#cdCard .cd-cerrar{margin-top:var(--s3)}",
    "#cdCard .cd-vacio{text-align:left;padding:var(--s2) 0}",
    ".cd-tocable{cursor:pointer;text-decoration:underline dotted var(--ink-4);text-underline-offset:3px}",
    "@media (max-width:640px){#cdOverlay{padding:var(--s2)}#cdCard{max-height:92vh}}"
  ].join("\n");

  /* sin decimales por default y "—" cuando no hay valor (el sustento del
     consumo son unidades enteras) */
  function fmt(n, d) { return window.GP2N.fmt(n, d == null ? 0 : d, "—"); }
  var esc = window.GP2UI.esc;

  function asegurarCss() {
    if (document.getElementById("cdCss")) return;
    var st = document.createElement("style");
    st.id = "cdCss";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function cerrar() {
    var o = document.getElementById("cdOverlay");
    if (o) o.remove();
  }

  /* Barra proporcional: el renglon mas grande manda. */
  function barra(v, max) {
    var ancho = max > 0 && v != null ? Math.max(2, Math.round(v / max * 100)) : 0;
    return ancho ? "<div class='cd-bar' style='width:" + ancho + "%'></div>" : "";
  }

  /* Rama RESINA: el sustento son las piezas inyectadas con ella, no articulos. */
  function cuerpoResina(d) {
    var pzs = d.piezas || [];
    var max = 0;
    pzs.forEach(function (p) { if (p.kg_mes > max) max = p.kg_mes; });
    if (!pzs.length) {
      return "<div class='cd-vacio empty'>Ninguna pieza está declarada con esta resina como material: no hay consumo que sustentar.</div>";
    }
    var filas = pzs.map(function (p) {
      return "<tr>" +
        "<td><b>" + esc(p.codigo) + "</b> <span class='cd-via'>" + esc(p.descripcion || "") + "</span>" +
          barra(p.kg_mes, max) + "</td>" +
        "<td class='num'>" + fmt(p.uni_mes) + "</td>" +
        "<td class='num'><b>" + fmt(p.kg_mes, 2) + " kg</b></td>" +
      "</tr>";
    }).join("");
    return "<table class='t'><thead><tr><th>Pieza que se inyecta con ella</th>" +
           "<th class='num'>Piezas<br>uni/mes</th>" +
           "<th class='num'>Le pide<br>kg/mes</th></tr></thead><tbody>" + filas + "</tbody></table>";
  }

  function render(d) {
    cerrar();
    var esFleje = !!d.es_fleje, esResina = !!d.es_resina;
    var arts = d.articulos || [];
    var max = 0;
    arts.forEach(function (a) { var v = esFleje ? a.kg_mes : a.uni_mes; if (v > max) max = v; });

    var filas = arts.map(function (a) {
      var v = esFleje ? a.kg_mes : a.uni_mes;
      return "<tr>" +
        "<td><b>" + esc(a.articulo) + "</b> <span class='cd-via'>" + esc(a.familia || "") +
          (a.receta_directa ? " · en receta" : " · vía ruta") + "</span>" +
          barra(v, max) + "</td>" +
        "<td class='num'>" + fmt(a.proy_uni_mes) + "</td>" +
        "<td class='num'><b>" + (esFleje ? fmt(a.kg_mes, 1) + " kg" : fmt(a.uni_mes)) + "</b></td>" +
      "</tr>";
    }).join("");

    var total = esResina
      ? fmt(d.total_kg_mes, 2) + " kg/mes" +
        (d.desperdicio_pct != null ? " (desperdicio " + fmt(d.desperdicio_pct, 0) + "% incluido)" : "")
      : esFleje
      ? fmt(d.total_kg_mes, 1) + " kg/mes (" + fmt(d.total_uni_mes) + " piezas)"
      : fmt(d.total_uni_mes) + " uni/mes" +
        (d.uni_x_cajon ? " · " + fmt(d.total_uni_mes / d.uni_x_cajon, 1) + " cajones" : "");

    var cuerpo = esResina
      ? cuerpoResina(d)
      : (arts.length
          ? "<table class='t'><thead><tr><th>Artículo que lo usa</th><th class='num'>Proyección<br>art/mes</th><th class='num'>Le pide<br>" + (esFleje ? "kg" : "uni") + "/mes</th></tr></thead><tbody>" + filas + "</tbody></table>"
          : "<div class='cd-vacio empty'>Ningún artículo de la Est Madre llega a esta parte por las rutas: no hay consumo que sustentar.</div>");

    var o = document.createElement("div");
    o.id = "cdOverlay";
    o.className = "popup";
    o.innerHTML =
      "<div id='cdCard' class='pop-card'>" +
        "<h3>" + esc(d.codigo || "—") + " — ¿de dónde sale el consumo?</h3>" +
        "<div class='cd-sub sub'>" + esc(d.descripcion || "") + " · " + esc(d.sector || "") + "</div>" +
        "<div class='cd-total'>Total: " + total + "</div>" +
        cuerpo +
        "<button type='button' class='cd-cerrar btn btn-secondary btn-block'>Cerrar</button>" +
      "</div>";
    o.addEventListener("click", function (e) { if (e.target === o) cerrar(); });
    o.querySelector(".cd-cerrar").addEventListener("click", cerrar);
    document.body.appendChild(o);
  }

  async function abrir(sb, compId) {
    asegurarCss();
    if (compId == null) return;
    var r = await sb.rpc("consumo_detalle", { p_comp_id: compId });
    if (r.error) { alert("No se pudo traer el detalle: " + r.error.message); return; }
    if (!r.data) { alert("Componente inexistente."); return; }
    render(r.data);
  }

  return { abrir: abrir, cerrar: cerrar };
})();
