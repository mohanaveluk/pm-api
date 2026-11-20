import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { Rfq } from './rfq.entity';
import { RfqChecklistSection } from '../enums/rfq.enums';

// One line of the bid checklist. Created with the RFQ from RFQ_DEFAULT_CHECKLIST;
// the vendor ticks Yes / No, and gives a reason for No.
@Entity('rfq_checklist_items')
@Index('UQ_rfqcl_rfq_key', ['rfqId', 'key'], { unique: true })
export class RfqChecklistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  rfqId: string;

  @ManyToOne(() => Rfq, (r) => r.checklist, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfqId' })
  rfq: Rfq;

  @Column({ type: 'enum', enum: RfqChecklistSection })
  section: RfqChecklistSection;

  @Column({ length: 50 })
  key: string;

  @Column({ length: 255 })
  label: string;

  @Column({ type: 'int' })
  sequence: number;

  /** null until the vendor answers. */
  @Column({ type: 'boolean', nullable: true })
  provided: boolean | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
