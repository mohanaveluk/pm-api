import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogPost } from './entities/blog-post.entity';
import { BlogComment } from './entities/blog-comment.entity';
import { BlogLike } from './entities/blog-like.entity';
import { UserQuestion } from './entities/user-question.entity';
import { QAItem } from './entities/qa-item.entity';
import { NewsletterSubscriber } from './entities/newsletter-subscriber.entity';
import { BlogController } from './blog.controller';
import { NestBlogService } from './blog.service';
 
@Module({
  imports: [
    TypeOrmModule.forFeature([
      BlogPost, BlogComment, BlogLike,
      QAItem, UserQuestion, NewsletterSubscriber,
    ]),
  ],
  controllers: [BlogController],
  providers:   [NestBlogService],
})
export class BlogModule {}