

import { AuthRepository } from '../../domain/repositories/AuthRepository';
import { Agent } from '../../domain/entities/Agent';
import { apiClient } from '../api/client';
import { localDB } from '../local/storage';
import { AgentMapper } from '../mappers/AgentMapper';

export class AuthRepositoryImpl implements AuthRepository {
  async initialize(): Promise<void> {
    await localDB.initialize();
    await apiClient.initialize();
  }

  async login(email: string, password: string): Promise<Agent> {
    const response = await apiClient.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const agent = AgentMapper.toDomain(response);
    await localDB.saveAgent(agent);
    await apiClient.setTokens(response.access_token, response.refreshToken);
    return agent;
  }

  async getAgent(): Promise<Agent | null> {
    return localDB.getAgent();
  }

  async logout(): Promise<void> {
    await localDB.clearAgent();
    await apiClient.clearTokens();
  }

  async isLoggedIn(): Promise<boolean> {
    const agent = await this.getAgent();
    const token = apiClient.getAccessToken();
    return !!agent && !!token;
  }
}
