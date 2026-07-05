import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, ManyToOne, JoinColumn,
  BeforeInsert,
  PrimaryColumn,
} from 'typeorm';
import { BlogComment } from './blog-comment.entity';
import { BlogLike } from './blog-like.entity';
import { v4 as uuidv4 } from 'uuid';

@Entity('blog_posts')
export class BlogPost {
  //@PrimaryGeneratedColumn('uuid') id: string;
  @PrimaryColumn()
  id: string;
  @BeforeInsert()
  generateId() {
    this.id = uuidv4();
  }   
 
  @Column({ length: 300 })              title: string;
  @Column({ type: 'text' })             excerpt: string;
  @Column({ type: 'text' })             content_html: string;
  @Column({ length: 50 })              category: string;
  @Column({ length: 80 })              category_label: string;
  @Column({ type: 'simple-array' })     tags: string[];
 
  // Author info (denormalised for read performance)
  @Column({ length: 100 })             author_name: string;
  @Column({ length: 100 })             author_role: string;
  @Column({ length: 4 })               author_initials: string;
  @Column({ length: 20 })              author_avatar_color: string;
 
  @Column({ type: 'int', default: 0 }) like_count: number;
  @Column({ type: 'int', default: 0 }) comment_count: number;
  @Column({ type: 'int', default: 0 }) view_count: number;
  @Column({ type: 'int', default: 5 }) read_time: number;
 
  @Column({ default: false }) trending: boolean;
  @Column({ default: false }) featured: boolean;
  @Column({ default: true  }) published: boolean;
 
  @CreateDateColumn() published_at: Date;
  @UpdateDateColumn() updated_at:  Date;
 
  @OneToMany(() => BlogComment, c => c.post)  comments: BlogComment[];
  @OneToMany(() => BlogLike,    l => l.post)  likes:    BlogLike[];
}