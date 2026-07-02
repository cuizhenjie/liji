import webPush from "web-push";

import { env } from "./env";

export type StoredPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type WebPushSendResult =
  | { status: "unconfigured"; attempted: 0; sent: 0; failed: 0 }
  | { status: "sent"; attempted: number; sent: number; failed: number };

type VapidConfig = {
  publicKey?: string;
  privateKey?: string;
  subject?: string;
};

function resolveVapidConfig(config?: VapidConfig): Required<VapidConfig> | null {
  const resolved = {
    publicKey: config?.publicKey ?? env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    privateKey: config?.privateKey ?? env.VAPID_PRIVATE_KEY,
    subject: config?.subject ?? env.VAPID_SUBJECT,
  };

  return resolved.publicKey && resolved.privateKey && resolved.subject
    ? (resolved as Required<VapidConfig>)
    : null;
}

export async function sendWebPushNotifications(params: {
  subscriptions: StoredPushSubscription[];
  title: string;
  body: string;
  url?: string;
  vapid?: VapidConfig;
}): Promise<WebPushSendResult> {
  const vapid = resolveVapidConfig(params.vapid);
  if (!vapid) {
    return { status: "unconfigured", attempted: 0, sent: 0, failed: 0 };
  }

  webPush.setVapidDetails(
    vapid.subject,
    vapid.publicKey,
    vapid.privateKey
  );

  const payload = JSON.stringify({
    title: params.title,
    body: params.body,
    url: params.url ?? "/",
  });
  const results = await Promise.allSettled(
    params.subscriptions.map((subscription) =>
      webPush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        payload
      )
    )
  );
  const sent = results.filter((result) => result.status === "fulfilled").length;

  return {
    status: "sent",
    attempted: params.subscriptions.length,
    sent,
    failed: params.subscriptions.length - sent,
  };
}
