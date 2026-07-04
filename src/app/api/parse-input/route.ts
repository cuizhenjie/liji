import { demoContacts } from "@/lib/liji/sample-data";
import { createAuditLogEntry, persistAuditLog } from "@/lib/liji/audit";
import { SupabaseWorkspaceRepository } from "@/lib/liji/repository";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/liji/supabase-server";
import {
  captureSourceSchema,
  parseInputWithProvider,
} from "@/lib/liji/ai";

const bodySchema = {
  async parse(request: Request) {
    const body = await request.json().catch(() => ({}));
    return {
      text: typeof body.text === "string" ? body.text : "",
      source: captureSourceSchema.catch("text").parse(body.source),
      allowCloudModel: body.allowCloudModel === true,
    };
  },
};

export async function POST(request: Request) {
  const body = await bodySchema.parse(request);

  if (!body.text.trim()) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { contacts, source, userId, allowCloudModel } = supabase
    ? await supabase.auth.getUser().then(async ({ data }) => {
        if (!data.user) {
          return {
            contacts: demoContacts,
            source: "demo" as const,
            userId: undefined,
            allowCloudModel: false,
          };
        }

        const repository = new SupabaseWorkspaceRepository(supabase);
        const workspace = await repository.getWorkspace(data.user.id);
        return {
          contacts: workspace.contacts.length > 0 ? workspace.contacts : demoContacts,
          source: "supabase" as const,
          userId: data.user.id,
          allowCloudModel: body.allowCloudModel && workspace.privacy.cloudModelEnabled,
        };
      })
    : {
        contacts: demoContacts,
        source: "demo" as const,
        userId: undefined,
        allowCloudModel: false,
      };

  const result = await parseInputWithProvider({
    text: body.text,
    contacts,
    source: body.source,
    allowCloudModel,
    now: new Date(),
  });

  return Response.json({
    capture: result.capture,
    provider: result.provider,
    piiTokenCount: result.piiTokens.length,
    auditPersistence: userId
      ? await persistAuditLog(
          createAuditLogEntry({
            userId,
            action: "ai_parse",
            entityTable: "capture_items",
            entityId: result.capture.id,
            metadata: {
              provider: result.provider,
              cloudModelRequested: body.allowCloudModel,
              cloudModelAllowed: allowCloudModel,
              source: body.source,
              piiTokenCount: result.piiTokens.length,
            },
          }),
          createSupabaseServiceClient()
        )
      : { persisted: false, error: null },
    source,
  });
}
