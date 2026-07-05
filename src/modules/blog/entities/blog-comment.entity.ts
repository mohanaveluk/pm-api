import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, ManyToOne, JoinColumn,
  BeforeInsert,
  PrimaryColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { BlogPost } from './blog-post.entity';

@Entity('blog_comments')
export class BlogComment {
  //@PrimaryGeneratedColumn('uuid') id: string;
  @PrimaryColumn()
  id: string;
  @BeforeInsert()
  generateId() {
    this.id = uuidv4();
  }   
 
  @Column({ type: 'uuid' })            post_id: string;
  @Column({ nullable: true, type:'uuid' }) parent_id: string | null;  // null = top-level
 
  @Column({ length: 100, default: 'Anonymous' }) commenter_name: string;
  @Column({ length: 4 })                         commenter_initials: string;
  @Column({ length: 20 })                        commenter_avatar_color: string;
 
  @Column({ type: 'text' })   text: string;
  @Column({ default: 0 })     like_count: number;
  @Column({ default: false }) pinned: boolean;
  @Column({ default: false }) hidden: boolean;
 
  @CreateDateColumn() created_at: Date;
 
  @ManyToOne(() => BlogPost, p => p.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: BlogPost;
 
  @OneToMany(() => BlogComment, c => c.parent) replies: BlogComment[];
 
  @ManyToOne(() => BlogComment, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: BlogComment | null;
}