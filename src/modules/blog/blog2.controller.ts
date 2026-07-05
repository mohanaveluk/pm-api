import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
  HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { SubscribeDto } from './dto/subscribe.dto';
import { AnswerQuestionDto } from './dto/answer-question.dto';
import { BlogCommentResponseDto, BlogPostResponseDto, BlogStatsResponseDto, PaginatedPostsResponseDto, QAItemResponseDto, UserQuestionResponseDto } from './dto/response.dto';
import { GetPostsQueryDto } from './dto/get-posts-query.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ToggleLikeDto } from './dto/toggle-like.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { SubmitQuestionDto } from './dto/submit-question.dto';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { OptionalJwtGuard } from '../auth/optional-jwt.guard';
// import { RolesGuard } from '../auth/roles.guard';
// import { Roles } from '../auth/roles.decorator';
// import { BlogService } from './blog.service';
 
@ApiTags('Blog')
@Controller('blog')
export class BlogControllerWithSwagger {
 
  // ── Stats ──────────────────────────────────────────────────────────────
  @Get('stats')
  @ApiOperation({ summary: 'Get blog statistics (total posts, comments, likes, readers)' })
  @ApiResponse({ status: 200, type: BlogStatsResponseDto, description: 'Blog stats returned' })
  getStats() { /* return this.blogSvc.getStats(); */ }
 
 
  // ── Categories ─────────────────────────────────────────────────────────
  @Get('categories')
  @ApiOperation({ summary: 'Get all post categories with article counts' })
  @ApiResponse({ status: 200, description: 'Array of category objects' })
  getCategories() {}
 
 
  // ── Trending Tags ──────────────────────────────────────────────────────
  @Get('tags/trending')
  @ApiOperation({ summary: 'Get top trending tags with frequency and display size' })
  @ApiResponse({ status: 200, description: 'Array of TrendingTag objects' })
  getTrendingTags() {}
 
 
  // ── Get all posts (public) ─────────────────────────────────────────────
  @Get('posts')
  @ApiOperation({
    summary: 'List all published blog posts',
    description: `
**Anyone can call this endpoint — no login required.**
Returns paginated blog posts. Use filters to narrow results.
 
How articles appear on the blog page:
1. Admin or authenticated user POSTs to \`/blog/posts\` with title/content/category
2. Rows are saved in \`blog_posts\` table with \`published = true\`
3. This GET endpoint returns them
4. Angular \`BlogComponent\` calls this on init and populates the post grid
    `,
  })
  @ApiResponse({ status: 200, type: PaginatedPostsResponseDto })
  @ApiQuery({ name: 'page',     required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 10 })
  @ApiQuery({ name: 'category', required: false, enum: ['all','guide','vote','party','survey','tips','news'] })
  @ApiQuery({ name: 'search',   required: false, example: 'OTP verification' })
  @ApiQuery({ name: 'sort',     required: false, enum: ['newest','popular','discussed','trending'] })
  getPosts(@Query() query: GetPostsQueryDto) {}
 
 
  // ── Get single post (public) ───────────────────────────────────────────
  @Get('posts/:id')
  @ApiOperation({ summary: 'Get a single blog post by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the post' })
  @ApiResponse({ status: 200, type: BlogPostResponseDto })
  @ApiResponse({ status: 404, description: 'Post not found' })
  getPost(@Param('id', ParseUUIDPipe) id: string) {}
 
 
  // ── CREATE POST (authenticated users) ─────────────────────────────────
  @Post('posts')
  // @UseGuards(JwtAuthGuard)          // ← uncomment in production
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new blog article',
    description: `
**Requires JWT authentication** (logged-in users only).
 
This is how articles get into the blog:
1. Authenticated user fills the "Write Article" form at /blog/write
2. Angular calls POST /blog/posts with the body below
3. NestJS saves to \`blog_posts\` table with \`published = true\`
4. Article immediately appears on the public blog page
 
**Field reference:**
- \`title\` — Article headline (max 300 chars)
- \`excerpt\` — 2–3 sentence teaser shown on cards (max 600 chars)
- \`content_html\` — Full HTML body of the article
- \`category\` — One of: guide, vote, party, survey, tips, news
- \`tags\` — Array of strings e.g. ["otp","security"]
- \`read_time\` — Estimated minutes to read (default: 5)
- \`featured\` — Set true to pin as the hero featured post
    `,
  })
  @ApiResponse({ status: 201, type: BlogPostResponseDto, description: 'Post created and live' })
  @ApiResponse({ status: 401, description: 'Unauthorized — must be logged in' })
  @ApiResponse({ status: 400, description: 'Validation error — check required fields' })
  createPost(@Body() dto: CreatePostDto) {
    
  }
 
 
  // ── UPDATE POST (author or admin) ──────────────────────────────────────
  @Patch('posts/:id')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing blog post (author or admin)' })
  @ApiParam({ name: 'id', description: 'UUID of the post to update' })
  @ApiResponse({ status: 200, type: BlogPostResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  updatePost(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePostDto) {}
 
 
  // ── DELETE POST (author or admin) ──────────────────────────────────────
  @Delete('posts/:id')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a blog post (author or admin)' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 204, description: 'Post deleted' })
  deletePost(@Param('id', ParseUUIDPipe) id: string) {}
 
 
  // ── Record view (public) ───────────────────────────────────────────────
  @Post('posts/:id/view')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Increment view count for a post (called on post open)' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 204, description: 'View recorded' })
  recordView(@Param('id', ParseUUIDPipe) id: string) {}
 
 
  // ── Toggle like (public — tracked by session) ──────────────────────────
  @Patch('posts/:id/like')
  @ApiOperation({ summary: 'Like or unlike a post' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: '{ likeCount: number }' })
  toggleLike(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ToggleLikeDto) {}
 
 
  // ── Get comments (public) ──────────────────────────────────────────────
  @Get('posts/:id/comments')
  @ApiOperation({ summary: 'Get all comments for a post (threaded)' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: [BlogCommentResponseDto] })
  getComments(@Param('id', ParseUUIDPipe) id: string) {}
 
 
  // ── Add comment (public) ───────────────────────────────────────────────
  @Post('posts/:id/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a comment to a post',
    description: 'No login required. Provide optional name for display. Use parentId to reply.',
  })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({ status: 201, type: BlogCommentResponseDto })
  addComment(@Param('id', ParseUUIDPipe) postId: string, @Body() dto: CreateCommentDto) {}
 
 
  // ── Get curated Q&A (public sidebar) ──────────────────────────────────
  @Get('qa')
  @ApiOperation({
    summary: 'Get curated Q&A items for the blog sidebar',
    description: `
Returns Q&A from the \`blog_qa\` table — these are **admin-curated** FAQs.
 
**Different from user_questions:**
- \`blog_qa\` = manually written by admin, always published, shown in sidebar
- \`user_questions\` = submitted by visitors, need admin to answer before appearing
 
Seed the \`blog_qa\` table with the SQL in blog.schema.sql to see them.
    `,
  })
  @ApiResponse({ status: 200, type: [QAItemResponseDto] })
  getQA() {}
 
 
  // ── Mark Q&A helpful ──────────────────────────────────────────────────
  @Patch('qa/:id/helpful')
  @ApiOperation({ summary: 'Mark a Q&A item as helpful (or undo)' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: '{ helpfulCount: number }' })
  markHelpful(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ToggleLikeDto) {}
 
 
  // ── Submit user question (public) ─────────────────────────────────────
  @Post('qa/questions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit a new question from a visitor',
    description: `
**This is the "Ask the Community" widget in the sidebar.**
 
Flow:
1. Visitor types a question and clicks Submit
2. Question saved to \`user_questions\` table with \`answered = false\`
3. Admin sees it in the back-office / Swagger console
4. Admin calls PATCH /blog/qa/questions/:id to answer
5. If \`promoteToPublic = true\`, a new row is created in \`blog_qa\`
   and the question appears in the public sidebar accordion
 
Until answered, the question is NOT visible to other users.
    `,
  })
  @ApiResponse({ status: 201, type: UserQuestionResponseDto })
  submitQuestion(@Body() dto: SubmitQuestionDto) {}
 
 
  // ── Get all user questions (admin only) ───────────────────────────────
  @Get('qa/questions')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all submitted user questions — ADMIN ONLY',
    description: 'Lists unanswered questions so admin can respond. Filter by answered=false to see pending.',
  })
  @ApiQuery({ name: 'answered', required: false, enum: ['true','false'] })
  @ApiResponse({ status: 200, type: [UserQuestionResponseDto] })
  getUserQuestions(@Query('answered') answered?: string) {}
 
 
  // ── Answer a user question (admin only) ───────────────────────────────
  @Patch('qa/questions/:id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Answer a visitor question — ADMIN ONLY',
    description: `
Admin responds to a question from user_questions.
If \`promoteToPublic = true\`, the Q&A is copied to \`blog_qa\` table
and will appear in the public sidebar accordion on the blog page.
    `,
  })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: UserQuestionResponseDto })
  answerQuestion(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AnswerQuestionDto) {}
 
 
  // ── Newsletter subscribe ───────────────────────────────────────────────
  @Post('newsletter/subscribe')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Subscribe to the blog newsletter' })
  @ApiResponse({ status: 201, description: 'Subscribed successfully' })
  @ApiResponse({ status: 409, description: 'Already subscribed' })
  subscribe(@Body() dto: SubscribeDto) {}
}
 