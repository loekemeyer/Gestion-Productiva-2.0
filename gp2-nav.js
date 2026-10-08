/* =========================================================
   gp2-nav.js — la NAVEGACION PERSISTENTE de GP2 (2026-10-08).

   Se carga en TODAS las pantallas (despues de gp2-menu.js) y hace dos cosas:

   1. Convierte la marca GP2 de la barra (.header) en un boton que abre el
      selector de modulos: los mismos grupos del menu principal, con la
      pantalla actual marcada. Se salta de Stock General a Control Partes sin
      volver al menu. Sin este archivo la barra muestra la marca sola (CSS).

   2. Mide el alto REAL de la barra (crece si el titulo o los botones pasan a
      dos lineas en el celular) y lo deja en --bar-h: con eso los encabezados
      de tabla y los titulos pegajosos quedan justo debajo, nunca tapados.

   No toca datos ni llama a la base. El rol "envios" (tablet de logistica con
   acceso restringido, auth-guard.js) NO ve el selector: no tiene permiso para
   la mayoria de esos modulos.
   ========================================================= */
(function () {
  var me = document.currentScript;
  var RAIZ = me && me.src ? me.src.replace(/[^\/]*$/, '') : '';

  function rol() { try { return sessionStorage.getItem('gp_role') || 'admin'; } catch (e) { return 'admin'; } }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ¿El link apunta a esta pantalla? Misma ruta y, si el link trae ?algo (Stock por
     Sector usa ?sector=N), la misma consulta. */
  function esActual(href) {
    try {
      var u = new URL(href, RAIZ || location.href);
      if (decodeURIComponent(u.pathname) !== decodeURIComponent(location.pathname)) return false;
      if (!u.search) return true;
      var q = new URLSearchParams(location.search), ql = new URLSearchParams(u.search), ok = true;
      ql.forEach(function (v, k) { if (q.get(k) !== v) ok = false; });
      return ok;
    } catch (e) { return false; }
  }

  function medir(bar) {
    var set = function () {
      var h = Math.round(bar.getBoundingClientRect().height) + 3;   // + la linea azul de abajo
      document.documentElement.style.setProperty('--bar-h', h + 'px');
    };
    set();
    if (window.ResizeObserver) new ResizeObserver(set).observe(bar);
    else window.addEventListener('resize', set);
  }

  function armar() {
    var bar = document.querySelector('.header');
    if (!bar || bar.querySelector('.gp2-nav-btn')) return;
    medir(bar);
    if (rol() === 'envios') return;
    var MENU = self.GP2_MENU || [];
    if (!MENU.length) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gp2-nav-btn';
    btn.setAttribute('aria-label', 'Módulos de GP2');
    btn.setAttribute('aria-expanded', 'false');
    btn.title = 'Ir a otro módulo';
    btn.innerHTML = '<img src="' + RAIZ + 'icons/gp2-mark-64.png" alt=""><span class="gnb-car">▾</span>';
    bar.insertBefore(btn, bar.firstChild);

    var ov = document.createElement('div');
    ov.className = 'gp2-nav-ov';
    var nav = document.createElement('nav');
    nav.className = 'gp2-nav';
    nav.setAttribute('aria-label', 'Módulos');
    var ver = (self.APP_VERSION ? 'v' + String(self.APP_VERSION).replace(/^v/, '') : '');
    var h = '<div class="gp2-nav-h"><img src="' + RAIZ + 'icons/gp2-mark-64.png" alt="">' +
      '<b>Gestión Productiva<small>' + esc(ver || 'GP2') + '</small></b>' +
      '<button type="button" class="gp2-nav-x" aria-label="Cerrar">✕</button></div><div class="gp2-nav-b">' +
      '<a class="home" href="' + RAIZ + 'GP2_MODULOS.html">⌂ Menú principal</a>';
    MENU.forEach(function (g) {
      h += '<div class="gp2-nav-g">' + esc(g[1]) + '</div>';
      (g[2] || []).forEach(function (it) {
        if (!it[1]) return;                         // candado: no se ofrece
        var href = RAIZ + it[1];
        h += '<a href="' + href + '"' + (esActual(href) ? ' class="on" aria-current="page"' : '') + '>' + esc(it[0]) + '</a>';
      });
    });
    h += '</div><div class="gp2-nav-f">';
    (self.GP2_ACCESOS || []).forEach(function (a) {
      h += '<a class="btn btn-secondary btn-sm" href="' + RAIZ + a[1] + '">' + esc(a[0]) + '</a>';
    });
    h += '</div>';
    nav.innerHTML = h;
    document.body.appendChild(ov);
    document.body.appendChild(nav);

    function abrir(si) {
      nav.classList.toggle('on', si); ov.classList.toggle('on', si);
      btn.setAttribute('aria-expanded', si ? 'true' : 'false');
      if (si) { var a = nav.querySelector('a.on') || nav.querySelector('a'); if (a) a.focus({ preventScroll: false }); }
      else btn.focus();
    }
    btn.addEventListener('click', function () { abrir(!nav.classList.contains('on')); });
    ov.addEventListener('click', function () { abrir(false); });
    nav.querySelector('.gp2-nav-x').addEventListener('click', function () { abrir(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('on')) abrir(false); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', armar);
  else armar();
})();
