import AsyncStorage from '@react-native-async-storage/async-storage';
import { Property, QueueItem, Inspection, Agent } from '../../types';

class LocalStorageDB {
  private PREFIX = 'nyumban_db_';
  private properties: Property[] = [];
  private syncQueue: QueueItem[] = [];
  private agent: Agent | null = null;
  private drafts: Map<string, Inspection> = new Map();
  private recentlyViewedIds: string[] = [];
  private isInitialized = false;

  private getKey(name: string): string {
    return `${this.PREFIX}${name}`;
  }

  /**
   * Pre-load all database indexes into fast in-memory cache on startup
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    try {
      const [propsData, queueData, agentData, recentData] = await Promise.all([
        AsyncStorage.getItem(this.getKey('properties')),
        AsyncStorage.getItem(this.getKey('sync_queue')),
        AsyncStorage.getItem(this.getKey('agent_profile')),
        AsyncStorage.getItem(this.getKey('recently_viewed'))
      ]);

      if (propsData) this.properties = JSON.parse(propsData);
      if (queueData) this.syncQueue = JSON.parse(queueData);
      if (agentData) this.agent = JSON.parse(agentData);
      if (recentData) this.recentlyViewedIds = JSON.parse(recentData);

      // Load any existing draft keys
      const keys = await AsyncStorage.getAllKeys();
      const draftKeys = keys.filter(k => k.startsWith(this.getKey('draft_')));
      if (draftKeys.length > 0) {
        const draftsData = await AsyncStorage.multiGet(draftKeys);
        draftsData.forEach(([key, val]) => {
          if (val) {
            const propId = key.replace(this.getKey('draft_'), '');
            this.drafts.set(propId, JSON.parse(val));
          }
        });
      }

      this.isInitialized = true;
      console.log('[Storage] React Native Offline Database initialized.');
    } catch (e) {
      console.error('[Storage] Failed to initialize React Native AsyncStorage DB', e);
    }
  }

  // --- PROPERTIES CACHE ---
  public getCachedProperties(): Property[] {
    return this.properties;
  }

  public async saveCachedProperties(properties: Property[]): Promise<void> {
    const map = new Map<string, Property>();
    this.properties.forEach(p => map.set(p.id, p));
    properties.forEach(p => map.set(p.id, p));
    this.properties = Array.from(map.values());
    await AsyncStorage.setItem(this.getKey('properties'), JSON.stringify(this.properties));
  }

  public getCachedProperty(id: string): Property | null {
    return this.properties.find(p => p.id === id) || null;
  }

  public async updateCachedProperty(property: Property): Promise<void> {
    const index = this.properties.findIndex(p => p.id === property.id);
    if (index >= 0) {
      this.properties[index] = property;
    } else {
      this.properties.push(property);
    }
    await AsyncStorage.setItem(this.getKey('properties'), JSON.stringify(this.properties));
  }

  // --- RECENTLY VIEWED ---
  public getRecentlyViewedIds(): string[] {
    return this.recentlyViewedIds;
  }

  public async addRecentlyViewed(id: string): Promise<void> {
    this.recentlyViewedIds = [id, ...this.recentlyViewedIds.filter(i => i !== id)].slice(0, 10);
    await AsyncStorage.setItem(this.getKey('recently_viewed'), JSON.stringify(this.recentlyViewedIds));
  }

  // --- ACTIVE INSPECTION DRAFT ---
  public getDraftInspection(propertyId: string): Inspection | null {
    return this.drafts.get(propertyId) || null;
  }

  public async saveDraftInspection(propertyId: string, inspection: Inspection): Promise<void> {
    this.drafts.set(propertyId, inspection);
    await AsyncStorage.setItem(this.getKey(`draft_${propertyId}`), JSON.stringify(inspection));
  }

  public async deleteDraftInspection(propertyId: string): Promise<void> {
    this.drafts.delete(propertyId);
    await AsyncStorage.removeItem(this.getKey(`draft_${propertyId}`));
  }

  // --- SYNC QUEUE ---
  public getQueue(): QueueItem[] {
    return this.syncQueue;
  }

  public async saveQueue(queue: QueueItem[]): Promise<void> {
    this.syncQueue = queue;
    await AsyncStorage.setItem(this.getKey('sync_queue'), JSON.stringify(queue));
  }

  public async addToQueue(item: QueueItem): Promise<void> {
    if (!this.syncQueue.some(q => q.id === item.id)) {
      this.syncQueue.push(item);
      await this.saveQueue(this.syncQueue);
    }
  }

  public async updateQueueItem(item: QueueItem): Promise<void> {
    const index = this.syncQueue.findIndex(q => q.id === item.id);
    if (index >= 0) {
      this.syncQueue[index] = item;
      await this.saveQueue(this.syncQueue);
    }
  }

  public async removeFromQueue(id: string): Promise<void> {
    const filtered = this.syncQueue.filter(q => q.id !== id);
    await this.saveQueue(filtered);
  }

  // --- ACTIVE AGENT SESSION ---
  public getAgent(): Agent | null {
    return this.agent;
  }

  public async saveAgent(agent: Agent): Promise<void> {
    this.agent = agent;
    await AsyncStorage.setItem(this.getKey('agent_profile'), JSON.stringify(agent));
  }

  public async clearAgent(): Promise<void> {
    this.agent = null;
    await AsyncStorage.removeItem(this.getKey('agent_profile'));
  }

  public async clearAll(): Promise<void> {
    this.properties = [];
    this.syncQueue = [];
    this.agent = null;
    this.drafts.clear();
    const keys = await AsyncStorage.getAllKeys();
    const dbKeys = keys.filter(k => k.startsWith(this.PREFIX));
    await AsyncStorage.multiRemove(dbKeys);
  }
}

export const localDB = new LocalStorageDB();
export default localDB;
