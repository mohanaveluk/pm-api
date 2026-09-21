import {
  Controller, Post, Get, Put, Body, UseGuards, Request, HttpCode, HttpStatus,
  Req, Query, Res, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiConsumes,
} from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { VerifyOrganizationEmailDto } from './dto/verify-email.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { Request as ExpRequest, Response } from 'express';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new organization', description: 'Creates a pending organization and sends OTP to email' })
  @ApiBody({ type: RegisterOrganizationDto })
  @ApiResponse({ status: 201, description: 'Verification code sent', schema: { example: { success: true, message: 'Verification code sent to your email' } } })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  register(@Body() dto: RegisterOrganizationDto, @Req() req: ExpRequest) {
    const domain = `${req.get('origin')}`;
    return this.orgService.register(dto, domain);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify organization email with OTP' })
  @ApiBody({ type: VerifyOrganizationEmailDto })
  @ApiResponse({ status: 200, description: 'Email verified, organization activated, admin account created', schema: { example: { success: true } } })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 429, description: 'Too many failed attempts' })
  verifyEmail(@Body() dto: VerifyOrganizationEmailDto) {
    return this.orgService.verifyEmail(dto);
  }

  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend OTP to organization email', description: 'Rate limited to 5 resends. OTP expires in 10 minutes.' })
  @ApiBody({ type: ResendOtpDto })
  @ApiResponse({ status: 200, description: 'New OTP sent', schema: { example: { success: true, message: 'New verification code sent' } } })
  @ApiResponse({ status: 429, description: 'Resend limit reached' })
  resendOtp(@Body() dto: ResendOtpDto, @Req() req: ExpRequest) {
    const domain = `${req.get('origin')}`;
    return this.orgService.resendOtp(dto.email, domain);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OrganizationAdmin')
  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get organization profile' })
  @ApiResponse({ status: 200, description: 'Organization profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@Request() req: any) {
    return this.orgService.getProfile(req.user.organizationId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OrganizationAdmin')
  @Put('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update organization profile' })
  @ApiBody({ type: UpdateOrganizationDto })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateProfile(@Body() dto: UpdateOrganizationDto, @Request() req: any) {
    return this.orgService.updateProfile(req.user.organizationId, dto, req.user.email);
  }

  // ── Documents (OrganizationAdmin only, scoped to the caller's organization) ──
  // Files are uploaded here; the organization_documents rows themselves are
  // written when the profile is saved (PUT /organizations/profile with `documents`).

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OrganizationAdmin')
  @Get('documents')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "List the organization's saved documents" })
  listDocuments(@Request() req: any) {
    return this.orgService.listDocuments(req.user.organizationId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OrganizationAdmin')
  @Post('documents/upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a document file and get its storage metadata',
    description:
      'Stores the binary only. Nothing is written to organization_documents until the ' +
      'profile is saved with the document in its documents list.',
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadDocument(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    return this.orgService.uploadDocumentFile(req.user.organizationId, file);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OrganizationAdmin')
  @Get('documents/file')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Stream a file - inline for viewing, attachment (default) for download' })
  async downloadDocument(
    @Query('url') url: string,
    @Query('name') name: string,
    @Query('inline') inline: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const content = await this.orgService.readDocumentFile(req.user.organizationId, url);
    const disposition = inline === 'true' ? 'inline' : 'attachment';
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(content.length),
      'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(name || 'document')}`,
    });
    res.send(content);
  }
}
