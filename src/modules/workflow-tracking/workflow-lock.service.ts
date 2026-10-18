import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaterialRequisition } from '../material-requisition/entities/material-requisition.entity';

/**
 * Once a purchase order has been raised, the requisition behind it — and the
 * project, client and WBS / cost code it was raised against — can no longer be
 * edited: the PO was priced and committed against exactly those details.
 *
 * The lock lives on the requisition (`lockedAt`); the PO module sets it via
 * MaterialRequisitionService.lockForPurchaseOrder(). Masters ask here before
 * accepting an edit.
 */
@Injectable()
export class WorkflowLockService {
  constructor(
    @InjectRepository(MaterialRequisition) private readonly mrRepo: Repository<MaterialRequisition>,
  ) {}

  async assertProjectEditable(organizationId: string, projectId: string): Promise<void> {
    const mr = await this.lockedQuery(organizationId)
      .andWhere('mr.projectId = :projectId', { projectId })
      .getOne();
    if (mr) this.reject('project', mr);
  }

  async assertClientEditable(organizationId: string, clientId: string): Promise<void> {
    const mr = await this.lockedQuery(organizationId)
      .innerJoin('mr.project', 'p')
      .andWhere('p.clientId = :clientId', { clientId })
      .getOne();
    if (mr) this.reject('client', mr);
  }

  async assertWbsEditable(organizationId: string, wbsCostCodeId: string): Promise<void> {
    const mr = await this.lockedQuery(organizationId)
      .andWhere('mr.wbsCostCodeId = :wbsCostCodeId', { wbsCostCodeId })
      .getOne();
    if (mr) this.reject('WBS / cost code', mr);
  }

  private lockedQuery(organizationId: string) {
    return this.mrRepo
      .createQueryBuilder('mr')
      .select(['mr.id', 'mr.mrNumber', 'mr.trackingId', 'mr.lockedReason'])
      .where('mr.organizationId = :organizationId', { organizationId })
      .andWhere('mr.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('mr.lockedAt IS NOT NULL');
  }

  private reject(what: string, mr: MaterialRequisition): never {
    throw new ConflictException(
      `This ${what} is locked: material requisition ${mr.mrNumber}` +
      `${mr.trackingId ? ` (${mr.trackingId})` : ''} has a purchase order raised against it` +
      `${mr.lockedReason ? ` — ${mr.lockedReason}` : ''}.`,
    );
  }
}
