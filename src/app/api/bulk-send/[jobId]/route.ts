import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { requireApiUser } from "@/lib/auth/route";
import { isUuid } from "@/lib/validation";
import { getJob } from "@/lib/bulk-send/jobs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const { jobId } = await params;
  if (!isUuid(jobId)) {
    return apiError("invalid_request", "Invalid job id.", "jobId");
  }

  const job = getJob(jobId);
  if (!job || job.ownerId !== auth.user.id) {
    return apiError("not_found", "Job not found.", null);
  }

  return NextResponse.json({
    job: {
      ...job,
      createdAt: new Date(job.createdAt).toISOString(),
      updatedAt: new Date(job.updatedAt).toISOString(),
    },
  });
}
