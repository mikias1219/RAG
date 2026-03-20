export interface QueueJob {
  id: string;
  type: string;
  tenantId: string;
  workspaceId?: string;
  payload: Record<string, unknown>;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  error?: string;
  createdAt: Date;
  processedAt?: Date;
}

export interface QueueService {
  enqueue(job: Omit<QueueJob, 'id' | 'status' | 'attempts' | 'createdAt'>): Promise<QueueJob>;
  dequeue(type: string): Promise<QueueJob | null>;
  updateStatus(jobId: string, status: QueueJob['status'], error?: string): Promise<void>;
  getJob(jobId: string): Promise<QueueJob | null>;
}

export class InMemoryQueueService implements QueueService {
  private jobs: Map<string, QueueJob> = new Map();
  private jobsByType: Map<string, string[]> = new Map();

  async enqueue(job: Omit<QueueJob, 'id' | 'status' | 'attempts' | 'createdAt'>): Promise<QueueJob> {
    const id = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const queueJob: QueueJob = {
      ...job,
      id,
      status: 'queued',
      attempts: 0,
      createdAt: new Date()
    };
    this.jobs.set(id, queueJob);

    if (!this.jobsByType.has(job.type)) {
      this.jobsByType.set(job.type, []);
    }
    this.jobsByType.get(job.type)!.push(id);

    return queueJob;
  }

  async dequeue(type: string): Promise<QueueJob | null> {
    const jobIds = this.jobsByType.get(type) || [];
    if (jobIds.length === 0) return null;

    const jobId = jobIds.shift()!;
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'processing';
      job.attempts += 1;
    }
    return job || null;
  }

  async updateStatus(jobId: string, status: QueueJob['status'], error?: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      job.processedAt = new Date();
      if (error) {
        job.error = error;
      }
    }
  }

  async getJob(jobId: string): Promise<QueueJob | null> {
    return this.jobs.get(jobId) || null;
  }
}
