import { z } from "zod";

import { createAuditLogEntry, persistAuditLog } from "@/lib/liji/audit";
import { createUuid } from "@/lib/liji/ids";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/liji/supabase-server";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().optional(),
});

export async function POST(request: Request) {
  const body = subscriptionSchema.parse(await request.json());
  const subscription = {
    id: createUuid(),
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    auth: body.keys.auth,
    userAgent: body.userAgent,
    enabled: true,
  };
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    const audit = createAuditLogEntry({
      action: "create",
      entityTable: "web_push_subscriptions",
      entityId: subscription.id,
      metadata: { endpointHost: new URL(subscription.endpoint).host },
    });
    const auditPersistence = await persistAuditLog(audit, createSupabaseServiceClient());

    return Response.json({
      subscription,
      audit,
      auditPersistence,
      source: "demo",
    });
  }

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }

  const { error } = await supabase.from("web_push_subscriptions").upsert(
    {
      id: subscription.id,
      user_id: data.user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      user_agent: subscription.userAgent,
      enabled: subscription.enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const audit = createAuditLogEntry({
    userId: data.user.id,
    action: "create",
    entityTable: "web_push_subscriptions",
    entityId: subscription.id,
    metadata: { endpointHost: new URL(subscription.endpoint).host },
  });
  const auditPersistence = await persistAuditLog(audit, createSupabaseServiceClient());

  return Response.json({
    subscription,
    audit,
    auditPersistence,
    source: "supabase",
  });
}
