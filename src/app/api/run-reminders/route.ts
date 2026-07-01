import { runReminderScan } from "@/lib/liji/reminders";
import { demoEvents } from "@/lib/liji/sample-data";

export async function GET() {
  return Response.json({
    logs: runReminderScan(demoEvents),
  });
}

export async function POST() {
  return Response.json({
    logs: runReminderScan(demoEvents),
  });
}
