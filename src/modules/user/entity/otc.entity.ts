import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('otc_tbl')
export class OTC {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({nullable: true})
  uguid: string

  @Column()
  mobile: string;

  @Column()
  code: string;

  @Column({ default: 1 })
  is_active: number;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'datetime' })
  expiry_datetime: Date;
}