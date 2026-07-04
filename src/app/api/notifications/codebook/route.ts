import {
  createNotificationGovernanceDecision,
  getNotificationFailureCodebook,
  lookupNotificationFailureCode,
} from "@/lib/liji/notification-governance";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sample = url.searchParams.get("sample") ?? "";
  const matched = sample ? lookupNotificationFailureCode(sample) : undefined;
  const decision = sample
    ? createNotificationGovernanceDecision({
        log: {
          channel: "sms",
          providerStatus: "failed",
          providerMessage: sample,
        },
      })
    : undefined;

  return Response.json({
    codebook: getNotificationFailureCodebook(),
    matched,
    decision,
  });
}
