import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Rfq } from './rfq.entity';

const decimal = { type: 'decimal' as const, precision: 18, scale: 4, nullable: true,
  transformer: { to: (v: number | null) => v, from: (v: string | null) => (v === null ? null : Number(v)) } };

// One price-schedule line: a requisition line put out for quotation. The buyer
// sets the RFQ quantity (up to what the requisition line still has open); the
// vendor fills the unit price, exchange rate, delivery and remarks. Totals are
// worked out on the server.
//
// requisitionItemId keeps the history: the quantity still open on a
// requisition line is its quantity minus the RFQ quantities of every RFQ
// raised from it (cancelled ones excepted).
@Entity('rfq_items')
@Index('IDX_rfqi_rfq', ['rfqId', 'lineNumber'])
@Index('IDX_rfqi_requisition_item', ['requisitionItemId'])
export class RfqItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  rfqId: string;

  @ManyToOne(() => Rfq, (r) => r.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfqId' })
  rfq: Rfq;

  @Column({ type: 'int' })
  lineNumber: number;

  @Column({ length: 36 })
  requisitionId: string;

  @Column({ length: 50 })
  mrNumber: string;

  @Column({ length: 36 })
  requisitionItemId: string;

  @Column({ length: 36 })
  materialId: string;

  // Snapshots of the requisition line.
  @Column({ length: 50 })
  itemCode: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  uom: string | null;

  /** The requisition line's quantity. */
  @Column({ type: 'decimal', precision: 18, scale: 3,
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  mrQuantity: number;

  /** What this RFQ asks the vendor to quote for. */
  @Column({ type: 'decimal', precision: 18, scale: 3,
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  rfqQuantity: number;

  // ── The vendor's ──────────────────────────────────────────────────

  @Column(decimal) unitPrice: number | null;
  @Column(decimal) totalPrice: number | null;
  /** Quoted currency → USD. */
  @Column({ ...decimal, scale: 6 }) exchangeRate: number | null;
  @Column(decimal) totalPriceUsd: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deliveryDuration: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
