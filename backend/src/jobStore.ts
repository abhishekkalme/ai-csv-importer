export type JobPhase = 'mapping' | 'extracting' | 'complete' | 'error';

export interface Job {
  jobId: string;
  phase: JobPhase;
  progress: number;
  message: string;
  result?: {
    records: Record<string, string>[];
    skipped: { original_data: Record<string, string>; reason: string }[];
    totalImported: number;
    totalSkipped: number;
    skipSummary: { reason: string; count: number }[];
  };
  error?: string;
}

const jobs = new Map<string, Job>();

let nextJobId = 1;

export const jobStore = {
  create(): string {
    const jobId = `job_${nextJobId++}_${Date.now()}`;
    jobs.set(jobId, { jobId, phase: 'mapping', progress: 0, message: 'Starting...' });
    return jobId;
  },

  update(jobId: string, update: Partial<Job>) {
    const job = jobs.get(jobId);
    if (job) Object.assign(job, update);
  },

  get(jobId: string): Job | undefined {
    return jobs.get(jobId);
  },

  cleanup(jobId: string) {
    jobs.delete(jobId);
  },
};
