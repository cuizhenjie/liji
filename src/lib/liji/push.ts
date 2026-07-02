export type PushRegistrationResult =
  | { status: "registered"; endpoint: string }
  | { status: "unsupported"; reason: string }
  | { status: "denied"; reason: string }
  | { status: "unconfigured"; reason: string };

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export function isPushRegistrationSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in globalThis
  );
}

export async function registerBrowserPushSubscription(params: {
  vapidPublicKey?: string;
  fetcher?: typeof fetch;
  userAgent?: string;
} = {}): Promise<PushRegistrationResult> {
  const vapidPublicKey = params.vapidPublicKey ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    return { status: "unconfigured", reason: "NEXT_PUBLIC_VAPID_PUBLIC_KEY 未配置。" };
  }

  if (!isPushRegistrationSupported()) {
    return { status: "unsupported", reason: "当前浏览器不支持 Web Push。" };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { status: "denied", reason: "用户未授权通知权限。" };
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));
  const payload = subscription.toJSON() as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys.auth) {
    return { status: "unsupported", reason: "浏览器未返回完整 Push subscription。" };
  }

  await (params.fetcher ?? fetch)("/api/push-subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: payload.endpoint,
      keys: {
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
      },
      userAgent: params.userAgent ?? navigator.userAgent,
    }),
  });

  return { status: "registered", endpoint: payload.endpoint };
}
