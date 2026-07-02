import { z } from "zod";

import { createAuditLogEntry, persistAuditLog } from "@/lib/liji/audit";
import { cloudDeletionTableOrder, createDeletionRequest } from "@/lib/liji/privacy";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/liji/supabase-server";

const requestSchema = z.object({
  scope: z.enum(["local", "cloud"]).default("local"),
});

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json().catch(() => ({})));
  const deletion = createDeletionRequest(body.scope);

  if (body.scope === "cloud") {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      const audit = createAuditLogEntry({
        action: "delete",
        entityTable: "workspace_cloud",
        metadata: { scope: body.scope, mode: "demo" },
      });
      const auditPersistence = await persistAuditLog(audit, createSupabaseServiceClient());

      return Response.json({
        deletion,
        audit,
        auditPersistence,
        deletedTables: [],
        source: "demo",
      });
    }

    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) {
      return Response.json({ error: "authentication required" }, { status: 401 });
    }

    const deletedTables: string[] = [];
    for (const table of cloudDeletionTableOrder) {
      const { error } = await supabase.from(table).delete().eq("user_id", data.user.id);
      if (error) {
        return Response.json({ error: `${table}: ${error.message}` }, { status: 500 });
      }
      deletedTables.push(table);
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", data.user.id);
    if (profileError) {
      return Response.json({ error: `profiles: ${profileError.message}` }, { status: 500 });
    }
    deletedTables.push("profiles");

    const audit = createAuditLogEntry({
      userId: data.user.id,
      action: "delete",
      entityTable: "workspace_cloud",
      metadata: { scope: body.scope, deletedTables },
    });
    const auditPersistence = await persistAuditLog(audit, createSupabaseServiceClient());

    return Response.json({
      deletion,
      audit,
      auditPersistence,
      deletedTables,
      source: "supabase",
    });
  }

  const audit = createAuditLogEntry({
    action: "delete",
    entityTable: "workspace_local",
    metadata: { scope: body.scope },
  });
  const auditPersistence = await persistAuditLog(audit, createSupabaseServiceClient());

  return Response.json({
    deletion,
    audit,
    auditPersistence,
    source: "demo",
  });
}
