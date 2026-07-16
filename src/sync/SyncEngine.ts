

import { QueueItem, SyncStatus } from '../domain/entities/SyncState';
import { Inspection } from '../domain/entities/Inspection';
import { Photo } from '../domain/entities/Photo';
import { inspectionRepository, propertyRepository } from '../app/di';
import { apiClient } from '../data/api/client';
import { InspectionMapper } from '../data/mappers/InspectionMapper';

type SyncListener = (queue: QueueItem[]) => void;
type NetworkListener = (isOnline: boolean) => void;

class SyncEngine {
  private listeners: Set<SyncListener> = new Set();
  private networkListeners: Set<NetworkListener> = new Set();
  private isSyncing = false;
  private syncTimer: any = null;
  private networkOnline = true;

  constructor() {
    // Register online state recovery hook in API client
    apiClient.registerNetworkStateChangeHandler((isOnline) => {
      this.handleNetworkChange(isOnline);
    });

    // Start background polling loop every 15 seconds to flush queue
    this.startBackgroundPoller();
  }

  private handleNetworkChange(isOnline: boolean) {
    const changed = this.networkOnline !== isOnline;
    this.networkOnline = isOnline;
    console.log(`[SyncEngine] Connection status changed: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

    if (changed) {
      this.notifyNetworkListeners(isOnline);
    }

    if (isOnline) {
      this.triggerSync();
    }
  }

  private startBackgroundPoller() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => {
      if (this.networkOnline && !this.isSyncing) {
        this.triggerSync();
      }
    }, 15000);
  }

  public subscribe(listener: SyncListener) {
    this.listeners.add(listener);
    inspectionRepository.getQueue().then(queue => {
      listener(queue);
    });
    return () => this.listeners.delete(listener);
  }

  public subscribeNetwork(listener: NetworkListener) {
    this.networkListeners.add(listener);
    listener(this.networkOnline);
    return () => this.networkListeners.delete(listener);
  }

  private notifyNetworkListeners(isOnline: boolean) {
    this.networkListeners.forEach(listener => {
      try {
        listener(isOnline);
      } catch (e) {
        console.error('[SyncEngine] Network subscriber crashed:', e);
      }
    });
  }

  private async notifyListeners() {
    const queue = await inspectionRepository.getQueue();
    this.listeners.forEach((listener) => {
      try {
        listener(queue);
      } catch (e) {
        console.error('[SyncEngine] Sync subscriber crashed:', e);
      }
    });
  }

  public isEngineSyncing(): boolean {
    return this.isSyncing;
  }

  public isOnline(): boolean {
    return this.networkOnline;
  }

  public setOnlineStatus(online: boolean) {
    const changed = this.networkOnline !== online;
    this.networkOnline = online;

    if (changed) {
      this.notifyNetworkListeners(online);
    }

    if (online) {
      this.triggerSync();
    } else {
      this.notifyListeners();
    }
  }

  /**
   * Queue a completed inspection and its photos
   */
  public async queueInspection(inspection: Inspection): Promise<void> {
    await inspectionRepository.queueInspection(inspection);
    await this.notifyListeners();

    if (this.networkOnline) {
      this.triggerSync();
    }
  }

  /**
   * Force manual retry of a failed queue item
   */
  public async forceRetry(itemId: string): Promise<void> {
    const queue = await inspectionRepository.getQueue();
    const item = queue.find((q) => q.id === itemId);
    if (item) {
      item.status = 'pending';
      item.retryCount = 0;
      delete item.error;
      await inspectionRepository.updateQueueItem(item);
      await this.notifyListeners();

      if (this.networkOnline) {
        this.triggerSync();
      }
    }
  }

  /**
   * Discard item from queue
   */
  public async discardItem(itemId: string): Promise<void> {
    await inspectionRepository.removeFromQueue(itemId);
    await this.notifyListeners();
  }

  /**
   * Resolve a 409 Optimistic Concurrency Conflict
   * action: 'override' (re-submit with current server's propertyVersion) or 'discard'
   */
  public async resolveConflict(itemId: string, action: 'override' | 'discard', serverVersion?: number): Promise<void> {
    const queue = await inspectionRepository.getQueue();
    const item = queue.find((q) => q.id === itemId);
    if (!item || item.type !== 'inspection') return;

    if (action === 'discard') {
      await inspectionRepository.removeFromQueue(itemId);
      await this.notifyListeners();
      return;
    }

    if (action === 'override' && serverVersion !== undefined) {
      const inspection: Inspection = item.payload;
      inspection.propertyVersion = serverVersion;

      item.status = 'pending';
      item.payload = inspection;
      delete item.error;

      await inspectionRepository.updateQueueItem(item);
      await this.notifyListeners();

      if (this.networkOnline) {
        this.triggerSync();
      }
    }
  }

  // --- SYNC ENGINE EVENT LOOP ---

  public async triggerSync(): Promise<void> {
    if (this.isSyncing || !this.networkOnline) return;
    this.isSyncing = true;
    await this.notifyListeners();

    try {
      let active = true;
      while (active && this.networkOnline) {
        active = await this.processNextQueueItem();
      }
    } catch (e) {
      console.error('[SyncEngine] Sync iteration crash:', e);
    } finally {
      this.isSyncing = false;
      await this.notifyListeners();
    }
  }

  private async processNextQueueItem(): Promise<boolean> {
    const queue = await inspectionRepository.getQueue();

    // Process photo dependencies first, then parent inspections
    const photos = queue.filter((q) => q.type === 'photo' && (q.status === 'pending' || q.status === 'failed'));
    const inspections = queue.filter((q) => q.type === 'inspection' && (q.status === 'pending' || q.status === 'failed'));

    const item = photos[0] || inspections[0];
    if (!item) return false;

    item.status = 'syncing';
    await inspectionRepository.updateQueueItem(item);
    await this.notifyListeners();

    try {
      if (item.type === 'photo') {
        await this.syncPhoto(item);
      } else {
        await this.syncInspection(item);
      }
      return true;
    } catch (err: any) {
      console.error(`[SyncEngine] Failed syncing queue item ${item.id}:`, err);

      item.retryCount += 1;

      if (err.status === 409) {
        item.status = 'conflict';
        item.error = 'Optimistic Concurrency: Property version has changed server-side.';
        // Attach current server property data to payload to resolve visual differences
        item.payload.conflictData = err.data;
      } else if (err.status === 422) {
        item.status = 'failed';
        item.error = `Validation Error: ${JSON.stringify(err.data?.errors || err.data?.error || err.data)}`;
      } else if (err.status === 507) {
        item.status = 'failed';
        item.error = 'Photo quota full: Accounts are capped at ~200 photos.';
      } else {
        item.status = 'failed';
        item.error = err.data?.error || err.message || 'Offline connection timed out.';

        // Auto-retry with backoff up to 5 times
        if (item.retryCount < 5) {
          item.status = 'pending';
        }
      }

      await inspectionRepository.updateQueueItem(item);
      await this.notifyListeners();
      return false; // Stop active cycle to prevent hammering on network failure
    }
  }

  private async syncPhoto(item: QueueItem): Promise<void> {
    const photo: Photo & { inspectionId: string } = item.payload;

    const formData = new FormData();
    const fileToUpload = {
      uri: photo.localUri,
      name: `photo_${photo.id}.jpg`,
      type: 'image/jpeg',
    } as any;

    formData.append('file', fileToUpload);

    const response = await apiClient.request('/photos', {
      method: 'POST',
      body: formData,
    });

    console.log(`[SyncEngine] Photo uploaded: ${photo.id} -> serverId: ${response.id}`);

    // Update the parent inspection to link with the server-side photo ID
    const queue = await inspectionRepository.getQueue();
    for (const q of queue) {
      if (q.type === 'inspection' && q.id === photo.inspectionId) {
        const inspection: Inspection = q.payload;
        inspection.rooms.forEach((room) => {
          room.localPhotos.forEach((p) => {
            if (p.id === photo.id) {
              p.status = 'synced';
              p.remoteId = response.id;
              if (!room.photoIds.includes(response.id)) {
                room.photoIds.push(response.id);
              }
            }
          });
        });
        await inspectionRepository.updateQueueItem(q);
      }
    }

    // Remove photo item from queue now that it is successfully synced
    await inspectionRepository.removeFromQueue(item.id);
  }

  private async syncInspection(item: QueueItem): Promise<void> {
    const inspection: Inspection = item.payload;

    // Verify all dependent photo uploads have completed
    const pendingPhotos: string[] = [];
    inspection.rooms.forEach((room) => {
      room.localPhotos.forEach((p) => {
        if (p.status !== 'synced') {
          pendingPhotos.push(p.id);
        }
      });
    });

    if (pendingPhotos.length > 0) {
      console.warn(`[SyncEngine] Aborting parent sync. Photos are still pending: ${pendingPhotos.join(', ')}`);
      item.status = 'failed';
      item.error = 'Inspection is waiting for photo uploads to complete.';
      await inspectionRepository.updateQueueItem(item);
      return;
    }

    const payload = InspectionMapper.toServerPayload(inspection);

    // Attach client-generated idempotent key as Header
    const headers = new Headers();
    headers.set('Idempotency-Key', inspection.idempotencyKey);

    const response = await apiClient.request('/inspections', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    console.log(`[SyncEngine] Inspection fully synchronized with server: ${response.id}`);

    // Update local cached property version and inspection timestamp
    const localProp = await propertyRepository.getCachedProperties().then((props) => props.find((p) => p.id === inspection.propertyId));
    if (localProp) {
      localProp.lastInspectedAt = new Date().toISOString();
      localProp.version += 1;
      await propertyRepository.updateCachedProperty(localProp);
    }

    // Clean up temporary active drafts
    await inspectionRepository.deleteDraft(inspection.propertyId);

    // Remove successfully completed item from queue
    await inspectionRepository.removeFromQueue(item.id);
  }
}

export const syncEngine = new SyncEngine();
export default syncEngine;
