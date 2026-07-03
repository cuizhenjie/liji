import { z } from "zod";

import { manualCaptureCompletionResult } from "@/lib/liji/capture-ops";
import {
  captureJobUpdatePayload,
  loadContactsForCaptureJob,
  mapCaptureExtractionJobRow,
  upsertCaptureFromExtractedText,
} from "@/lib/liji/capture-jobs";
import { parseInputWithProvider } from "@/lib/liji/ai";
import { demoWorkspace } from "@/lib/liji/sample-data";
import { createSupabaseServerClient } from "@/lib/liji/supabase-server";

const requestSchema = z.object({
  jobId: z.string().min(1),
  extractedText: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json());
  const supabase = await createSupabaseServerClient();
  const now = new Date();

  if (!supabase) {
    const parsed = await parseInputWithProvider({
      text: body.extractedText,
      contacts: demoWorkspace.contacts,
      source: "text",
      allowCloudModel: false,
      now,
    });

    return Response.json({
      source: "demo",
      persisted: false,
      resolvedAlerts: 0,
      capture: parsed.capture,
      job: {
        id: body.jobId,
        status: "completed",
      },
    });
  }

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }

  const { data: row, error } = await supabase
    .from("capture_extraction_jobs")
    .select("*")
    .eq("user_id", auth.user.id)
    .eq("id", body.jobId)
    .maybeSingle();
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const job = row ? mapCaptureExtractionJobRow(row as Record<string, unknown>) : null;
  if (!job) {
    return Response.json({ error: "capture job not found" }, { status: 404 });
  }

  if (job.status === "completed" || job.status === "cancelled") {
    return Response.json({
      source: "supabase",
      persisted: false,
      resolvedAlerts: 0,
      status: "ignored_terminal",
      jobStatus: job.status,
    });
  }

  const contacts = await loadContactsForCaptureJob(supabase, auth.user.id);
  const result = manualCaptureCompletionResult({
    job,
    extractedText: body.extractedText,
    now,
  });
  const capture = await upsertCaptureFromExtractedText({
    client: supabase,
    job,
    contacts,
    extractedText: result.extractedText,
  });

  const { error: updateError } = await supabase
    .from("capture_extraction_jobs")
    .update(captureJobUpdatePayload({
      job,
      result,
      captureId: capture.id,
      attemptCount: job.attemptCount,
      callbackReceivedAt: now.toISOString(),
      now,
    }))
    .eq("user_id", auth.user.id)
    .eq("id", job.id);
  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  const { data: alerts, error: alertError } = await supabase
    .from("ops_alerts")
    .update({
      status: "resolved",
      resolved_at: now.toISOString(),
    })
    .eq("user_id", auth.user.id)
    .eq("entity_table", "capture_extraction_jobs")
    .eq("entity_id", job.id)
    .in("source", ["capture_extraction", "capture_sla"])
    .eq("status", "open")
    .select("id");
  if (alertError) {
    return Response.json({ error: alertError.message }, { status: 500 });
  }

  return Response.json({
    source: "supabase",
    persisted: true,
    resolvedAlerts: alerts?.length ?? 0,
    capture,
    job: {
      id: job.id,
      status: "completed",
    },
  });
}
