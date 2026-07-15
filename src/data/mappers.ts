import { 
  Property, 
  PropertyDTO, 
  PropertyRoom, 
  Agent, 
  LoginResponseDTO,
  PropertyRegion,
  PropertyStatus
} from '../types';

export function mapPropertyDTO(dto: PropertyDTO): Property {
  // Normalize potentially null or missing values to safe defaults
  const address = dto.address || "Unknown Address";
  const unitCount = dto.unit_count !== null && dto.unit_count !== undefined ? dto.unit_count : 0;
  
  // Guard region and status to ensure type safety
  const region = (dto.region || 'central') as PropertyRegion;
  const status = (dto.status || 'active') as PropertyStatus;

  // Map rooms if they exist
  const rooms: PropertyRoom[] = [];
  if (dto.rooms && Array.isArray(dto.rooms)) {
    dto.rooms.forEach(r => {
      rooms.push({
        id: r.id,
        label: r.label || `Room ${r.id}`,
        floor: r.floor || 0
      });
    });
  }

  return {
    id: dto.id,
    name: dto.name || "Unnamed Property",
    address,
    unitCount,
    region,
    lastInspectedAt: dto.last_inspected_at,
    status,
    version: dto.version || 0,
    rooms
  };
}

export function mapAgentDTO(dto: LoginResponseDTO): Agent {
  return {
    id: dto.agent.id,
    displayName: dto.agent.display_name || "Nyumban Agent",
    assignedRegion: dto.agent.assignedRegion || "central"
  };
}
