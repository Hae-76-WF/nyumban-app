import { AuthRepositoryImpl } from '../data/repositories/AuthRepositoryImpl';
import { PropertyRepositoryImpl } from '../data/repositories/PropertyRepositoryImpl';
import { InspectionRepositoryImpl } from '../data/repositories/InspectionRepositoryImpl';

import { LoginUseCase } from '../domain/usecases/LoginUseCase';
import { GetPropertiesUseCase } from '../domain/usecases/GetPropertiesUseCase';
import { SubmitInspectionUseCase } from '../domain/usecases/SubmitInspectionUseCase';

// Concrete Repository Instances
export const authRepository = new AuthRepositoryImpl();
export const propertyRepository = new PropertyRepositoryImpl();
export const inspectionRepository = new InspectionRepositoryImpl();

// UseCase Instances Injecting Repositories
export const loginUseCase = new LoginUseCase(authRepository);
export const getPropertiesUseCase = new GetPropertiesUseCase(propertyRepository);
export const submitInspectionUseCase = new SubmitInspectionUseCase(inspectionRepository);
