

import { Property } from '../entities/Property';
import { PropertyRepository } from '../repositories/PropertyRepository';

export class GetPropertiesUseCase {
  constructor(private propertyRepo: PropertyRepository) {}

  async execute(
    q?: string,
    region?: string,
    status?: string,
    cursor?: string,
    isOffline?: boolean
  ): Promise<{ data: Property[]; nextCursor: string | null }> {
    if (isOffline) {
      const cached = await this.propertyRepo.getCachedProperties();
      // Apply offline local filters
      const filtered = cached.filter((p) => {
        const matchesQuery = q
          ? p.name.toLowerCase().includes(q.toLowerCase()) || p.address.toLowerCase().includes(q.toLowerCase())
          : true;
        const matchesRegion = region ? p.region === region : true;
        const matchesStatus = status ? p.status === status : true;
        return matchesQuery && matchesRegion && matchesStatus;
      });
      return { data: filtered, nextCursor: null };
    }

    try {
      const response = await this.propertyRepo.getProperties(q, region, status, cursor);
      // Save newly fetched pages in cache
      await this.propertyRepo.saveCachedProperties(response.data);
      return response;
    } catch (err) {
      // Fallback to cache if network call fails
      const cached = await this.propertyRepo.getCachedProperties();
      const filtered = cached.filter((p) => {
        const matchesQuery = q
          ? p.name.toLowerCase().includes(q.toLowerCase()) || p.address.toLowerCase().includes(q.toLowerCase())
          : true;
        const matchesRegion = region ? p.region === region : true;
        const matchesStatus = status ? p.status === status : true;
        return matchesQuery && matchesRegion && matchesStatus;
      });
      return { data: filtered, nextCursor: null };
    }
  }
}
