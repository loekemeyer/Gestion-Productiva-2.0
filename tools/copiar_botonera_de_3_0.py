#!/usr/bin/env python3
"""Copia la botonera del operario de Registro Producción 3.0 a la tablet de GP2 (Produccion/RegistroApp/).

[Elías, 08/10/2026] «se va a dejar de modificar en GP2 y modificar en este [Registro Producción 3.0], y GP2 sólo hacer
copia y hacer modificaciones para testear»; «hacé que GP2 use el código de la TV» — «recién cuando entra acá [Versión
Tablet Operarios]: el login de admin sigue siendo por Gmail». Elegido: la copia graba IGUAL que 3.0 (reg_prod_3_0).

Uso (desde la raíz de GP2):
    python3 tools/copiar_botonera_de_3_0.py --rp3 <clon de loekemeyer/Registro-Produccion-3.0> --token 20261008b

Toma cervantes-gp2/app.js e index.html de 3.0 TAL CUAL y les cambia SÓLO esto:
  1. claves del celular rp3c_* -> gp2c_*: el dominio (loekemeyer.github.io) es el mismo y comparte localStorage; así la
     cola, el pase y el estado de esta copia no se mezclan con los de la app de 3.0 en el mismo celular;
  2. p_app "cervantes" -> "gp2": los ingresos con el código de la TV quedan marcados como de GP2;
  3. sin `const APP_VERSION` (regla de GP2, tests/ui/test_tokens_cache.js): la versión viaja como COPIA_GP2 =
     "gp2-<token>/<versión de 3.0>" en el app_version de cada toque -> en reg_prod_3_0.crudo_cervantes lo cargado
     desde esta copia se reconoce por app_version like 'gp2-%';
  4. sin service worker propio: Produccion/RegistroApp/sw.js es el del Registro_GP2.html de oficina, no el de 3.0;
  5. «← Volver» (pantalla del código) y «← Menú» van al menú de GP2, no al inicio de 3.0;
  6. HTML: auth-guard.js (login de admin con Gmail, como el resto de GP2), título «Operarios GP2», sin manifiesto (se
     abre desde el menú), y el MI_V y el ?v= con el token (los dos iguales, regla de GP2).
Antes de pisar, se fija si la tablet de GP2 tiene cambios que no están en 3.0 (con el camino de vuelta de 3.0); si los tiene,
no copia nada y dice que primero se traigan (o --pisar para descartarlos a propósito).
Copia también la prueba: tests/cervantes-gp2.cjs de 3.0 -> tests/ui/test_op_e2e.js (la misma, con esas diferencias).
Lo demás es idéntico a 3.0. Si en 3.0 cambió alguno de esos pedazos, NO copia nada y dice cuál.
El camino de vuelta (lo terminado en GP2 -> 3.0) es tools/traer_de_gp2.py de Registro 3.0, que usa estas mismas funciones
para comprobar que la vuelta es exacta.
"""
import argparse
import importlib.util
import os
import re
import sys

sys.dont_write_bytecode = True   # al cargar el script del otro repo no deja __pycache__ en ninguno de los dos

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
DESTINO = os.path.join(RAIZ, 'Produccion', 'RegistroApp')


class Falta(Exception):
    pass


def una(src, viejo, nuevo, que):
    n = src.count(viejo)
    if n != 1:
        raise Falta(f'{que}: se esperaba 1 vez y está {n}: {viejo[:100]!r}')
    return src.replace(viejo, nuevo)


def copiar_js(js, token):
    m = re.search(r'const APP_VERSION = "(v[\d.]+)";\n', js)
    if not m:
        raise Falta('no está const APP_VERSION = "v…" en app.js')
    ver = m.group(1)
    copia = f'gp2-{token}/{ver}'
    js = una(js, '"use strict";\n', f'''"use strict";

/* ⚠ COPIA PARA PROBAR — la FUENTE es cervantes-gp2/app.js de loekemeyer/Registro-Produccion-3.0 ({ver}).
   Copiada con tools/copiar_botonera_de_3_0.py [Elías, 08/10/2026: «GP2 sólo hacer copia y hacer modificaciones para
   testear»]. Lo que tiene que llegar a los operarios se cambia en 3.0, no acá: la próxima copia pisa este archivo.
   Graba IGUAL que 3.0 (código de la TV, pase, funciones reg_prod_3_0); lo cargado desde acá lleva app_version '{copia}'.
   Diferencias con 3.0: claves gp2c_*, p_app "gp2", sin service worker propio y «Volver» al menú de GP2. */
''', 'cabecera')
    js = una(js, m.group(0), f'const COPIA_GP2 = "{copia}";   // va en el app_version de cada toque (GP2 no lleva const de versión)\n', 'versión')
    js = una(js, 'app_version: APP_VERSION', 'app_version: COPIA_GP2', 'app_version del toque')
    # service worker: fuera el bloque y su llamada
    i = js.find('/* ============================================================\n   SERVICE WORKER')
    j = js.find('/* ============================================================\n   INIT')
    if i < 0 or j < 0 or j < i:
        raise Falta('no están los bloques SERVICE WORKER / INIT')
    js = js[:i] + js[j:]
    js = una(js, '  registrarServiceWorker();\n', '', 'llamada al service worker')
    if 'APP_VERSION' in js:
        raise Falta('quedó un APP_VERSION en app.js (3.0 lo usa en un lugar nuevo)')
    # claves propias y marca de la app
    if js.count('"rp3c_') < 7:
        raise Falta(f'claves rp3c_: se esperaban 7 o más y hay {js.count(chr(34) + "rp3c_")}')
    js = js.replace('"rp3c_', '"gp2c_')
    if js.count('p_app: "cervantes"') != 2:
        raise Falta(f'p_app "cervantes": se esperaban 2 y hay {js.count(chr(112) + "_app: " + chr(34) + "cervantes" + chr(34))}')
    js = js.replace('p_app: "cervantes"', 'p_app: "gp2"')
    js = una(js, 'volver.href = "../"; volver.textContent = "← Volver al inicio";',
             'volver.href = "../../GP2_MODULOS.html"; volver.textContent = "← Volver al menú";', '«Volver» del código de la TV')
    if 'rp3c_' in js:
        raise Falta('quedó una clave rp3c_ sin pasar a gp2c_')
    return js, ver


def copiar_html(html, token, guard):
    html = una(html, '<meta charset="UTF-8" />\n', f'<meta charset="UTF-8" />\n{guard}\n', 'auth-guard')
    html = una(html, '<meta name="apple-mobile-web-app-title" content="Registro" />',
               '<meta name="apple-mobile-web-app-title" content="Operarios GP2" />', 'título de la app')
    html = una(html, '<title>Registro Produccion</title>', '<title>Operarios GP2</title>', 'título')
    # sin manifiesto: el de Produccion/RegistroApp es el viejo de oficina (start_url ./ no abre nada); la tablet se abre desde el menú
    html = una(html, '  <link rel="manifest" href="manifest.json" />\n', '', 'manifiesto')
    html, n = re.subn(r"var MI_V = '[^']*';", f"var MI_V = '{token}';", html)
    if n != 1:
        raise Falta('MI_V')
    html = una(html, r"html.match(/app\.js\?v=([\w.]+)/)", r"html.match(/operarios_gp2\.js\?v=([\w.]+)/)", 'auto-recarga')
    html = una(html, "var flag = 'rp3c_reload_' + m[1];", "var flag = 'gp2_reload_' + m[1];", 'auto-recarga (flag)')
    html = una(html, '''<button id="btnMenu" title="Volver al inicio (elegir planta)" onclick="location.href='../'">''',
               '''<button id="btnMenu" title="Salir al menú principal" onclick="location.href='../../GP2_MODULOS.html'">''', 'botón Menú')
    html, n = re.subn(r'<script src="app\.js\?v=[^"]*"></script>', f'<script src="operarios_gp2.js?v={token}"></script>', html)
    if n != 1:
        raise Falta('script app.js del final')
    if 'rp3c_' in html:
        raise Falta('quedó una clave rp3c_ en el HTML')
    return html


CABECERA_TEST_30 = '/* Cervantes · botonera de GP2 (cervantes-gp2/, v3.1.3) — entra con el código de la TV, usa el PASE y habla con el schema reg_prod_3_0.'
CABECERA_TEST_GP2 = """/* Tablet de operarios de GP2 = COPIA de la botonera de Registro Producción 3.0 (cervantes-gp2/) desde el 08/10/2026
   [Elías: «GP2 sólo hacer copia y hacer modificaciones para testear»; «hacé que GP2 use el código de la TV»].
   Esta prueba es la MISMA de 3.0 (tests/cervantes-gp2.cjs) con las diferencias de la copia (claves gp2c_, p_app "gp2", app_version
   'gp2-…', se abre como archivo). Si 3.0 cambia la botonera, se copia con tools/copiar_botonera_de_3_0.py y se trae su prueba.
   Entra con el código de la TV, usa el PASE y habla con el schema reg_prod_3_0."""
REQUIRE_30 = """let chromium;
try { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }
catch (_e) { try { ({ chromium } = require("playwright")); } catch (_e2) { console.error("Playwright no encontrado."); process.exit(2); } }
const { servir } = require("./_servidor.cjs");
"""
REQUIRE_GP2 = """const { chromium } = require("playwright");
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
// Se abre como ARCHIVO (file://): así el auth-guard (login de admin con Gmail) no actúa, como en el resto de las pruebas de GP2.
const URL_APP = "file://" + path.resolve(__dirname, "..", "..", "Produccion", "RegistroApp", "Operarios_GP2.html").replace(/\\\\/g, "/");
"""
PARES_TEST = [  # (3.0, GP2) — se aplican en este orden; los de una sola vez se controlan
    (CABECERA_TEST_30, CABECERA_TEST_GP2),
    (REQUIRE_30, REQUIRE_GP2),
    ('  const srv = await servir();\n  const b = await chromium.launch();', '  const b = await chromium.launch(EXE ? { executablePath: EXE } : {});'),
    ('reg.cuerpo.p_app === "cervantes"', 'reg.cuerpo.p_app === "gp2"'),
    ('console.log(`cervantes-gp2: ', 'console.log(`test_op_e2e (copia de 3.0): '),
    ('await b.close(); await srv.cerrar();', 'await b.close();'),
]
VERSION_TEST_GP2 = r'/^gp2-\d{8}[a-z]\/v3\.1\.\d+$/.test(e1.p.toque.app_version)'


def copiar_test(src):
    """tests/cervantes-gp2.cjs de 3.0 -> tests/ui/test_op_e2e.js de GP2 (la misma prueba, con las diferencias de la copia)."""
    for viejo, nuevo in PARES_TEST:
        src = una(src, viejo, nuevo, 'prueba')
    src = src.replace('srv.url + "/cervantes-gp2/"', 'URL_APP').replace('"rp3c_', '"gp2c_')
    src, n = re.subn(r'e1\.p\.toque\.app_version === "v[\d.]+"', VERSION_TEST_GP2.replace('\\', '\\\\'), src)
    if n != 1:
        raise Falta('prueba: el chequeo de app_version')
    if 'srv' in src or 'rp3c_' in src or '_servidor' in src:
        raise Falta('prueba: quedó algo del servidor de 3.0 o una clave rp3c_')
    return src


def cambios_sin_traer(rp3):
    """Antes de pisar la tablet: ¿tiene GP2 cambios que no están en 3.0? [Elías, 08/10: «antes de hacer un cambio fijate si había
    cambios en el original de GP2»]. Usa el camino de vuelta de 3.0 (tools/traer_de_gp2.py): si lo de GP2 llevado a 3.0 da
    exactamente lo que hay en 3.0, no hay nada que perder. Devuelve None si se puede copiar, o el motivo para no hacerlo."""
    spec = importlib.util.spec_from_file_location('traer_rp3', os.path.join(rp3, 'tools', 'traer_de_gp2.py'))
    vuelta = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(vuelta)
    try:
        js, html, test, base, token = vuelta.traer(RAIZ, avisar=lambda _m: None)
    except vuelta.Falta as e:
        return f'no se pudo comparar la tablet de GP2 con 3.0 ({e}).\n  Si es a propósito descartar lo de GP2: --pisar'
    hoy = tuple(open(os.path.join(rp3, *p), encoding='utf8').read()
                for p in (('cervantes-gp2', 'app.js'), ('cervantes-gp2', 'index.html'), ('tests', 'cervantes-gp2.cjs')))
    if (js, html, test) != hoy:
        return ('la tablet de GP2 tiene cambios que todavía no están en 3.0 (se perderían).\n  Primero traerlos: en 3.0, '
                'python3 tools/traer_de_gp2.py --gp2 <este repo> --revisar (y después --version 3.1.N); o --pisar para descartarlos.')
    return None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--rp3', required=True, help='clon de loekemeyer/Registro-Produccion-3.0')
    ap.add_argument('--token', required=True, help='token de caché nuevo de la tablet (ej. 20261008b), igual en MI_V y ?v=')
    ap.add_argument('--pisar', action='store_true', help='copiar aunque la tablet de GP2 tenga cambios sin traer a 3.0 (se pierden)')
    a = ap.parse_args()
    if not re.fullmatch(r'\d{8}[a-z]', a.token):
        sys.exit('El token es la fecha + una letra (ej. 20261008b), como el resto de GP2.')
    origen = os.path.join(a.rp3, 'cervantes-gp2')
    js = open(os.path.join(origen, 'app.js'), encoding='utf8').read()
    test = open(os.path.join(a.rp3, 'tests', 'cervantes-gp2.cjs'), encoding='utf8').read()
    html = open(os.path.join(origen, 'index.html'), encoding='utf8').read()
    actual = open(os.path.join(DESTINO, 'Operarios_GP2.html'), encoding='utf8').read()
    g = re.search(r'<script src="\.\./\.\./auth-guard\.js\?v=[^"]*"></script>', actual)
    guard = g.group(0) if g else '<script src="../../auth-guard.js?v=20261006b"></script>'
    if not a.pisar:
        motivo = cambios_sin_traer(a.rp3)
        if motivo:
            sys.exit('NO SE COPIÓ NADA — ' + motivo)
    try:
        js2, ver = copiar_js(js, a.token)
        html2 = copiar_html(html, a.token, guard)
        test2 = copiar_test(test)
    except Falta as e:
        sys.exit('NO SE COPIÓ NADA — en 3.0 cambió algo que esta copia adapta:\n  ' + str(e))
    open(os.path.join(DESTINO, 'operarios_gp2.js'), 'w', encoding='utf8').write(js2)
    open(os.path.join(DESTINO, 'Operarios_GP2.html'), 'w', encoding='utf8').write(html2)
    open(os.path.join(RAIZ, 'tests', 'ui', 'test_op_e2e.js'), 'w', encoding='utf8').write(test2)
    print(f'Tablet de GP2 copiada de Registro 3.0 {ver} con el token {a.token}. Revisar con: git diff Produccion/RegistroApp/ tests/ui/test_op_e2e.js')


if __name__ == '__main__':
    main()
