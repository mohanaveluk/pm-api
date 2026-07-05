import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, ManyToOne, JoinColumn,
  BeforeInsert,
  PrimaryColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
 
@Entity('newsletter_subscribers')
export class NewsletterSubscriber {
  //@PrimaryGeneratedColumn('uuid') id: string;
  @PrimaryColumn()
  id: string;
  @BeforeInsert()
  generateId() {
    this.id = uuidv4();
  } 
  @Column({ unique: true, length: 255 }) email: string;
  @Column({ default: true })             active: boolean;
  @CreateDateColumn()                    subscribed_at: Date;
}