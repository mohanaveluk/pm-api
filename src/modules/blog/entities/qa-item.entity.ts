import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, ManyToOne, JoinColumn,
  PrimaryColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('blog_qa')
export class QAItem {
  //@PrimaryGeneratedColumn('uuid') id: string;
  @PrimaryColumn()
  id: string;
  @BeforeInsert()
  generateId() {
    this.id = uuidv4();
  }

  @Column({ type: 'text' })     question: string;
  @Column({ type: 'text' })     answer: string;
  @Column({ length: 50 })       category: string;
  @Column({ length: 80 })       category_label: string;
  @Column({ default: 0 })       helpful_count: number;
  @Column({ default: true })    published: boolean;
  @Column({ default: 0 })       sort_order: number;
 
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}