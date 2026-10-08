/* gp2-verif-cajones.js — VERIFICACIÓN DE CAJONES: el aviso de las 15:00 y los textos de un cajón.
 *
 * Pedido de Elías (2026-10-06) para Alan Gonzalez (Logística): a las 15:00 se sortean 2 cajones POR OPERARIO que trabajó en
 * Cervantes ese día (public.gp2_verif_cajones_sortear, cron gp2-verif-cajones-15h) y "le tiene que aparecer: buscá y revisá
 * los siguientes cajones". Se registra CUÁNDO empezó y CUÁNDO terminó (no quién: GP2 entra con cuentas compartidas).
 *
 * EL AVISO ES AUTOMÁTICO, SIEMPRE [Elías, 08/10: «el avisarme es automático siempre»]: ya no hay tilde por PC.
 * DÓNDE APARECE [Elías, 08/10: «dentro de GP2 SOLO si está navegando dentro de [la Versión Tablet Logística], no si está en el
 *   menú»]: sólo en Tablet/Tablet_GP2.html (el menú GP2_MODULOS.html y el resto NO lo cargan).
 * CUÁNDO [Elías, 08/10: «si está en medio de algo en la tablet se espera a que termine… que esté en la pantalla principal»]:
 *   la página que lo carga puede definir window.GP2VC_LIBRE() → true cuando está en su pantalla principal. Mientras devuelva
 *   false no se muestra; si ya estaba a la vista y la persona se pone a trabajar, se esconde (sin posponerlo) y vuelve solo
 *   al regresar a la pantalla principal. Sin GP2VC_LIBRE se considera libre.
 * SE PUEDE SACAR [Elías, 07/10: «que se pueda sacar para no interrumpir lo que se está haciendo»]: es una BANDA abajo que no
 *   tapa nada; la ✕ o Esc la sacan y vuelve a los 30 min. La página reserva su alto y lo devuelve al cerrarla.
 *
 * Se carga en Tablet/Tablet_GP2.html (el aviso) y en la pantalla del módulo (sólo los helpers: ahí va con
 * window.GP2VC_SIN_CARTEL = true).
 *
 *   GP2VC.kg(n, dec)          "30,03 kg" (regla de número de la casa), "—" sin valor
 *   GP2VC.hora(ts)            "15:12" en Argentina
 *   GP2VC.esperado(c)         texto del peso que debería tener el cajón (sin la tara)
 *   GP2VC.diferencia(c)       {kg, pct} del neto contra lo esperado, o null
 */
(function (global) {
  "use strict";

  var POSPONER = "gp2_verif_cajones_posponer";
  var MODULO = "Produccion/VerificacionCajones/VerificacionCajones_GP2.html";
  var yo = document.currentScript ? document.currentScript.src : "";
  var RAIZ = yo ? yo.replace(/gp2-verif-cajones\.js.*$/, "") : "";

  /* La regla de número es GP2N (gp2-numero.js). El cartel lo carga antes de pintar si la página no lo trae. */
  function kg(n, dec) { var t = global.GP2N.fmt(n, dec == null ? 2 : dec, "—", true); return t === "—" ? t : t + " kg"; }
  function uni(n) { return global.GP2N.fmt(n, 2); }
  function hora(ts) {
    if (!ts) return "—";
    var d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts).slice(0, 5);
    return new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  }
  function hhmm(t) { return t ? String(t).slice(0, 5) : "—"; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  /* Lo que debería pesar el cajón SIN la tara. Con carga en kg (la 501, piedra) lo cargado ya son kg. */
  function esperado(c) {
    if (c.carga_en === "kg") return kg(c.uni) + " (se carga en kg)";
    if (c.kg_esperado_min == null) return "sin peso por unidad en GP2: pesalo igual, queda registrado";
    if (Number(c.kg_esperado_min) === Number(c.kg_esperado_max)) return kg(c.kg_esperado_min);
    return "entre " + kg(c.kg_esperado_min) + " y " + kg(c.kg_esperado_max);
  }
  function porUnidad(c) {
    if (c.kg_x_uni_min == null) return "sin cargar en GP2";
    if (Number(c.kg_x_uni_min) === Number(c.kg_x_uni_max)) return kg(c.kg_x_uni_min, 4);
    return "entre " + kg(c.kg_x_uni_min, 4) + " y " + kg(c.kg_x_uni_max, 4);
  }
  function unidades(c) { return c.carga_en === "kg" ? kg(c.uni) : uni(c.uni) + " uni"; }

  /* ENVASADO (2026-10-06, Elías: "envasado también… ir a buscar las uni x caja del envasado y la cantidad
     total que hizo"): no se pesa, se cuentan cajas. Las unidades por caja salen de GP2.articulo del terminado
     que cierra la matriz; si la matriz no tiene ruta con terminado en GP2 no hay dato y se cuenta igual. */
  function unPorCaja(c) {
    if (c.uni_x_caja_min == null) return "sin cargar en GP2";
    if (Number(c.uni_x_caja_min) === Number(c.uni_x_caja_max)) return c.uni_x_caja_min + " uni";
    return "entre " + c.uni_x_caja_min + " y " + c.uni_x_caja_max + " uni";
  }
  /* Cajas que tiene que haber: las ENTERAS (total ÷ unidades por caja); lo que sobra son unidades sueltas, que no se cuentan. */
  function cajasEsperadas(c) {
    if (c.uni_x_caja_min == null) return "sin unidades por caja en GP2: contá las cajas igual, queda registrado";
    var f = global.GP2N.fmt;
    if (Number(c.uni_x_caja_min) === Number(c.uni_x_caja_max)) {
      var apc = Number(c.uni_x_caja_min), cj = Math.floor(Number(c.uni) / apc), su = Math.round(Number(c.uni) - cj * apc);
      return f(cj, 0) + (cj === 1 ? " caja" : " cajas") + (su ? " (+ " + f(su, 0) + " uni sueltas)" : "");
    }
    return "entre " + f(Math.floor(Number(c.uni) / Number(c.uni_x_caja_max)), 0) + " y " + f(Math.floor(Number(c.uni) / Number(c.uni_x_caja_min)), 0) + " cajas";
  }
  /* Cajas contadas contra las esperadas. Con un rango de unidades por caja, contra el borde más cercano (0 si cae adentro). */
  function difEnvasado(c, cajas) {
    if (c.uni_x_caja_min == null) return null;
    var lo = Math.floor(Number(c.uni) / Number(c.uni_x_caja_max)), hi = Math.floor(Number(c.uni) / Number(c.uni_x_caja_min));
    var n = Number(cajas), ref = n < lo ? lo : (n > hi ? hi : n);
    return { cajas: n - ref, pct: ref ? (n - ref) / ref * 100 : null };
  }

  /* Neto contra lo esperado. Con un rango, la diferencia es contra el borde más cercano (0 si cae adentro). */
  function diferencia(c) {
    if (c.peso_neto_kg == null || c.kg_esperado_min == null) return null;
    var neto = Number(c.peso_neto_kg), lo = Number(c.kg_esperado_min), hi = Number(c.kg_esperado_max);
    var ref = neto < lo ? lo : (neto > hi ? hi : neto);
    var d = neto - ref;
    return { kg: d, pct: ref ? d / ref * 100 : null };
  }

  /* ── El cartel ─────────────────────────────────────────────────────── */
  var SB = null, abierto = false;

  function cargarScript(src) {
    return new Promise(function (ok, mal) {
      var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = mal; document.head.appendChild(s);
    });
  }
  async function cliente() {
    if (SB) return SB;
    if (!global.supabase) await cargarScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
    if (!global.GP2_SB) await cargarScript(RAIZ + "supabase-config.js?v=20260929a");
    if (!global.GP2N) await cargarScript(RAIZ + "gp2-numero.js?v=20260911o");
    SB = global.GP2_SB();
    return SB;
  }

  function pospuesto() { try { return Number(sessionStorage.getItem(POSPONER) || 0) > Date.now(); } catch (e) { return false; } }

  var paddingAntes = null;
  function cerrar() {
    var o = document.getElementById("vcCartel"); if (o) o.remove(); abierto = false;
    if (paddingAntes !== null) { document.body.style.paddingBottom = paddingAntes; paddingAntes = null; }
  }
  /* Sacar el cartel sin tocar nada de la verificación: vuelve a los 30 min. */
  function posponer() {
    try { sessionStorage.setItem(POSPONER, String(Date.now() + 30 * 60000)); } catch (e) {}
    cerrar();
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && abierto) posponer(); });

  /* «Empezar» / «Seguir verificando»: sella el inicio (sólo la primera vez) y abre la pantalla del módulo. */
  async function ir(b, empezo, btn) {
    btn.disabled = true;
    if (!empezo) {
      var r = await SB.rpc("verif_cajones_empezar", { p_fecha: b.fecha });
      if (r.error) { document.getElementById("vcMsg").textContent = "No se pudo registrar el inicio: " + r.error.message; btn.disabled = false; return; }
    }
    global.location.href = RAIZ + MODULO + "?fecha=" + encodeURIComponent(b.fecha) + "&volver=tablet";
  }

  /* La BANDA: una fila abajo, sin fondo oscuro, que no impide tocar nada de arriba. */
  function pintar(b) {
    var cs = b.cajones || [], empezo = !!(b.dia && b.dia.empezado_en);
    var pend = cs.filter(function (c) { return !c.resultado; }).length;
    var o = document.createElement("div");
    o.id = "vcCartel";
    o.setAttribute("role", "status");
    o.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:#b45309;color:#fff;border-radius:14px;" +
      "padding:10px 12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;box-shadow:0 6px 24px rgba(0,0,0,.35);font-family:Arial,sans-serif";
    o.innerHTML =
      '<div style="flex:1;min-width:220px;font-size:18px;font-weight:900;line-height:1.25">⚖ ' +
        (pend === 1 ? "Hay 1 cajón para verificar" : "Hay " + pend + " cajones para verificar") +
        '<div style="font-size:14px;font-weight:700;opacity:.9">Sorteo de las 15:00 · podés seguir con lo que estás haciendo</div></div>' +
      '<button type="button" id="vcIr" style="min-height:48px;padding:0 16px;border:none;border-radius:10px;background:#fff;color:#111;font-size:18px;font-weight:900;cursor:pointer">' +
        (empezo ? "Seguir verificando" : "▶ Empezar") + '</button>' +
      '<button type="button" id="vcLuego" aria-label="Sacar el aviso (vuelve en 30 min)" title="Sacar el aviso (vuelve en 30 min)" style="min-height:48px;min-width:48px;border:2px solid rgba(255,255,255,.6);border-radius:10px;background:transparent;color:#fff;font-size:22px;font-weight:900;cursor:pointer">✕</button>' +
      '<div id="vcMsg" style="flex-basis:100%;color:#fee2e2;font-size:15px;min-height:0"></div>';
    document.body.appendChild(o);
    abierto = true;
    /* que la banda no tape lo de abajo de la página: se reserva su alto y se devuelve al cerrarla */
    paddingAntes = document.body.style.paddingBottom || "";
    document.body.style.paddingBottom = (o.offsetHeight + 20) + "px";
    document.getElementById("vcLuego").onclick = posponer;
    document.getElementById("vcIr").onclick = function () { ir(b, empezo, this); };
  }

  /* ¿La persona está en la pantalla principal, o en medio de algo? La página que carga el aviso lo define
     (window.GP2VC_LIBRE). Sin definir, siempre libre. Si la función revienta, se asume libre (mejor avisar que callar). */
  function libre() {
    try { return typeof global.GP2VC_LIBRE !== "function" || !!global.GP2VC_LIBRE(); } catch (e) { return true; }
  }

  var ultimo = null;        // el último bundle que pedía verificar algo (null = nada pendiente)

  /* Mira la base y se acuerda de si hay algo pendiente; lo MUESTRA mostrarSiLibre(). */
  async function revisar() {
    try {
      var sb = await cliente();
      var r = await sb.rpc("verif_cajones_bundle", {});
      if (r.error || !r.data) return;
      var b = r.data;
      var pendiente = (b.cajones || []).some(function (c) { return !c.resultado; }) && !(b.dia && b.dia.terminado_en);
      ultimo = pendiente ? b : null;
      if (!ultimo && abierto) cerrar();       // lo terminó otra PC: la banda sobra
      mostrarSiLibre();
    } catch (e) { console.warn("[verif-cajones]", e); }
  }

  /* Muestra la banda si hay algo pendiente, no se pospuso y la persona está en la pantalla principal; si estaba a la vista
     y ahora está en medio de algo, la esconde SIN posponerla (vuelve sola al volver a la pantalla principal). */
  function mostrarSiLibre() {
    if (abierto) { if (!libre()) cerrar(); return; }
    if (ultimo && !pospuesto() && libre()) pintar(ultimo);
  }

  global.GP2VC = { MODULO: MODULO, kg: kg, hora: hora, hhmm: hhmm,
                   esperado: esperado, porUnidad: porUnidad, unidades: unidades, diferencia: diferencia,
                   unPorCaja: unPorCaja, cajasEsperadas: cajasEsperadas, difEnvasado: difEnvasado,
                   revisar: revisar, mostrarSiLibre: mostrarSiLibre };

  /* AUTOMÁTICO: el sorteo es a las 15:00, así que se mira al abrir y cada 2 minutos (aparece aunque la pantalla haya quedado
     abierta desde la mañana) y cada 2 segundos se revisa si la persona pasó a la pantalla principal o salió de ella. */
  if (!global.GP2VC_SIN_CARTEL) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", revisar); else revisar();
    setInterval(revisar, 120000);
    setInterval(mostrarSiLibre, 2000);
  }
})(typeof window !== "undefined" ? window : this);
