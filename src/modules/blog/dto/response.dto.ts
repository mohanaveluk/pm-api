
import { ApiProperty as AP } from '@nestjs/swagger';
 
export class AuthorDto {
  @AP() id: string;
  @AP() name: string;
  @AP() role: string;
  @AP() initials: string;
  @AP() avatarColor: string;
}
 
export class BlogPostResponseDto {
  @AP() id: string;
  @AP() title: string;
  @AP() excerpt: string;
  @AP() contentHtml: string;
  @AP() category: string;
  @AP() categoryLabel: string;
  @AP({ type: [String] }) tags: string[];
  @AP() author: AuthorDto;
  @AP() publishedAt: Date;
  @AP() readTime: number;
  @AP() likeCount: number;
  @AP() commentCount: number;
  @AP() viewCount: number;
  @AP() liked: boolean;
  @AP() trending: boolean;
  @AP() featured: boolean;
}
 
export class BlogCommentResponseDto {
  @AP() id: string;
  @AP() postId: string;
  @AP() name: string;
  @AP() initials: string;
  @AP() avatarColor: string;
  @AP() text: string;
  @AP() likeCount: number;
  @AP() liked: boolean;
  @AP() pinned: boolean;
  @AP() createdAt: Date;
  @AP({ type: () => [BlogCommentResponseDto] }) replies: BlogCommentResponseDto[];
}
 
export class QAItemResponseDto {
  @AP() id: string;
  @AP() question: string;
  @AP() answer: string;
  @AP() category: string;
  @AP() categoryLabel: string;
  @AP() helpfulCount: number;
  @AP() markedHelpful: boolean;
  @AP() expanded: boolean;
}
 
export class BlogStatsResponseDto {
  @AP() totalPosts: number;
  @AP() totalComments: number;
  @AP() totalLikes: number;
  @AP() totalReaders: string;
}
 
export class PaginatedPostsResponseDto {
  @AP({ type: [BlogPostResponseDto] }) data: BlogPostResponseDto[];
  @AP() total: number;
  @AP() page: number;
  @AP() pageSize: number;
  @AP() hasMore: boolean;
}
 
export class UserQuestionResponseDto {
  @AP() id: string;
  @AP() question: string;
  @AP() askerName: string;
  @AP() answered: boolean;
  @AP({ nullable: true }) answer: string | null;
  @AP() createdAt: Date;
}