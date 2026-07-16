export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';

export interface QueueItem {
  id: string; // client UUID
  type: 'photo' | 'inspection';
  status: SyncStatus;
  payload: any; // Photo or Inspection DTO
  error?: string;
  retryCount: number;
  lastAttemptAt?: number;
}
