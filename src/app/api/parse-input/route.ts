import { demoContacts } from "@/lib/liji/sample-data";
import { parseNaturalLanguageInput } from "@/lib/liji/parser";

const bodySchema = {
  async parse(request: Request) {
    const body = await request.json().catch(() => ({}));
    return {
      text: typeof body.text === "string" ? body.text : "",
    };
  },
};

export async function POST(request: Request) {
  const body = await bodySchema.parse(request);

  if (!body.text.trim()) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }

  return Response.json({
    capture: parseNaturalLanguageInput(body.text, demoContacts),
  });
}
