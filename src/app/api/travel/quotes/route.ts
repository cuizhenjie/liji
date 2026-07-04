import { z } from "zod";
import crypto from "node:crypto";

import { env } from "@/lib/liji/env";
import { createSupabaseServerClient } from "@/lib/liji/supabase-server";
import { mapPrivacy } from "@/lib/liji/supabase-mappers";
import { buildTravelQuotePlan, type TravelQuoteCandidate } from "@/lib/liji/travel-options";

const candidateSchema = z.object({
  id: z.string(),
  category: z.enum(["transport", "hotel"]),
  provider: z.enum(["携程", "同程"]),
  title: z.string(),
  amountCny: z.number().nonnegative(),
  score: z.number(),
  distanceKm: z.number().optional(),
  durationHours: z.number().optional(),
  rationale: z.string(),
  url: z.string().url(),
});

const requestSchema = z.object({
  destination: z.string().default("广州"),
  startDate: z.string().default("2026-07-08"),
  endDate: z.string().optional(),
  dailyLimitCny: z.number().optional(),
  preference: z.object({
    origin: z.string().optional(),
    transportPriority: z.enum(["rail_under_5h", "fastest", "comfort"]).optional(),
    hotelStandard: z.enum(["business", "premium", "budget"]).optional(),
    mealStandard: z.enum(["standard", "business"]).optional(),
    clientAddress: z.string().optional(),
    maxHotelDistanceKm: z.number().positive().optional(),
  }).optional(),
});

const providerResponseSchema = z.object({
  transportCandidates: z.array(candidateSchema).optional(),
  hotelCandidates: z.array(candidateSchema).optional(),
}).passthrough();

async function fetchProviderCandidates(body: z.infer<typeof requestSchema>) {
  if (!env.LIJI_TRAVEL_QUOTE_ENDPOINT) {
    return null;
  }

  const rawBody = JSON.stringify(body);
  const timestamp = new Date().toISOString();
  const response = await fetch(env.LIJI_TRAVEL_QUOTE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-liji-timestamp": timestamp,
      ...(env.LIJI_TRAVEL_QUOTE_SECRET
        ? {
            "x-liji-signature": crypto
              .createHmac("sha256", env.LIJI_TRAVEL_QUOTE_SECRET)
              .update(`${timestamp}.${rawBody}`)
              .digest("hex"),
          }
        : {}),
    },
    body: rawBody,
  });
  if (!response.ok) {
    throw new Error(`travel quote provider failed: ${response.status}`);
  }

  const payload = providerResponseSchema.parse(await response.json());
  return {
    transportCandidates: payload.transportCandidates as TravelQuoteCandidate[] | undefined,
    hotelCandidates: payload.hotelCandidates as TravelQuoteCandidate[] | undefined,
  };
}

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json().catch(() => ({})));
  const supabase = await createSupabaseServerClient();
  let providerAllowed = false;

  if (supabase) {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError) {
      return Response.json({ error: authError.message }, { status: 401 });
    }
    if (data.user) {
      const { data: privacyRow, error: privacyError } = await supabase
        .from("privacy_settings")
        .select("*")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (privacyError) {
        return Response.json({ error: privacyError.message }, { status: 500 });
      }
      providerAllowed = mapPrivacy(privacyRow).thirdPartyLinksEnabled;
    }
  }

  const providerCandidates = providerAllowed
    ? await fetchProviderCandidates(body).catch((error) => ({
        error: error instanceof Error ? error.message : "travel quote provider failed",
      }))
    : null;
  const plan = buildTravelQuotePlan({
    destination: body.destination,
    startDate: body.startDate,
    endDate: body.endDate,
    dailyLimitCny: body.dailyLimitCny,
    preference: body.preference,
    ...("error" in (providerCandidates ?? {}) ? {} : providerCandidates ?? {}),
  });

  return Response.json({
    source: providerCandidates && !("error" in providerCandidates) ? "provider" : "demo",
    providerError: providerCandidates && "error" in providerCandidates ? providerCandidates.error : undefined,
    providerSkipped: providerAllowed ? undefined : "third_party_quote_not_authorized",
    plan,
  });
}
