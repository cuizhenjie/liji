import { z } from "zod";

import { DemoWorkspaceRepository, SupabaseWorkspaceRepository } from "@/lib/liji/repository";
import { createSupabaseServerClient } from "@/lib/liji/supabase-server";
import type { PrivacySettings } from "@/lib/liji/types";

const privacySchema = z.object({
  piiMasking: z.boolean(),
  cloudModelEnabled: z.boolean(),
  webPushEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  voiceCallEnabled: z.boolean(),
  thirdPartyLinksEnabled: z.boolean(),
  notificationPhone: z.string().max(32).optional(),
});

export async function POST(request: Request) {
  const privacy = privacySchema.parse(await request.json()) as PrivacySettings;
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return Response.json({
      privacy: await new DemoWorkspaceRepository().updatePrivacy("demo-user", privacy),
      source: "demo",
    });
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }

  const repository = new SupabaseWorkspaceRepository(supabase);

  return Response.json({
    privacy: await repository.updatePrivacy(data.user.id, privacy),
    source: "supabase",
  });
}
