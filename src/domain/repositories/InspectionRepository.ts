

import { Inspection } from '../entities/Inspection';
import { QueueItem } from '../entities/SyncState';

export interface InspectionRepository {
  getDraft(propertyId: string): Promise<Inspection | null>;
  saveDraft(propertyId: string, inspection: Inspection): Promise<void>;
  deleteDraft(propertyId: string): Promise<void>;
  
  queueInspection(inspection: Inspection): Promise<void>;
  getQueue(): Promise<QueueItem[]>;
  updateQueueItem(item: QueueItem): Promise<void>;
  removeFromQueue(itemId: string): Promise<void>;
}
