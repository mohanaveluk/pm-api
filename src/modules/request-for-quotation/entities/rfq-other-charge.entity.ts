import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Rfq } from './rfq.entity';

// A charge the vendor adds to the price schedule (testing, packing, freight, …),
// in the quoted currency.
@Entity('rfq_other_charges')
@Index('IDX_rfqoc_rfq', ['rfqId', 'sequence'])
export class RfqOtherCharge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  rfqId: string;

  @ManyToOne(() => Rfq, (r) => r.otherCharges, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfqId' })
  rfq: Rfq;

  @Column({ type: 'int' })
  sequence: number;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'decimal', precision: 18, scale: 4,
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  amount: number;

  @CreateDateColumn()
  createdAt: Date;
}
