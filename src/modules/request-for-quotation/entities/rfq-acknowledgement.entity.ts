import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToOne, JoinColumn,
} from 'typeorm';
import { Rfq } from './rfq.entity';

// The vendor's RFQ Acknowledgement Form: whether it will participate and quote,
// and who to contact. One per RFQ; its documents are rfq_documents rows of
// section ACKNOWLEDGEMENT. "Name & Date" is the vendor name and acknowledgedAt.
@Entity('rfq_acknowledgements')
@Index('UQ_rfqack_rfq', ['rfqId'], { unique: true })
export class RfqAcknowledgement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  rfqId: string;

  @OneToOne(() => Rfq, (r) => r.acknowledgement, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfqId' })
  rfq: Rfq;

  /** Vendor confirms participation: Yes / No. */
  @Column()
  participate: boolean;

  /** Will the vendor submit a quotation: Yes / No (No when it does not participate). */
  @Column()
  willSubmitQuotation: boolean;

  @Column({ length: 200 })
  vendorName: string;

  @Column({ length: 150 })
  contactPerson: string;

  @Column({ length: 150 })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  /** The vendor user who submitted the form. */
  @Column({ length: 150 })
  acknowledgedBy: string;

  @Column({ type: 'datetime' })
  acknowledgedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
