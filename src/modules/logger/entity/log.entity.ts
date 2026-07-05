import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('log_tbl')
export class Log {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  level: string;

  @Column({type: 'text'})
  message: string;

  @Column({type: 'text', nullable: true })
  context: string;

  @CreateDateColumn()
  timestamp: Date;
}