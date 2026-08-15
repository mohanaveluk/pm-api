import { Injectable } from '@nestjs/common';

// Stub service — downstream modules (Purchase Order, RFQ, Inventory) will
// inject their repositories here once those modules are built.
@Injectable()
export class MaterialUsageValidationService {
  async isUsedInPurchaseOrder(_materialId: string): Promise<boolean> {
    return false;
  }

  async isUsedInPurchaseRequisition(_materialId: string): Promise<boolean> {
    return false;
  }

  async isUsedInRFQ(_materialId: string): Promise<boolean> {
    return false;
  }

  async isUsedInInventory(_materialId: string): Promise<boolean> {
    return false;
  }

  async hasTransactionalDependency(materialId: string): Promise<boolean> {
    const results = await Promise.all([
      this.isUsedInPurchaseOrder(materialId),
      this.isUsedInPurchaseRequisition(materialId),
      this.isUsedInRFQ(materialId),
      this.isUsedInInventory(materialId),
    ]);
    return results.some(Boolean);
  }
}
