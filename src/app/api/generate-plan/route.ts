import { z } from "zod";

import { generateFestivalPlan, generateTravelPlan } from "@/lib/liji/budget";
import { demoContacts, demoEvents } from "@/lib/liji/sample-data";

const requestSchema = z.object({
  scenario: z.enum(["festival", "travel"]),
  eventId: z.string().optional(),
  contactId: z.string().optional(),
  title: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  destination: z.string().optional(),
  budgetCny: z.number().optional(),
  dailyLimitCny: z.number().optional(),
});

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json());

  if (body.scenario === "festival") {
    const event = demoEvents.find((item) => item.id === body.eventId) ?? demoEvents[0];
    const contact =
      demoContacts.find((item) => item.id === (body.contactId ?? event.contactId)) ??
      demoContacts[0];

    return Response.json({
      plan: generateFestivalPlan(event, contact, body.budgetCny ?? event.budgetCny),
    });
  }

  return Response.json({
    plan: generateTravelPlan({
      title: body.title ?? "商务差旅方案",
      startDate: body.startDate ?? "2026-07-08",
      endDate: body.endDate ?? "2026-07-10",
      destination: body.destination ?? "广州",
      dailyLimitCny: body.dailyLimitCny,
    }),
  });
}
