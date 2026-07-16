

import { InspectionRepository } from '../../domain/repositories/InspectionRepository';
import { Inspection } from '../../domain/entities/Inspection';
import { QueueItem } from '../../domain/entities/SyncState';
import { localDB } from '../local/storage';

export class InspectionRepositoryImpl implements InspectionRepository {
  async getDraft(propertyId: string): Promise<Inspection | null> {
    const draft = localDB.getDraftInspection(propertyId);
    return draft as any;
  }

  async saveDraft(propertyId: string, inspection: Inspection): Promise<void> {
    await localDB.saveDraftInspection(propertyId, inspection as any);
  }

  async deleteDraft(propertyId: string): Promise<void> {
    await localDB.deleteDraftInspection(propertyId);
  }

  async queueInspection(inspection: Inspection): Promise<void> {
    // 1. Queue all pending photos first
    for (const room of inspection.rooms) {
      for (const photo of room.localPhotos) {
        if (photo.status !== 'synced') {
          const photoItem: QueueItem = {
            id: photo.id,
            type: 'photo',
            status: photo.status as any,
            payload: { ...photo, inspectionId: inspection.id },
            retryCount: 0,
          };
          await localDB.addToQueue(photoItem as any);
        }
      }
    }

    // 2. Queue the inspection itself
    const inspectionItem: QueueItem = {
      id: inspection.id,
      type: 'inspection',
      status: 'pending',
      payload: inspection as any,
      retryCount: 0,
    };
    await localDB.addToQueue(inspectionItem as any);
  }

  async getQueue(): Promise<QueueItem[]> {
    const queue = localDB.getQueue();
    return queue as any;
  }

  async updateQueueItem(item: QueueItem): Promise<void> {
    await localDB.updateQueueItem(item as any);
  }

  async removeFromQueue(itemId: string): Promise<void> {
    await localDB.removeFromQueue(itemId);
  }
}
