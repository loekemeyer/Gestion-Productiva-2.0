/* =========================================================
   sw.js — Service Worker de GP2.

   Su unico proposito es que la app sea instalable como PWA (ventana propia,
   sin barra de direcciones). NO cachea nada, a proposito:

   - Los datos salen de Supabase en vivo.
   - Cachear el HTML dejaria tablets pegadas a una version vieja del codigo,
     que es justo lo que el sistema de tokens ?v=... viene evitando.
   - server-local.ps1 ya responde todo con
     Cache-Control: no-cache, no-store, must-revalidate.

   Mismo criterio que el SW de Produccion Virgilio.
   ========================================================= */

const SW_VERSION = "gp2-v1";

self.addEventListener("install", () => {
  // La version nueva toma control de inmediato, sin quedar en waiting.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Si alguna version futura llegara a cachear, al activar se limpia todo:
    // asi ningun equipo queda pegado a HTML viejo.
    try {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    } catch (e) { /* no-op */ }
    await self.clients.claim();
  })());
});

/* Handler de fetch vacio: no interceptamos ningun request, todo va derecho a
   la red. Existe porque algunos navegadores solo consideran "completo" a un
   SW que tenga handler de fetch. */
self.addEventListener("fetch", () => {});
