import { buildProductionCheckReport } from "@/lib/liji/production-check";

export async function GET() {
  return Response.json(buildProductionCheckReport());
}
