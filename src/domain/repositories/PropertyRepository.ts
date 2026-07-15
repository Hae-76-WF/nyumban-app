

import { Property } from '../entities/Property';

export interface PropertyRepository {
  getProperties(
    q?: string,
    region?: string,
    status?: string,
    cursor?: string
  ): Promise<{ data: Property[]; nextCursor: string | null }>;
  
  getPropertyDetail(id: string): Promise<Property>;
  
  getCachedProperties(): Promise<Property[]>;
  saveCachedProperties(properties: Property[]): Promise<void>;
  updateCachedProperty(property: Property): Promise<void>;
}
