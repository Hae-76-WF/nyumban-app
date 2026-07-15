

// --- DOMAIN ENTITIES ---

export interface Agent {
  id: string;
  displayName: string;
  assignedRegion: string;
}

export type PropertyRegion = 'central' | 'eastern' | 'western' | 'northern';
export type PropertyStatus = 'active' | 'inactive' | 'under_renovation';

export interface PropertyRoom {
  id: string;
  label: string;
  floor: number;
}

export interface Property {
  id: string;
  name: string;
  address: string; // normalized
  unitCount: number; // normalized
  region: PropertyRegion;
  lastInspectedAt: string | null; // ISO 8601 or null
  status: PropertyStatus;
  version: number;
  rooms: PropertyRoom[]; // fetched in detail
}

export interface RoomInspection {
  roomId: string;
  condition: string;
  notes: string;
  photoIds: string[]; // server photo IDs (pht_...)
  localPhotos: LocalPhoto[]; // rich tracking for presentation and sync
}

export type InspectionType = 'routine' | 'move_in' | 'move_out' | 'emergency';

export interface Inspection {
  id: string; // client-generated UUID (sync id) or server ID
  propertyId: string;
  propertyVersion: number;
  type: InspectionType;
  rooms: RoomInspection[];
  completedAt: number; // unix epoch seconds
  created?: number; // unix epoch seconds (server response)
  updatedAt?: number; // unix epoch milliseconds (server response)
  idempotencyKey: string; // client-generated unique key
}

export interface LocalPhoto {
  id: string; // client UUID
  localUri: string; // file path or base64 blob
  remoteId: string | null; // pht_... once synced
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  error?: string;
}

// --- SYNC ENGINE TYPES ---

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';

export interface QueueItem {
  id: string; // client UUID
  type: 'photo' | 'inspection';
  status: SyncStatus;
  payload: any; // LocalPhoto or Inspection
  error?: string;
  retryCount: number;
  lastAttemptAt?: number;
  nextAttemptAt?: number;
}

// --- WIRE FORMATS (DTOs) ---

export interface LoginResponseDTO {
  access_token: string;
  refreshToken: string;
  expires_in: number;
  agent: {
    id: string;
    display_name: string;
    assignedRegion: string;
  };
}

export interface PropertyDTO {
  id: string;
  name: string;
  address: string | null;
  unit_count: number | null;
  region: string;
  last_inspected_at: string | null;
  status: string;
  version: number;
  rooms?: {
    id: string;
    label: string;
    floor: number;
  }[];
}

export interface InspectionResponseDTO {
  id: string;
  created: number; // seconds
  updated_at: number; // ms
}

export interface PhotoResponseDTO {
  id: string;
  url: string;
}
