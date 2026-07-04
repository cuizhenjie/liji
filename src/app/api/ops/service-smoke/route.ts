import { z } from "zod";

import { demoWorkspace } from "@/lib/liji/sample-data";
import { runServiceSmokeSuite } from "@/lib/liji/service-smoke";

const requestSchema = z.object({
  iterations: z.number().int().min(1).max(20).default(3),
});

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json().catch(() => ({})));
  return Response.json(runServiceSmokeSuite({
    data: demoWorkspace,
    iterations: body.iterations,
  }));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const iterations = Number(url.searchParams.get("iterations") ?? 3);
  const body = requestSchema.parse({
    iterations: Number.isFinite(iterations) ? iterations : 3,
  });

  return Response.json(runServiceSmokeSuite({
    data: demoWorkspace,
    iterations: body.iterations,
  }));
}
