

import { Inspection } from '../entities/Inspection';
import { InspectionRepository } from '../repositories/InspectionRepository';

export class SubmitInspectionUseCase {
  constructor(private inspectionRepo: InspectionRepository) {}

  async execute(inspection: Inspection): Promise<void> {
    // 1. Verify and populate standard fields
    if (!inspection.propertyId) {
      throw new Error('Inspection must contain a valid propertyId');
    }

    // 2. Validate room condition ratings
    const incompleteRooms = inspection.rooms.filter((r) => !r.condition);
    if (incompleteRooms.length > 0) {
      throw new Error('All rooms must be assigned a condition rating.');
    }

    // 3. Persist as completed to background sync queue
    await this.inspectionRepo.queueInspection(inspection);
    
    // 4. Remove temporary drafts
    await this.inspectionRepo.deleteDraft(inspection.propertyId);
  }
}
