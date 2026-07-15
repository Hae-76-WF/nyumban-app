

import { Property, PropertyRoom, PropertyRegion, PropertyStatus } from '../../domain/entities/Property';
import { PropertyDTO } from '../api/dto';

export class PropertyMapper {
  static toDomain(dto: PropertyDTO): Property {
    const address = dto.address || 'Unknown Address';
    const unitCount = typeof dto.unit_count === 'number' ? dto.unit_count : 0;
    const region = (dto.region || 'central') as PropertyRegion;
    const status = (dto.status || 'active') as PropertyStatus;

    const rooms: PropertyRoom[] = [];
    if (dto.rooms && Array.isArray(dto.rooms)) {
      dto.rooms.forEach((r) => {
        rooms.push({
          id: r.id,
          label: r.label || `Room ${r.id}`,
          floor: typeof r.floor === 'number' ? r.floor : 0,
        });
      });
    }

    return {
      id: dto.id,
      name: dto.name || 'Unnamed Property',
      address,
      unitCount,
      region,
      lastInspectedAt: dto.last_inspected_at,
      status,
      version: dto.version || 0,
      rooms,
    };
  }
}
