

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
  address: string | null;
  unitCount: number | null;
  region: PropertyRegion;
  lastInspectedAt: string | null; // ISO 8601 or null
  status: PropertyStatus;
  version: number;
  rooms: PropertyRoom[]; // loaded in detail
}
