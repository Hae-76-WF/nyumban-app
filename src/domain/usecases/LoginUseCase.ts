

import { Agent } from '../entities/Agent';
import { AuthRepository } from '../repositories/AuthRepository';

export class LoginUseCase {
  constructor(private authRepo: AuthRepository) {}

  async execute(email: string, password: string): Promise<Agent> {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    return this.authRepo.login(email, password);
  }
}
