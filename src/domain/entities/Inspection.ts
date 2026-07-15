

import { Photo } from './Photo';

export interface RoomInspection {
  roomId: string;
  condition: string;
  notes: string;
  photoIds: string[]; // Remote server photo IDs (pht_...)
  localPhotos: Photo[]; // Local tracking list
}

export type InspectionType = 'routine' | 'move_in' | 'move_out' | 'emergency';

export interface Inspection {
  id: string; // Client UUID
  propertyId: string;
  propertyVersion: number;
  type: InspectionType;
  rooms: RoomInspection[];
  completedAt: number; // Unix seconds
  idempotencyKey: string;
}
