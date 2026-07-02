import { z } from "zod";

import { DemoWorkspaceRepository, SupabaseWorkspaceRepository } from "@/lib/liji/repository";
import { createSupabaseServerClient } from "@/lib/liji/supabase-server";
import type { Contact } from "@/lib/liji/types";

const contactSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  relation: z.string().min(1),
  labels: z.array(z.string()).default([]),
  birthday: z.string().optional(),
  calendarType: z.enum(["solar", "lunar"]).default("solar"),
  preferences: z.array(z.unknown()).default([]),
  compliance: z.object({
    riskTags: z.array(z.string()).default([]),
    giftLimitCny: z.number().optional(),
    hospitalityLimitCny: z.number().optional(),
    policyNote: z.string(),
  }),
  lastInteractionAt: z.string().optional(),
  aiMemoryHealth: z.number().min(0).max(100).default(80),
});

export async function POST(request: Request) {
  const contact = contactSchema.parse(await request.json()) as Contact;
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return Response.json({
      contact: await new DemoWorkspaceRepository().upsertContact("demo-user", contact),
      source: "demo",
    });
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }

  const repository = new SupabaseWorkspaceRepository(supabase);

  return Response.json({
    contact: await repository.upsertContact(data.user.id, contact),
    source: "supabase",
  });
}

export async function DELETE(request: Request) {
  const contactId = new URL(request.url).searchParams.get("id");
  if (!contactId) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return Response.json({
      id: contactId,
      deleted: true,
      source: "demo",
    });
  }

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", contactId)
    .eq("user_id", data.user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    id: contactId,
    deleted: true,
    source: "supabase",
  });
}
