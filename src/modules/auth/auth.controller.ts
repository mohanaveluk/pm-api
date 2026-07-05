import { 
  Controller, 
  Post, 
  UseGuards, 
  Request, 
  UseInterceptors, 
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Body,
  Put,
  Get,
  HttpException,
  HttpStatus,
  Patch,
  Param,
  Req,
  HttpCode
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Constants } from 'src/shared/constants/constants';
import { ApiErrorDto } from 'src/shared/dto/api-error.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { maxFileSize } from 'src/shared/utils/file-validation.util';
import { Request as ExpRequest } from 'express';
import { AuthService } from './auth.service';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { UpdateProfileDto } from '../user/dto/update-profile.dto';
import { VerifyEmailDto } from '../user/dto/verify-email.dto';
import { UserResponseDto } from '../user/dto/user-response.dto';
import { ResponseDto } from 'src/common/dto/response.dto';
import { LoginDto } from './dto/login.dto';
import { ValidateOTCDto } from '../user/dto/validate-otc.dto';
import { MobileLoginDto } from './dto/mobile-login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendEmailDto, ResendOTCDto } from '../user/dto/resend-otc.dto';
import { UpdatePasswordOldDto } from '../user/dto/update-password.dto';
import { RequestPasswordResetDto } from '../user/dto/request-password-reset.dto';
import { ResetPasswordDto } from '../user/dto/reset-password.dto';
import { User } from '../user/entity/user.entity';
import { UpdateUserDto } from '../user/dto/update-user.dto';
import { ToggleUserStatusDto } from '../user/dto/toggle-user-status.dto';
import { ForgotPasswordDto, UpdatePasswordDto, VerifyResetCodeDto } from './dto/forgot-password.dto';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OrganizationAdmin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  //@ApiResponse({ status: 400, description: 'Bad request - validation error or email exists' })
  @ApiResponse({
    status: 401,
    description: Constants.AUTH.UN_AUTHORIZED,
    type: ApiErrorDto,
  })
  @ApiResponse({
    status: 400,
    description: Constants.SWAGGER.BAD_REQUEST,
    type: ApiErrorDto,
  })
  @ApiResponse({
    status: 406,
    description: Constants.SWAGGER.NOT_ACCEPT,
    type: ApiErrorDto,
  })
  @ApiResponse({
    status: 500,
    description: Constants.SWAGGER.INTERNAL_SERVER_ERROR,
    type: ApiErrorDto,
  })
  async register(@Body() registerDto: RegisterDto, @Req() req: ExpRequest) : Promise<ResponseDto<any>> {
    try {
      const domain = `${req.get('origin')}`; 
      const result = await this.authService.register(registerDto, domain);
      return new ResponseDto(true, 'User registered successfully', result.detail, null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new HttpException(
        new ResponseDto(false, message, null, `Failed to register user - ${message}`),
        HttpStatus.BAD_REQUEST,
      );
    }    
  }


  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error or email exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.uguid, updateProfileDto);
  }


  @Public()
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired verification code' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto): Promise<ResponseDto<any>> { 
      const result = await this.authService.verifyEmail(verifyEmailDto);
      if(result.message === 'Email already verified') {
        return new ResponseDto(true, result.message, null, null);
      }
      return new ResponseDto(true, 'Email verified successfully', result, null);
  }


  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  async getAllUsers(): Promise<ResponseDto<UserResponseDto[]>> {
    try {
      const users = await this.authService.getAllUsers();
      return new ResponseDto(true, 'Users retrieved successfully', users);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        new ResponseDto(false, 'Failed to retrieve categories', null, errorMessage),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  @Public()
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT token' })
  @ApiResponse({
    status: 401,
    description: Constants.AUTH.UN_AUTHORIZED,
    type: ApiErrorDto,
  })
  @ApiResponse({
    status: 400,
    description: Constants.SWAGGER.BAD_REQUEST,
    type: ApiErrorDto,
  })
  @ApiResponse({
    status: 406,
    description: Constants.SWAGGER.NOT_ACCEPT,
    type: ApiErrorDto,
  })
  @ApiResponse({
    status: 500,
    description: Constants.SWAGGER.INTERNAL_SERVER_ERROR,
    type: ApiErrorDto,
  })
  async login(@Body() loginDto: LoginDto, @Req() req: ExpRequest) : Promise<ResponseDto<any>> {
    //return await this.authService.login(loginDto, req);
    try {
      const result = await this.authService.login(loginDto, req);
      return new ResponseDto(true, 'Login successful', result, null);
    } catch (error) {
      throw error;
      // throw new HttpException(
      //   new ResponseDto(false, error.message, null, error.message),
      //   HttpStatus.UNAUTHORIZED,
      // );
    }    
  }


  @Post('mobile/login')
  @ApiOperation({ summary: 'Login with mobile number' })
  @ApiResponse({ status: 200, description: 'OTC sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - mobile number not registered' })
  async loginWithMobile(@Body() mobileLoginDto: MobileLoginDto) {
    return this.authService.loginWithMobile(mobileLoginDto);
  }

  @Post('mobile/validate')
  @ApiOperation({ summary: 'Validate OTC and login' })
  @ApiResponse({ status: 200, description: 'OTC validated successfully, returns JWT token' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid or expired OTC' })
  async validateOTC(@Body() validateOTCDto: ValidateOTCDto) {
    return this.authService.validateOTC(validateOTCDto);
  }

  @Post('mobile/send-otc')
  @ApiOperation({ summary: 'Send OTC to mobile number' })
  @ApiResponse({ status: 200, description: 'OTC sent successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  async sendMobileOTC(@Request() req) {
    return this.authService.sendMobileOTC(req.user.mobile);
  }


  @Post('resendotc')
  @ApiOperation({ summary: 'Send OTC to mobile number' })
  @ApiResponse({ status: 200, description: 'OTC sent successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  async resendVerificationCode(@Body() resendOTCDto: ResendOTCDto) {
    return this.authService.resendVerificationCode(resendOTCDto);
  }

  @Post('resend-verification-mail')
  @ApiOperation({ summary: 'Send verification email' })
  @ApiResponse({ status: 200, description: 'Verification email sent successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  async resendVerificationMail(@Body() resendEmailDto: ResendEmailDto, @Req() req: ExpRequest) {
    const domain = `${req.get('origin')}`; 
    return this.authService.resendVerificationMail(resendEmailDto, domain);
  }

  
  @Post('update-password_old')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user password' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid credentials' })
  updatePassword_old(@Request() req, @Body() updatePasswordDto: UpdatePasswordOldDto) {
    return this.authService.updatePassword_old(req.user.uguid, updatePasswordDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  logout(@Request() req) {
    return this.authService.logout(req.user.id, req.user.uguid);
  }
  

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user information' })
  @ApiResponse({ status: 200, description: 'User information retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(FileInterceptor('file'))
  async userProfile(
    @Request() req: any,
  ) {
    return this.authService.getUserInfo(req.user.uguid);
  }


  @Post('profile/image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Upload profile image' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfileImage(
    @Request() req,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: maxFileSize }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.authService.uploadProfileImage(req.user.uguid, file);
  }

  @Post('password-reset/request')
  @Public()
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid email' })
  async requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(requestPasswordResetDto.email);
  }

  @Post('password-reset/reset')
  @Public()
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  // @Get('permissions')
  // @ApiBearerAuth('JWT-auth')
  // @UseGuards(JwtAuthGuard)
  // @ApiOperation({ summary: 'Get user permissions' })
  // @ApiResponse({ status: 200, description: 'Permission retrieved successfully' })
  // @ApiResponse({ status: 400, description: 'Bad request - invalid or expired token' })
  // async getUserPermissions(@Request() req): Promise<Permission[]> {
  //   return this.authService.getUserPermissions(req.user.uguid);
  // }

  // ── POST /auth/forgot-password ──────────────────────────────────────────
  // Step 1: User submits their email.
  // Backend generates a 6-digit OTP, stores it with a 5-minute TTL,
  // and sends it to the user's inbox.
  // Always returns 200 regardless of whether the email exists
  // (prevents user enumeration attacks).
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If this email is registered, a reset code has been sent.' };
  }
 
  // ── POST /auth/verify-reset-code ────────────────────────────────────────
  // Step 2: User submits the 6-digit OTP received by email.
  // Returns a short-lived resetToken if the code is valid.
  // The frontend stores this token and passes it in step 3.
  @Post('verify-reset-code')
  @HttpCode(HttpStatus.OK)
  async verifyResetCode(
    @Body() dto: VerifyResetCodeDto,
  ): Promise<{ data: { resetToken: string } }> {
    const resetToken = await this.authService.verifyResetCode(dto.email, dto.code);
    return { data: { resetToken } };
  }
 
  // ── POST /auth/update-password ──────────────────────────────────────────
  // Step 3: User submits email + resetToken + new password.
  // Backend validates the token, hashes the new password,
  // updates the user record, and invalidates the token.
  @Post('update-password')
  @HttpCode(HttpStatus.OK)
  async updatePassword(
    @Body() dto: UpdatePasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.updatePassword(
      dto.email,
      dto.resetToken,
      dto.password,
    );
    return { message: 'Password updated successfully.' };
  }


  @Get("roles")
  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns all roles',
    type: [User]
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error' 
  })
  async getRoles() {
    return this.authService.findAllRoles();
  }

  
  @Get("users")
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns all users',
    type: [User]
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error' 
  })
  async getUsers() {
    return this.authService.findAllUsers();
  }

  @Put(':uguid')
  @ApiOperation({ summary: 'Update user details' })
  @ApiResponse({ 
    status: 200, 
    description: 'User updated successfully',
    type: User
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid input' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found' 
  })
  async updateUser(
    @Param('uguid') uguid: string,
    @Body() updateUserDto: UpdateUserDto
  ) {
    return this.authService.updateUser(uguid, updateUserDto);
  }

  @Patch(':uguid/status')
  @ApiOperation({ summary: 'Toggle user active status' })
  @ApiResponse({ 
    status: 200, 
    description: 'User status updated successfully',
    type: User
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found' 
  })
  async toggleUserStatus(
    @Param('uguid') uguid: string,
    @Body() toggleStatusDto: ToggleUserStatusDto
  ) {
    return this.authService.toggleStatus(uguid, toggleStatusDto.isActive);
  }
}