export interface AgentDTO {
  id: string;
  display_name: string;
  assignedRegion: string;
}

export interface LoginResponseDTO {
  access_token: string;
  refreshToken: string;
  expires_in: number;
  agent: AgentDTO;
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
  created: number; // Unix seconds
  updated_at: number; // Unix ms
}

export interface PhotoResponseDTO {
  id: string;
  url: string;
}
