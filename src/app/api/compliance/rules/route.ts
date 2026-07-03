import { deriveComplianceProfile, defaultComplianceRules } from "@/lib/liji/compliance";
import { createSupabaseServerClient } from "@/lib/liji/supabase-server";

function mapRule(row: Record<string, unknown>) {
  const riskTags = row.risk_tags;
  return {
    label: typeof row.label === "string" ? row.label : "未命名规则",
    riskTags: Array.isArray(riskTags) ? riskTags.filter((item): item is string => typeof item === "string") : [],
    giftLimitCny:
      typeof row.gift_limit_cny === "number"
        ? row.gift_limit_cny
        : typeof row.gift_limit_cny === "string"
          ? Number(row.gift_limit_cny)
          : undefined,
    hospitalityLimitCny:
      typeof row.hospitality_limit_cny === "number"
        ? row.hospitality_limit_cny
        : typeof row.hospitality_limit_cny === "string"
          ? Number(row.hospitality_limit_cny)
          : undefined,
    policyNote: typeof row.policy_note === "string" ? row.policy_note : "",
  };
}

function labelsFromRequest(request: Request) {
  const url = new URL(request.url);
  return url.searchParams
    .getAll("label")
    .flatMap((label) => label.split(","))
    .map((label) => label.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const labels = labelsFromRequest(request);
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: rows, error } = await supabase
        .from("compliance_rules")
        .select("*")
        .or(`is_system.eq.true,user_id.eq.${data.user.id}`);
      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }

      const rules = (rows ?? []).map((row) => mapRule(row as Record<string, unknown>));
      return Response.json({
        source: "supabase",
        rules,
        profile: deriveComplianceProfile(labels, rules),
      });
    }
  }

  return Response.json({
    source: "demo",
    rules: defaultComplianceRules,
    profile: deriveComplianceProfile(labels, defaultComplianceRules),
  });
}
