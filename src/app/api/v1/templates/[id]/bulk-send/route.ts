import { NextRequest, NextResponse } from "next/server";
import { apiError, internalApiError } from "@/lib/api/errors";
import { requireApiUser } from "@/lib/auth/route";
import { getTemplateById } from "@/lib/templates/db";
import { createEnvelopeFromTemplate, sendEnvelope } from "@/lib/envelopes/workflow";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validation";
import { setJob, getJob, type BulkSendJob } from "@/lib/bulk-send/jobs";

type BulkSendJobStatus = "pending" | "processing" | "completed" | "failed";

type Recipient = { email: string; name?: string };

function makeJob(
  templateId: string,
  ownerId: string,
  normalizedRecipients: Recipient[],
): BulkSendJob {
  const job: BulkSendJob = {
    id: crypto.randomUUID(),
    templateId,
    ownerId,
    recipients: normalizedRecipients,
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    total: normalizedRecipients.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
    results: [],
  };

  setJob(job);
  return job;
}

function summarizeJob(job: BulkSendJob) {
  return {
    jobId: job.id,
    status: job.status,
    total: job.total,
    processed: job.processed,
    succeeded: job.succeeded,
    failed: job.failed,
    results: job.results,
    updatedAt: new Date(job.updatedAt).toISOString(),
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) {
    return apiError("invalid_request", "Invalid template id.", "id");
  }

  const rateKey = `bulk-send:${auth.user.id}:${getClientIp(request.headers)}`;
  const rateLimit = consumeRateLimit(rateKey, { limit: 5, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) {
    const retryAfterSeconds = Math.ceil((rateLimit.retryAfterMs || 0) / 1000);
    return NextResponse.json(
      { error: { code: "rate_limited", message: `Too many bulk-send requests. Try again in ${retryAfterSeconds}s.` } },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_request", "Expected a JSON body.", null);
  }

  const { recipients } = (body as { recipients?: unknown } || {}) as { recipients?: unknown };
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return apiError("invalid_request", "recipients must be a non-empty array.", "recipients");
  }
  if (recipients.length > 200) {
    return apiError("invalid_request", "Maximum 200 recipients per bulk-send.", "recipients");
  }

  const normalizedRecipients: Recipient[] = [];
  for (const item of recipients) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const email = typeof record.email === "string" ? record.email.trim() : "";
    const name = typeof record.name === "string" ? record.name.trim() : undefined;
    if (!email) continue;
    normalizedRecipients.push({ email, name });
  }

  if (normalizedRecipients.length === 0) {
    return apiError("invalid_request", "No valid recipient emails provided.", "recipients");
  }

  try {
    const template = await getTemplateById(id, auth.user.id);
    if (!template) {
      return apiError("not_found", "This template does not exist.", null);
    }

    const job = makeJob(id, auth.user.id, normalizedRecipients);

    processBulkSendJob(job.id).catch(() => {
      const current = getJob(job.id);
      if (current && current.status !== "completed") {
        current.status = "failed";
        current.updatedAt = Date.now();
        setJob(current);
      }
    });

    return NextResponse.json(summarizeJob(job), { status: 202 });
  } catch (err) {
    return internalApiError(err);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) {
    return apiError("invalid_request", "Invalid template id.", "id");
  }

  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId || !isUuid(jobId)) {
    return apiError("invalid_request", "jobId query param is required.", "jobId");
  }

  const job = getJob(jobId);
  if (!job || job.templateId !== id || job.ownerId !== auth.user.id) {
    return apiError("not_found", "Job not found.", null);
  }

  return NextResponse.json(summarizeJob(job));
}

// ponytail: jobs live in an in-memory Map (bulk-send/jobs.ts). Ceiling: state is lost
// on server restart and not shared across instances. Fine for a single-node internal
// deployment; upgrade path is a `bulk_send_jobs` table if this ever runs serverless.
async function processBulkSendJob(jobId: string) {
  const job = getJob(jobId);
  if (!job) return;

  job.status = "processing";
  job.updatedAt = Date.now();
  setJob(job);

  const template = await getTemplateById(job.templateId, job.ownerId);
  const documentName = template?.name ?? "your document";
  const roles = Array.from(
    new Set((template?.field_layout ?? []).map((field) => field.assigned_role).filter(Boolean)),
  );

  for (const recipient of job.recipients) {
    try {
      // Bulk send fans one template out to many single-party recipients. Multi-role
      // templates can't be expressed as a single recipient, so reject them clearly.
      if (roles.length > 1) {
        throw new Error("Bulk send supports single-signer templates only.");
      }
      const assignedRole = roles[0] ?? "Signer 1";

      const details = await createEnvelopeFromTemplate({
        templateId: job.templateId,
        title: `${documentName} — ${recipient.name || recipient.email}`,
        signingOrder: "parallel",
        signers: [
          {
            name: recipient.name || recipient.email,
            email: recipient.email,
            assignedRole,
            orderIndex: 1,
          },
        ],
        ownerId: job.ownerId,
      });
      if (!details?.id) {
        throw new Error("Envelope creation returned no details.");
      }

      // sendEnvelope also fires the invitation email to each signer, so no extra send here.
      const links = await sendEnvelope(details.id, job.ownerId);
      if (!links || links.length === 0) {
        throw new Error("Send envelope returned no signer links.");
      }

      job.results = [...job.results, { email: recipient.email, status: "sent" as const }];
      job.succeeded += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      job.results = [...job.results, { email: recipient.email, status: "failed" as const, error: message }];
      job.failed += 1;
    } finally {
      job.processed += 1;
      job.updatedAt = Date.now();
      setJob(job);
    }
  }

  job.status = job.failed > 0 && job.succeeded === 0 ? "failed" : "completed";
  job.updatedAt = Date.now();
  setJob(job);
}