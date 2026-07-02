import { getIntegrationStatuses } from "@/lib/liji/integrations";

export async function GET() {
  return Response.json({
    integrations: getIntegrationStatuses(),
  });
}
