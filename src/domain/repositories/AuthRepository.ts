

import { Agent } from '../entities/Agent';

export interface AuthRepository {
  login(email: string, password: string): Promise<Agent>;
  getAgent(): Promise<Agent | null>;
  logout(): Promise<void>;
  isLoggedIn(): Promise<boolean>;
  initialize(): Promise<void>;
}
