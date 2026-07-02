import { createAuditLogEntry, persistAuditLog } from "@/lib/liji/audit";
import { exportWorkspaceData, redactWorkspaceData } from "@/lib/liji/privacy";
import { SupabaseWorkspaceRepository } from "@/lib/liji/repository";
import { demoWorkspace } from "@/lib/liji/sample-data";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/liji/supabase-server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return Response.json({ error: "authentication required" }, { status: 401 });
    }

    const repository = new SupabaseWorkspaceRepository(supabase);
    const workspace = await repository.getWorkspace(data.user.id);
    const exported = JSON.parse(exportWorkspaceData(redactWorkspaceData(workspace)));
    const audit = createAuditLogEntry({
      userId: data.user.id,
      action: "export",
      entityTable: "workspace",
      metadata: { redacted: true, source: "supabase" },
    });
    const auditPersistence = await persistAuditLog(audit, createSupabaseServiceClient());

    return Response.json({
      export: exported,
      audit,
      auditPersistence,
      source: "supabase",
    });
  }

  const exported = JSON.parse(exportWorkspaceData(redactWorkspaceData(demoWorkspace)));
  const audit = createAuditLogEntry({
    action: "export",
    entityTable: "workspace",
    metadata: { redacted: true, source: "demo" },
  });
  const auditPersistence = await persistAuditLog(audit, createSupabaseServiceClient());

  return Response.json({
    export: exported,
    audit,
    auditPersistence,
    source: "demo",
  });
}
