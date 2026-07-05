import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, ManyToOne, JoinColumn,
  BeforeInsert,
  PrimaryColumn,
} from 'typeorm';
import { BlogPost } from './blog-post.entity';
import { v4 as uuidv4 } from 'uuid';

@Entity('blog_likes')
export class BlogLike {
  //@PrimaryGeneratedColumn('uuid') id: string;

    @PrimaryColumn()
    id: string;
    @BeforeInsert()
    generateId() {
        this.id = uuidv4();
    } 
  @Column({ type: 'uuid' })      post_id: string;
  @Column({ length: 200 })       session_key: string;  // hashed fingerprint or user id
 
  @CreateDateColumn() created_at: Date;
 
  @ManyToOne(() => BlogPost, p => p.likes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: BlogPost;
}