// Service worker Rénolien : notifications sur le téléphone
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { titre: "Rénolien", texte: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.titre || "Rénolien", {
    body: d.texte || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { lien: d.lien || "/" },
    tag: d.tag || undefined,
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const lien = (e.notification.data && e.notification.data.lien) || "/";
  e.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const f of fenetres) {
      if ("focus" in f) { await f.navigate(lien).catch(() => {}); return f.focus(); }
    }
    return self.clients.openWindow(lien);
  })());
});
