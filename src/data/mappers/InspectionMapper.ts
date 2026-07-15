

import { Inspection } from '../../domain/entities/Inspection';

export class InspectionMapper {
  static toServerPayload(domain: Inspection) {
    return {
      propertyId: domain.propertyId,
      propertyVersion: domain.propertyVersion,
      type: domain.type,
      rooms: domain.rooms.map((room) => ({
        roomId: room.roomId,
        condition: room.condition,
        notes: room.notes,
        photoIds: room.photoIds,
      })),
      completedAt: domain.completedAt,
    };
  }
}
