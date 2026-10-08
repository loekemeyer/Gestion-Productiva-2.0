"use strict";
/* ============================================================
   gp2-composicion.js — popup "¿cómo se compone este stock?"

   Se toca una celda de stock online (en cualquier pantalla) y se abre
   el detalle: el stock de HOY arriba, y abajo los movimientos que lo
   fueron formando, del más nuevo al más viejo, con fecha y hora y el
   saldo que quedaba después de cada uno.

   El saldo se ancla en el stock online de hoy y se camina hacia atrás:
   asi el saldo mostrado es correcto aunque la lista venga cortada por
   el limite (los movimientos viejos que faltan quedan como "arrastre").

   Uso:
     GP2Composicion.abrir({
       SB: clienteSupabase,
       comp_id: 12,
       ubic_id: 1,                 // ó bien:
       ubic_tipo: 'tallerista', ref_id: 5,
       cod: 'J2', desc: 'Cuerpo Uña c/M p/Pintar',
       kg_x_uni: 0.0178, uni_x_cajon: 1700
     });
   ============================================================ */

window.GP2Composicion = (function () {

  var LIMITE = 300;
  var montado = false;

  /* Helpers de la casa (la pagina los carga antes que este archivo, 2026-09-04):
     gp2-ui.js -> esc y la clase por signo; gp2-numero.js -> fmt (aca sin
     decimales por default: el popup muestra unidades enteras). */
  var esc = window.GP2UI.esc;
  function fmt(n, d) { return window.GP2N.fmt(n, d == null ? 0 : d); }
  function clsNum(n) { return "cp-" + window.GP2UI.cls(n); }

  /* tipo_mov es el nombre tecnico del ledger; en pantalla va en castellano.
     Un tipo nuevo que no este acá se muestra tal cual, no se pierde. */
  var TIPOS = {
    compra: "Compra", consumo: "Consumo de MP en prov. servicio",
    fabricacion: "Fabricación", armado_fabrica: "Armado en fábrica", consumo_prod: "Consumo de producción",
    envio_ps: "Envío a PS", entrega_ps: "Entrega de PS",
    envio_tallerista: "Envío a tallerista", entrega_tallerista: "Entrega de tallerista",
    consumo_tall: "Consumo de tallerista", devolucion_tallerista: "Devolución de tallerista",
    envio_prov_at: "Envío a prov. art. terminado",
    recepcion_virgilio: "Entrega en Virgilio", consumo_virgilio: "Consumo en Virgilio",
    envio_inyector: "Envío de material al inyector", consumo_inyector: "Material consumido por el inyector",
    traslado: "Traslado a/desde Virgilio",
    stock_inicial: "Stock inicial", ajuste: "Ajuste"
  };
  /* La fuente real del vocabulario es GP2.tipo_movimiento, que movimientos_bundle sirve en
     `tipos_mov`: una pantalla que ya tiene el bundle lo pasa por acá y un tipo nuevo aparece
     con su nombre sin tocar este archivo. El mapa de arriba queda como respaldo. */
  function setVocabulario(dict) {
    if (!dict) return;
    Object.keys(dict).forEach(function (k) {
      var v = dict[k];
      if (v && v.lbl) TIPOS[k] = v.lbl;
    });
  }
  function nombreTipo(t) { return TIPOS[t] || String(t || "").replace(/_/g, " "); }

  /* clave del dia en hora LOCAL: con toISOString un movimiento de las 22h (-03:00)
     cae al dia siguiente en UTC y el separador partiria el dia donde no va. */
  function claveLocal(d) {
    return d.getFullYear() + "-" +
           String(d.getMonth() + 1).padStart(2, "0") + "-" +
           String(d.getDate()).padStart(2, "0");
  }
  function dt(f) {
    if (!f) return { dia: "", hora: "", clave: "" };
    var d = new Date(f);
    if (isNaN(d)) return { dia: String(f), hora: "", clave: String(f) };
    return {
      dia: d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }),
      hora: d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }),
      clave: claveLocal(d)
    };
  }
  function etiquetaDia(clave) {
    var hoy = new Date();
    var ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
    if (clave === claveLocal(hoy)) return "Hoy";
    if (clave === claveLocal(ayer)) return "Ayer";
    return null;
  }

  /* ---------- montaje (una sola vez, propio, no depende de la página) ---------- */
  function montar() {
    if (montado) return;
    montado = true;

    /* Sistema de diseño v2 (2026-10-08): el aspecto sale de gp2-modulo.css — fondo .popup,
       tarjeta .pop-card, tabla table.t (encabezado pegado), filas de dia tr.grp, .cod, .eyebrow,
       .empty, .btn. Aca queda solo el armado propio del popup, con los tokens del sistema. */
    var css = document.createElement("style");
    css.textContent = [
      "#cpBg{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:9999;padding:var(--s4)}",
      "#cpBg.open{display:flex}",
      /* padding:0 a proposito: algunas pantallas tienen su propio .pop-card con padding */
      "#cpBox{width:100%;max-width:860px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;padding:0}",
      "#cpHead{padding:var(--s3) var(--s4);border-bottom:1px solid var(--line);display:flex;align-items:flex-start;gap:var(--s3)}",
      "#cpHead .cp-t{flex:1;min-width:0}",
      "#cpHead .cp-desc{font-size:var(--fs-base);font-weight:700;color:var(--ink);margin-top:2px;overflow-wrap:anywhere}",
      "#cpHead .cp-ubic{margin-top:2px}",
      "#cpX{flex-shrink:0;width:var(--touch);padding:0;font-size:24px;line-height:1}",
      "#cpHoy{padding:var(--s3) var(--s4);background:var(--surface-2);border-bottom:1px solid var(--line);display:flex;gap:var(--s2) var(--s5);flex-wrap:wrap;align-items:flex-end}",
      "#cpHoy .cp-big{font-size:var(--fs-2xl);font-weight:750;line-height:1.1;letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--ink)}",
      "#cpHoy .cp-big.cp-neg{color:var(--err)}",
      "#cpHoy .cp-u{font-size:var(--fs-md);font-weight:700;letter-spacing:0;color:var(--ink-2)}",
      "#cpHoy .cp-col{padding-bottom:4px}",
      "#cpHoy .cp-der{margin-left:auto}",
      "#cpHoy .cp-sec{font-size:var(--fs-md);font-weight:700;color:var(--ink-2)}",
      "#cpHoy .cp-when{font-size:var(--fs-sm);color:var(--ink-3);width:100%}",
      "#cpBody{overflow:auto;overscroll-behavior:contain}",
      "#cpBody table.t td{vertical-align:top}",
      "#cpBody td.num,#cpBody th.num{white-space:nowrap}",
      "#cpBody .cp-dia td{font-size:var(--fs-sm);padding-top:6px;padding-bottom:6px}",
      "#cpBody .cp-hora{color:var(--ink-3);font-size:var(--fs-sm);white-space:nowrap}",
      "#cpBody .cp-tipo{font-weight:700}",
      "#cpBody .cp-cp{color:var(--ink-3);font-size:var(--fs-sm)}",
      "#cpBody .cp-pos{color:var(--ok);font-weight:700}",
      "#cpBody .cp-neg{color:var(--err);font-weight:700}",
      "#cpBody .cp-cero{color:var(--ink-4)}",
      "#cpBody .cp-saldo{font-weight:750}",
      "#cpBody .cp-arr td{background:var(--warn-soft);color:var(--warn);font-size:var(--fs-sm);font-weight:700}",
      /* la F de faltante: el mismo naranja que la casilla F de envios (.falt-box.on) */
      "#cpBody .cp-f{color:#c2410c;font-weight:800}",
      "@media (max-width:640px){",
      "  #cpBg{padding:0}",
      "  #cpBox{max-width:none;max-height:100vh;height:100vh;height:100dvh;border-radius:0}",
      "  #cpHead,#cpHoy{padding-left:var(--gutter);padding-right:var(--gutter)}",
      "  #cpBody table.t td,#cpBody table.t th{padding-left:8px;padding-right:8px}",
      "}"
    ].join("\n");
    document.head.appendChild(css);

    var bg = document.createElement("div");
    bg.id = "cpBg";
    bg.className = "popup";
    bg.innerHTML =
      '<div id="cpBox" class="pop-card">' +
        '<div id="cpHead"><div class="cp-t">' +
          '<div><span class="cp-cod cod" id="cpCod"></span></div>' +
          '<div class="cp-desc" id="cpDesc"></div>' +
          '<div class="cp-ubic sub" id="cpUbic"></div>' +
        '</div><button id="cpX" class="btn btn-secondary" type="button" title="Cerrar">&times;</button></div>' +
        '<div id="cpHoy"></div>' +
        '<div id="cpBody"></div>' +
      '</div>';
    document.body.appendChild(bg);

    document.getElementById("cpX").addEventListener("click", cerrar);
    bg.addEventListener("click", function (e) { if (e.target === bg) cerrar(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && bg.classList.contains("open")) cerrar();
    });
  }

  function cerrar() {
    var bg = document.getElementById("cpBg");
    if (bg) bg.classList.remove("open");
  }

  /* ---------- apertura ---------- */
  var ABRIR_SEQ = 0; // token: si se abre otro componente mientras carga, la respuesta vieja no pinta
  async function abrir(o) {
    var miSeq = ++ABRIR_SEQ;
    montar();
    o = o || {};
    var SB = o.SB || window.SB_CLIENT;

    document.getElementById("cpCod").textContent = o.cod || "";
    document.getElementById("cpDesc").textContent = o.desc || "";
    document.getElementById("cpUbic").textContent = "";
    document.getElementById("cpHoy").innerHTML = '<div class="cp-k eyebrow">Cargando…</div>';
    document.getElementById("cpBody").innerHTML = "";
    document.getElementById("cpBg").classList.add("open");

    var args = { p_comp_id: Number(o.comp_id), p_limit: LIMITE };
    if (o.ubic_id != null) args.p_ubic_id = Number(o.ubic_id);
    if (o.ubic_tipo) { args.p_ubic_tipo = o.ubic_tipo; args.p_ref_id = (o.ref_id == null ? null : Number(o.ref_id)); }

    var r;
    try { r = await SB.rpc("composicion_stock", args); }
    catch (e) { r = { error: { message: String(e && e.message || e) } }; }

    if (miSeq !== ABRIR_SEQ) return;
    if (r.error) {
      document.getElementById("cpHoy").innerHTML = "";
      document.getElementById("cpBody").innerHTML =
        '<div class="cp-vacio empty err-txt">Error: ' + esc(r.error.message) + "</div>";
      return;
    }
    pintar(r.data || {}, o);
  }

  function pintar(d, o) {
    var comp = d.comp || {};
    var online = Number(d.online || 0);
    // El saldo se calcula caminando hacia atras, asi que el orden importa.
    // La RPC ya devuelve del mas nuevo al mas viejo; se reordena igual para no
    // depender de eso (un cambio ahi daria saldos que no cierran, en silencio).
    var movs = (d.movs || []).slice().sort(function (a, b) {
      var fa = new Date(a.fecha).getTime() || 0, fb = new Date(b.fecha).getTime() || 0;
      return fb - fa || (Number(b.id) - Number(a.id));
    });
    var total = Number(d.total_movs || 0);

    // los factores del componente ganan; si la pantalla mandó los suyos, sirven de respaldo
    var kgU = comp.kg_x_uni != null ? Number(comp.kg_x_uni) : (o.kg_x_uni != null ? Number(o.kg_x_uni) : null);
    var uxc = comp.uni_x_cajon != null ? Number(comp.uni_x_cajon) : (o.uni_x_cajon != null ? Number(o.uni_x_cajon) : null);

    document.getElementById("cpCod").textContent = comp.codigo || o.cod || "";
    document.getElementById("cpDesc").textContent = comp.descripcion || o.desc || "";
    document.getElementById("cpUbic").textContent = (d.ubicacion && d.ubicacion.nombre) ? ("en " + d.ubicacion.nombre) : "";

    /* ---- bloque de HOY ---- */
    var extra = [];
    // kg <-> uni por la regla de la casa (GP2N.aKg): null cuando no hay factor, y entonces
    // directamente no se muestra la linea de kg en vez de mostrar un 0 que no significa nada
    var enKg = GP2N.aKg(kgU, online);
    if (enKg !== null) extra.push(fmt(enKg, 0) + " kg");
    if (uxc) extra.push(fmt(online / uxc, 1) + " caj");
    var act = d.actualizado_en ? dt(d.actualizado_en) : null;
    document.getElementById("cpHoy").innerHTML =
      '<div><div class="cp-k eyebrow">Stock hoy</div>' +
        '<div class="cp-big ' + clsNum(online) + '">' + fmt(online, 0) + ' <span class="cp-u">uni</span></div></div>' +
      (extra.length ? '<div class="cp-col"><div class="cp-k eyebrow">Equivale a</div><div class="cp-sec">' + extra.join(" · ") + "</div></div>" : "") +
      '<div class="cp-col cp-der"><div class="cp-k eyebrow">Movimientos</div><div class="cp-sec">' + fmt(total, 0) + "</div></div>" +
      (act ? '<div class="cp-when">Último cambio de stock: ' + esc(act.dia) + " " + esc(act.hora) + "</div>" : "");

    /* ---- ledger ---- */
    var body = document.getElementById("cpBody");
    if (!movs.length) {
      body.innerHTML = '<div class="cp-vacio empty">Este stock todavía no tiene movimientos registrados.<br>' +
        "El número de arriba viene de la carga inicial del inventario.</div>";
      return;
    }

    // saldo anclado en el stock de hoy, caminando hacia atrás
    var saldo = online, filas = [], diaActual = null;
    movs.forEach(function (m) {
      var cant = Number(m.cantidad || 0);
      var ent = m.signo === "ent";
      var f = dt(m.fecha);

      if (f.clave !== diaActual) {
        diaActual = f.clave;
        var et = etiquetaDia(f.clave);
        filas.push('<tr class="cp-dia grp"><td colspan="5">' + esc(f.dia) + (et ? " · " + et : "") + "</td></tr>");
      }

      var via = m.via ? ' <span class="cp-cp">(vía ' + esc(m.via) + ")</span>" : "";
      var falt = m.faltante ? ' <span class="cp-f">F</span>' : "";
      var caj = (m.cajones != null && Number(m.cajones)) ? (" · " + fmt(m.cajones, 1) + " caj") : "";

      filas.push(
        "<tr>" +
          '<td class="cp-hora">' + esc(f.hora) + "</td>" +
          '<td><span class="cp-tipo">' + esc(nombreTipo(m.tipo)) + "</span>" + via + falt +
            '<div class="cp-cp">' + esc(m.contraparte || "—") + caj + "</div></td>" +
          '<td class="num cp-pos">' + (ent ? "+" + fmt(cant, 0) : "") + "</td>" +
          '<td class="num cp-neg">' + (ent ? "" : "−" + fmt(cant, 0)) + "</td>" +
          '<td class="num cp-saldo">' + fmt(saldo, 0) + "</td>" +
        "</tr>"
      );
      // el saldo de la fila de arriba (más vieja) es el de ésta menos su propio delta
      saldo = saldo - (ent ? cant : -cant);
    });

    // lo que quedaba antes del movimiento más viejo mostrado
    var truncado = total > movs.length;
    var arranque = Math.round(saldo * 1e6) / 1e6;
    filas.push(
      '<tr class="cp-arr"><td colspan="4">' +
        (truncado
          ? "Arrastre de " + fmt(total - movs.length, 0) + " movimientos anteriores (no listados)"
          : (arranque === 0
              ? "Arranca en cero: los movimientos de arriba explican todo el stock"
              : "Saldo inicial, cargado sin movimiento")) +
      '</td><td class="num cp-saldo">' + fmt(arranque, 0) + "</td></tr>"
    );

    body.innerHTML =
      '<table class="t"><thead><tr>' +
        "<th>Hora</th><th>Movimiento</th>" +
        '<th class="num">Entra</th><th class="num">Sale</th><th class="num">Saldo</th>' +
      "</tr></thead><tbody>" + filas.join("") + "</tbody></table>";
  }

  return { abrir: abrir, cerrar: cerrar, setVocabulario: setVocabulario };

})();
