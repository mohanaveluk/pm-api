import { Injectable } from '@nestjs/common';

// Stub service — downstream procurement modules (RFQ, CBE, Purchase Order,
// Contract, Invoice, Payment, Inspection, Project) will inject their
// repositories here once those modules are built.
//
// Follows the MaterialUsageValidationService pattern so both masters guard
// deletion the same way. The method signatures are the stable contract: the
// vendor service calls hasTransactionalDependency() and never needs to change
// when a new downstream module is wired in.
//
// Deliberately NOT consulted by disable(): a vendor with historical purchase
// orders must still be deactivatable. Transactional history blocks DELETION
// (records must remain resolvable), not deactivation.
@Injectable()
export class VendorUsageValidationService {
  async isUsedInRFQ(_vendorId: string): Promise<boolean> {
    return false;
  }

  async isUsedInBidEvaluation(_vendorId: string): Promise<boolean> {
    return false;
  }

  async isUsedInPurchaseOrder(_vendorId: string): Promise<boolean> {
    return false;
  }

  async isUsedInContract(_vendorId: string): Promise<boolean> {
    return false;
  }

  async isUsedInInvoiceOrPayment(_vendorId: string): Promise<boolean> {
    return false;
  }

  async isUsedInInspection(_vendorId: string): Promise<boolean> {
    return false;
  }

  async isUsedInProject(_vendorId: string): Promise<boolean> {
    return false;
  }

  async hasTransactionalDependency(vendorId: string): Promise<boolean> {
    const results = await Promise.all([
      this.isUsedInRFQ(vendorId),
      this.isUsedInBidEvaluation(vendorId),
      this.isUsedInPurchaseOrder(vendorId),
      this.isUsedInContract(vendorId),
      this.isUsedInInvoiceOrPayment(vendorId),
      this.isUsedInInspection(vendorId),
      this.isUsedInProject(vendorId),
    ]);
    return results.some(Boolean);
  }

  // Returns the human-readable names of the modules currently referencing the
  // vendor, so the 409 response can name them instead of saying "in use".
  async describeDependencies(vendorId: string): Promise<string[]> {
    const checks: Array<[string, Promise<boolean>]> = [
      ['RFQ',              this.isUsedInRFQ(vendorId)],
      ['Bid Evaluation',   this.isUsedInBidEvaluation(vendorId)],
      ['Purchase Order',   this.isUsedInPurchaseOrder(vendorId)],
      ['Contract',         this.isUsedInContract(vendorId)],
      ['Invoice/Payment',  this.isUsedInInvoiceOrPayment(vendorId)],
      ['Inspection',       this.isUsedInInspection(vendorId)],
      ['Project',          this.isUsedInProject(vendorId)],
    ];
    const resolved = await Promise.all(checks.map(([, p]) => p));
    return checks.filter((_, i) => resolved[i]).map(([name]) => name);
  }
}
