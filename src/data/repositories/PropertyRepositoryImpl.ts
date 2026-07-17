

import { PropertyRepository } from '../../domain/repositories/PropertyRepository';
import { Property } from '../../domain/entities/Property';
import { apiClient } from '../api/client';
import { localDB } from '../local/storage';
import { PropertyMapper } from '../mappers/PropertyMapper';

export class PropertyRepositoryImpl implements PropertyRepository {
  async getProperties(
    q?: string,
    region?: string,
    status?: string,
    cursor?: string
  ): Promise<{ data: Property[]; nextCursor: string | null }> {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (region) params.append('region', region);
    if (status) params.append('status', status);
    if (cursor) params.append('cursor', cursor);
    params.append('limit', '25'); // default pagination size

    const path = `/properties?${params.toString()}`;
    const response = await apiClient.request(path);

    const data = (response.data || []).map((p: any) => PropertyMapper.toDomain(p));
    return {
      data,
      nextCursor: response.next_cursor || null,
    };
  }

  async getPropertyDetail(id: string): Promise<Property> {
    const response = await apiClient.request(`/properties/${id}`);
    const domainProp = PropertyMapper.toDomain(response);
    await this.updateCachedProperty(domainProp);
    return domainProp;
  }

  async getCachedProperties(): Promise<Property[]> {
    return localDB.getCachedProperties();
  }

  async saveCachedProperties(properties: Property[]): Promise<void> {
    await localDB.saveCachedProperties(properties);
  }

  async updateCachedProperty(property: Property): Promise<void> {
    await localDB.updateCachedProperty(property);
  }

  async getRecentlyViewed(): Promise<Property[]> {
    const ids = localDB.getRecentlyViewedIds();
    const cached = localDB.getCachedProperties();
    return ids.map(id => cached.find(p => p.id === id)).filter((p): p is Property => !!p);
  }

  async markAsRecentlyViewed(id: string): Promise<void> {
    await localDB.addRecentlyViewed(id);
  }
}
