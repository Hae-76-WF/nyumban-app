

import { Agent } from '../../domain/entities/Agent';
import { LoginResponseDTO } from '../api/dto';

export class AgentMapper {
  static toDomain(dto: LoginResponseDTO): Agent {
    return {
      id: dto.agent.id,
      displayName: dto.agent.display_name || 'Nyumban Field Agent',
      assignedRegion: dto.agent.assignedRegion || 'central',
    };
  }
}
