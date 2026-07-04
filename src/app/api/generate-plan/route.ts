import { z } from "zod";

import { generateFestivalPlan, generateTravelPlan } from "@/lib/liji/budget";
import { buildPlanFulfillmentLinks } from "@/lib/liji/fulfillment";
import { summarizeCpsAttribution } from "@/lib/liji/cps";
import { SupabaseWorkspaceRepository } from "@/lib/liji/repository";
import { demoContacts, demoEvents, demoWorkspace } from "@/lib/liji/sample-data";
import { createSupabaseServerClient } from "@/lib/liji/supabase-server";
import type { CalendarEvent, Contact } from "@/lib/liji/types";

const requestSchema = z.object({
  scenario: z.enum(["festival", "travel"]),
  eventId: z.string().optional(),
  contactId: z.string().optional(),
  title: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  destination: z.string().optional(),
  origin: z.string().optional(),
  transportPriority: z.enum(["rail_under_5h", "fastest", "comfort"]).optional(),
  hotelStandard: z.enum(["business", "premium", "budget"]).optional(),
  mealStandard: z.enum(["standard", "business"]).optional(),
  clientAddress: z.string().optional(),
  maxHotelDistanceKm: z.number().positive().optional(),
  budgetCny: z.number().optional(),
  dailyLimitCny: z.number().optional(),
});

async function loadPlanContext(): Promise<{
  events: CalendarEvent[];
  contacts: Contact[];
  thirdPartyLinksEnabled: boolean;
  userId?: string;
  source: "demo" | "supabase";
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      events: demoEvents,
      contacts: demoContacts,
      thirdPartyLinksEnabled: demoWorkspace.privacy.thirdPartyLinksEnabled,
      source: "demo",
    };
  }

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return {
      events: demoEvents,
      contacts: demoContacts,
      thirdPartyLinksEnabled: demoWorkspace.privacy.thirdPartyLinksEnabled,
      source: "demo",
    };
  }

  const repository = new SupabaseWorkspaceRepository(supabase);
  const workspace = await repository.getWorkspace(data.user.id);

  return {
    events: workspace.events.length > 0 ? workspace.events : demoEvents,
    contacts: workspace.contacts.length > 0 ? workspace.contacts : demoContacts,
    thirdPartyLinksEnabled: workspace.privacy.thirdPartyLinksEnabled,
    userId: data.user.id,
    source: "supabase",
  };
}

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json());
  const context = await loadPlanContext();
  const now = new Date();

  if (body.scenario === "festival") {
    const event = context.events.find((item) => item.id === body.eventId) ?? context.events[0];
    const contact =
      context.contacts.find((item) => item.id === (body.contactId ?? event.contactId)) ??
      context.contacts[0];

    const plan = generateFestivalPlan(event, contact, body.budgetCny ?? event.budgetCny, now);

    const fulfillmentLinks = context.thirdPartyLinksEnabled
      ? buildPlanFulfillmentLinks(plan, context.userId)
      : [];

    return Response.json({
      plan,
      fulfillmentLinks,
      cpsSummary: summarizeCpsAttribution(fulfillmentLinks),
      source: context.source,
    });
  }

  const plan = generateTravelPlan({
    title: body.title ?? "商务差旅方案",
    startDate: body.startDate ?? "2026-07-08",
    endDate: body.endDate ?? "2026-07-10",
    destination: body.destination ?? "广州",
    dailyLimitCny: body.dailyLimitCny,
    preference: {
      origin: body.origin,
      transportPriority: body.transportPriority,
      hotelStandard: body.hotelStandard,
      mealStandard: body.mealStandard,
      clientAddress: body.clientAddress,
      maxHotelDistanceKm: body.maxHotelDistanceKm,
    },
    now,
  });

  const fulfillmentLinks = context.thirdPartyLinksEnabled
    ? buildPlanFulfillmentLinks(plan, context.userId)
    : [];

  return Response.json({
    plan,
    fulfillmentLinks,
    cpsSummary: summarizeCpsAttribution(fulfillmentLinks),
    source: context.source,
  });
}
