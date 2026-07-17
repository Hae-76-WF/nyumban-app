

import { Property, PropertyRoom, PropertyRegion, PropertyStatus } from '../../domain/entities/Property';
import { PropertyDTO } from '../api/dto';

export class PropertyMapper {
  static toDomain(dto: PropertyDTO): Property {
    const address = dto.address;
    const unitCount = dto.unit_count;
    const region = (dto.region || 'central') as PropertyRegion;
    const status = (dto.status || 'active') as PropertyStatus;

    const rooms: PropertyRoom[] = [];
    if (dto.rooms && Array.isArray(dto.rooms)) {
      dto.rooms.forEach((r) => {
        rooms.push({
          id: r.id,
          label: r.label,
          floor: r.floor,
        });
      });
    }

    return {
      id: dto.id,
      name: dto.name,
      address,
      unitCount,
      region,
      lastInspectedAt: dto.last_inspected_at,
      status,
      version: dto.version,
      rooms,
    };
  }
}
