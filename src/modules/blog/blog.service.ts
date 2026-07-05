import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { BlogComment } from './entities/blog-comment.entity';
import { BlogPost } from './entities/blog-post.entity';
import { BlogLike } from './entities/blog-like.entity';
import { QAItem } from './entities/qa-item.entity';
import { UserQuestion } from './entities/user-question.entity';
import { NewsletterSubscriber } from './entities/newsletter-subscriber.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { AnswerQuestionDto } from './dto/answer-question.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { SubmitQuestionDto } from './dto/submit-question.dto';
import { SubscribeDto } from './dto/subscribe.dto';
 
@Injectable()
export class NestBlogService {
  constructor(
    @InjectRepository(BlogPost)              private postRepo:       Repository<BlogPost>,
    @InjectRepository(BlogComment)           private commentRepo:    Repository<BlogComment>,
    @InjectRepository(BlogLike)              private likeRepo:       Repository<BlogLike>,
    @InjectRepository(QAItem)               private qaRepo:         Repository<QAItem>,
    @InjectRepository(UserQuestion)         private questionRepo:   Repository<UserQuestion>,
    @InjectRepository(NewsletterSubscriber) private newsletterRepo: Repository<NewsletterSubscriber>,
  ) {}
 
  // CREATE POST
  async createPost(dto: CreatePostDto, authorName?: string): Promise<BlogPost> {
    const catLabelMap: Record<string, string> = {
      guide:'Guide', vote:'Voting', party:'Party',
      survey:'Survey', tips:'Tips', news:'News',
    };
    const name     = authorName ?? dto.author_name ?? 'Anonymous';
    const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    const colors   = ['#4f46e5','#0d9488','#f59e0b','#059669','#7c3aed'];
 
    const post = this.postRepo.create({
      title:               dto.title,
      excerpt:             dto.excerpt,
      content_html:        dto.content_html,
      category:            dto.category,
      category_label:      catLabelMap[dto.category] ?? dto.category,
      tags:                dto.tags,
      author_name:         name,
      author_role:         dto.author_role ?? 'Community Member',
      author_initials:     initials,
      author_avatar_color: colors[Math.floor(Math.random() * colors.length)],
      read_time:           dto.read_time ?? 5,
      featured:            dto.featured ?? false,
      trending:            dto.trending ?? false,
      published:           true,
    });
    const saved = await this.postRepo.save(post);
    return saved;
  }
  
  // UPDATE POST
  async updatePost(id: string, dto: UpdatePostDto): Promise<BlogPost> {
    const post = await this.postRepo.findOneOrFail({ where: { id } });
    Object.assign(post, dto);
    return this.postRepo.save(post);
  }
 
  // DELETE POST
  async deletePost(id: string): Promise<void> {
    await this.postRepo.delete(id);
  }
 
  // GET USER QUESTIONS (admin)
  async getUserQuestions(answeredFilter?: string) {
    const where: any = {};
    if (answeredFilter === 'false') where.answered = false;
    if (answeredFilter === 'true')  where.answered = true;
    return this.questionRepo.find({ where, order: { created_at: 'DESC' } });
  }
 
  // ANSWER USER QUESTION (admin)
  async answerQuestion(id: string, dto: AnswerQuestionDto) {
    const q = await this.questionRepo.findOneOrFail({ where: { id } });
    q.answer      = dto.answer;
    q.answered    = true;
    q.answered_by = dto.answeredBy ?? 'Project Management Team';
    q.answered_at = new Date();
    await this.questionRepo.save(q);
 
    // Promote to public Q&A sidebar if requested
    if (dto.promoteToPublic) {
      const catLabel: Record<string, string> = {
        guide:'Guide', vote:'Voting', party:'Party',
        survey:'Survey', tips:'Tips', news:'News',
      };
      const cat = dto.category ?? 'guide';
      const qa = this.qaRepo.create({
        question:      q.question,
        answer:        dto.answer,
        category:      cat,
        category_label: catLabel[cat] ?? 'Guide',
        published:     true,
        sort_order:    Date.now(),
      });
      await this.qaRepo.save(qa);
    }
    return q;
  }
  
  // ── Stats ──────────────────────────────────────────────────────────────
  async getStats() {
    const [totalPosts, totalComments, likes] = await Promise.all([
      this.postRepo.count({ where: { published: true } }),
      this.commentRepo.count({ where: { hidden: false } }),
      this.postRepo.createQueryBuilder('p').select('SUM(p.like_count)', 'total').getRawOne(),
    ]);
    return {
      totalPosts,
      totalComments,
      totalLikes:   Number(likes?.total ?? 0),
      totalReaders: `${Math.round(totalPosts * 1.2)}K`,
    };
  }
 
  // ── Categories ─────────────────────────────────────────────────────────
  async getCategories() {
    const cats = await this.postRepo.createQueryBuilder('p')
      .select('p.category', 'id')
      .addSelect('p.category_label', 'label')
      .addSelect('COUNT(*)', 'count')
      .where('p.published = true')
      .groupBy('p.category')
      .addGroupBy('p.category_label')
      .getRawMany();
 
    const iconMap: Record<string, string> = {
      guide:'menu_book', vote:'how_to_vote', party:'account_balance',
      survey:'poll',     tips:'lightbulb',   news:'campaign',
    };
    return cats.map(c => ({ ...c, icon: iconMap[c.id] ?? 'article', count: +c.count }));
  }
 
  // ── Tags ───────────────────────────────────────────────────────────────
  async getTrendingTags() {
    const posts = await this.postRepo.find({ where: { published: true }, select: ['tags'] });
    const freq: Record<string, number> = {};
    posts.forEach(p => p.tags.forEach(t => { freq[t] = (freq[t] ?? 0) + 1; }));
    const sorted = Object.entries(freq).sort(([,a],[,b]) => b - a).slice(0, 12);
    const max = sorted[0]?.[1] ?? 1;
    return sorted.map(([label, count]) => ({
      label, count,
      size: Math.round(12 + (count / max) * 4),
    }));
  }
 
  // ── Posts ──────────────────────────────────────────────────────────────
  async getPosts({ page=1, pageSize=10, category, search, sort='newest' }: {
    page?: number; pageSize?: number; category?: string; search?: string; sort?: string;
  }) {
    const qb = this.postRepo.createQueryBuilder('p').where('p.published = true');
 
    if (category) qb.andWhere('p.category = :category', { category });
    if (search)   qb.andWhere('(p.title ILIKE :s OR p.excerpt ILIKE :s)', { s: `%${search}%` });
 
    const orderMap: Record<string, [string, 'ASC'|'DESC']> = {
      newest:    ['p.published_at', 'DESC'],
      popular:   ['p.like_count',   'DESC'],
      discussed: ['p.comment_count','DESC'],
      trending:  ['p.view_count',   'DESC'],
    };
    const [col, dir] = orderMap[sort] ?? orderMap.newest;
    qb.orderBy(col, dir);
    qb.skip((page - 1) * pageSize).take(pageSize);
 
    const posts = await qb.getMany();
    return { data: posts.map(this.toDto) };
  }
 
  async getPost(id: string) {
    const p = await this.postRepo.findOne({ where: { id, published: true } });
    if (!p) throw new NotFoundException('Post not found');
    return this.toDto(p);
  }
 
  async incrementView(id: string) {
    await this.postRepo.increment({ id }, 'view_count', 1);
  }
 
  async toggleLike(id: string, liked: boolean) {
    const delta = liked ? 1 : -1;
    await this.postRepo.increment({ id }, 'like_count', delta);
  }
 
  // ── Comments ───────────────────────────────────────────────────────────
  async getComments(postId: string) {
    const comments = await this.commentRepo.find({
      where: { post_id: postId, parent_id: null as any, hidden: false },
      order: { pinned: 'DESC', created_at: 'DESC' },
      relations: ['replies'],
    });
    return comments.map(this.toCommentDto);
  }
 
  async addComment(postId: string, body: any) {
    const name = body.name?.trim() || 'Anonymous';
    const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2);
    const colors = ['#4f46e5','#0d9488','#f59e0b','#059669','#7c3aed'];
    const comment = this.commentRepo.create({
      post_id: postId,
      parent_id: body.parentId ?? null,
      commenter_name: name,
      commenter_initials: initials,
      commenter_avatar_color: colors[Math.floor(Math.random() * colors.length)],
      text: body.text,
    });
    const saved = await this.commentRepo.save(comment);
    await this.postRepo.increment({ id: postId }, 'comment_count', 1);
    return this.toCommentDto(saved);
  }
 
  // ── Q&A ────────────────────────────────────────────────────────────────
  async getPopularQA() {
    const items = await this.qaRepo.find({
      where: { published: true },
      order: { helpful_count: 'DESC', sort_order: 'ASC' },
      take: 8,
    });
    return items.map(q => ({
      id: q.id, question: q.question, answer: q.answer,
      category: q.category, categoryLabel: q.category_label,
      helpfulCount: q.helpful_count, markedHelpful: false, expanded: false,
    }));
  }
 
  async markQAHelpful(id: string, helpful: boolean) {
    const delta = helpful ? 1 : -1;
    await this.qaRepo.increment({ id }, 'helpful_count', delta);
  }
 
  async saveUserQuestion(body: SubmitQuestionDto) {
    const q = this.questionRepo.create({
      question: body.question,
      asker_name: body.askerName || 'Anonymous',
    });
    return this.questionRepo.save(q);
  }
 
  // ── Newsletter ─────────────────────────────────────────────────────────
  async subscribe(body: SubscribeDto) {
    const existing = await this.newsletterRepo.findOne({ where: { email: body.email } });
    if (!existing) {
      await this.newsletterRepo.save(this.newsletterRepo.create({ email: body.email }));
    } else if (!existing.active) {
      await this.newsletterRepo.update({ email: body.email }, { active: true });
    }
  }
 
  // ── DTO mappers ────────────────────────────────────────────────────────
  private toDto = (p: BlogPost) => ({
    id: p.id, title: p.title, excerpt: p.excerpt, contentHtml: p.content_html,
    category: p.category, categoryLabel: p.category_label, tags: p.tags,
    author: { id: p.id, name: p.author_name, role: p.author_role,
              initials: p.author_initials, avatarColor: p.author_avatar_color },
    publishedAt: p.published_at, readTime: p.read_time,
    likeCount: p.like_count, commentCount: p.comment_count, viewCount: p.view_count,
    liked: false, trending: p.trending, featured: p.featured,
  });
 
  private toCommentDto = (c: BlogComment): any => ({
    id: c.id, postId: c.post_id,
    name: c.commenter_name, initials: c.commenter_initials,
    avatarColor: c.commenter_avatar_color, text: c.text,
    likeCount: c.like_count, liked: false, pinned: c.pinned,
    createdAt: c.created_at,
    replies: (c.replies ?? []).map(this.toCommentDto),
  });
}