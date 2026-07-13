type BulkSendJobStatus = "pending" | "processing" | "completed" | "failed";

export type BulkSendJob = {
  id: string;
  templateId: string;
  ownerId: string;
  recipients: Array<{ email: string; name?: string }>;
  status: BulkSendJobStatus;
  createdAt: number;
  updatedAt: number;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  results: Array<{ email: string; status: "sent" | "failed"; error?: string }>;
};

const JOBS = new Map<string, BulkSendJob>();

export function getJob(id: string) {
  return JOBS.get(id);
}

export function setJob(job: BulkSendJob) {
  JOBS.set(job.id, job);
}