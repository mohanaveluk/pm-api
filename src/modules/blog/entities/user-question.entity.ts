import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, ManyToOne, JoinColumn,
  PrimaryColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('user_questions')
export class UserQuestion {
  @PrimaryColumn()
  id: string;
  @BeforeInsert()
  generateId() {
    this.id = uuidv4();
  } 
 
  @Column({ type: 'text' })              question: string;
  @Column({ length: 100, default: 'Anonymous' }) asker_name: string;
  @Column({ length: 255, nullable: true }) asker_email: string | null;
 
  @Column({ default: false })  answered: boolean;
  @Column({ type:'text', nullable: true }) answer: string | null;
 
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
  
  @CreateDateColumn() answered_at: Date;
  @Column() answered_by: string;

}