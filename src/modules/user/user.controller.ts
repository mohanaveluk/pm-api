/*
https://docs.nestjs.com/controllers#controllers
*/

import { Controller, Get, HttpException, HttpStatus, Param, UseInterceptors, UseGuards, Request } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { UserService } from './user.service';
import { ResponseDto } from 'src/common/dto/response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('User')
@UseInterceptors(AuditInterceptor)
@ApiTags('user')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Get('validate/:unique_id')
    @ApiOperation({ summary: 'Validate User Account' })
    @ApiResponse({ status: 200, description: 'User account validated successfully.' })
    @ApiResponse({ status: 400, description: 'Validation failed.' })
    async validateUserAccount(@Param('unique_id') uniqueId: string): Promise<{ message: string }> {
        try {
            const result = await this.userService.validateAccount(uniqueId);
            return new ResponseDto(true, null, result);
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'An error occurred';
            throw new HttpException(message, HttpStatus.BAD_REQUEST);
        }
    }

    @Get('organization/:organizationId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SuperAdmin', 'OrganizationAdmin', 'Manager')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get all users for an organization' })
    @ApiResponse({ status: 200, description: 'List of organization users.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    async getOrganizationUsers(
        @Param('organizationId') organizationId: string,
        @Request() req,
    ) {
        try {
            const users = await this.userService.getOrganizationUsers(organizationId, req.user);
            return new ResponseDto(true, 'Users retrieved successfully', users);
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'An error occurred';
            throw new HttpException(new ResponseDto(false, message, null, message), error.status ?? HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('organization/:organizationId/:userId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get a single user detail within an organization' })
    @ApiResponse({ status: 200, description: 'User detail.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    async getOrganizationUserById(
        @Param('organizationId') organizationId: string,
        @Param('userId') userId: string,
        @Request() req,
    ) {
        try {
            const user = await this.userService.getOrganizationUserById(organizationId, userId, req.user);
            return new ResponseDto(true, 'User retrieved successfully', user);
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'An error occurred';
            throw new HttpException(new ResponseDto(false, message, null, message), error.status ?? HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
