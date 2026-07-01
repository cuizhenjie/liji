self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const data = event.data?.json?.() ?? {
    title: "礼记提醒",
    body: "你有一条待确认事项。",
  };

  event.waitUntil(
    self.registration.showNotification(data.title ?? "礼记提醒", {
      body: data.body ?? "请打开礼记确认。",
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: data.url ?? "/",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data || "/";
  event.waitUntil(self.clients.openWindow(url));
});
