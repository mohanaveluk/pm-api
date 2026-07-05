import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('password_archive_tbl')
export class PasswordArchive {
 
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  password: string;

  @CreateDateColumn({ type: 'datetime'})
  created_at: Date;

  @ManyToOne(() => User, user => user.password_history, { nullable: false })
  user: User;

  @Column({ nullable: false })
  userId: string;
}