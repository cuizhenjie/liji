import { z } from "zod";

import { createAuditLogEntry, persistAuditLog } from "@/lib/liji/audit";
import { createUuid } from "@/lib/liji/ids";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/liji/supabase-server";
import { mapPrivacy } from "@/lib/liji/supabase-mappers";

const clickSchema = z.object({
  planId: z.string(),
  planItemId: z.string().optional(),
  provider: z.enum(["jd", "taobao", "meituan", "ctrip", "tongcheng"]),
  targetUrl: z.string().url(),
});

export async function POST(request: Request) {
  const body = clickSchema.parse(await request.json());
  const click = {
    id: createUuid(),
    planId: body.planId,
    planItemId: body.planItemId,
    provider: body.provider,
    targetUrl: body.targetUrl,
    clickedAt: new Date().toISOString(),
  };
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    const audit = createAuditLogEntry({
      action: "fulfill",
      entityTable: "fulfillment_clicks",
      entityId: click.id,
      metadata: {
        planId: click.planId,
        provider: click.provider,
      },
    });
    const auditPersistence = await persistAuditLog(audit, createSupabaseServiceClient());

    return Response.json({
      click,
      audit,
      auditPersistence,
      source: "demo",
    });
  }

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }

  const { data: privacyRow, error: privacyError } = await supabase
    .from("privacy_settings")
    .select("*")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (privacyError) {
    return Response.json({ error: privacyError.message }, { status: 500 });
  }
  if (!mapPrivacy(privacyRow).thirdPartyLinksEnabled) {
    return Response.json({ error: "third-party fulfillment links disabled" }, { status: 403 });
  }

  const target = new URL(click.targetUrl);
  const { error } = await supabase.from("fulfillment_clicks").insert({
    id: click.id,
    user_id: data.user.id,
    plan_id: click.planId,
    plan_item_id: click.planItemId,
    provider: click.provider,
    target_url: click.targetUrl,
    tracking_params: Object.fromEntries(target.searchParams.entries()),
    clicked_at: click.clickedAt,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const audit = createAuditLogEntry({
    userId: data.user.id,
    action: "fulfill",
    entityTable: "fulfillment_clicks",
    entityId: click.id,
    metadata: {
      planId: click.planId,
      provider: click.provider,
    },
  });
  const auditPersistence = await persistAuditLog(audit, createSupabaseServiceClient());

  return Response.json({
    click,
    audit,
    auditPersistence,
    source: "supabase",
  });
}
