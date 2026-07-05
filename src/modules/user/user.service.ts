/*
https://docs.nestjs.com/providers#services
*/

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRepository } from './user.repository';
import { User } from './entity/user.entity';
import { RoleEntity } from './entity/roles.entity';

@Injectable()
export class UserService {
    constructor(
        private readonly userRepository: UserRepository,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(RoleEntity)
        private readonly roleRepo: Repository<RoleEntity>,
    ){}

    async validateAccount(uniqueId) {
        try {
            const userResponse = await this.userRepository.validateAccount(uniqueId);
            if (userResponse === 'success') {
                return userResponse;
            }
            else {
                throw new NotFoundException('User not found');
            }

        } catch (error) {
            throw new NotFoundException('Failed to get user');
        }
    }

    async getOrganizationUsers(organizationId: string, requestingUser: any) {
        const allowedRoles = ['SuperAdmin', 'OrganizationAdmin', 'Manager'];
        if (!allowedRoles.includes(requestingUser.role)) {
            throw new ForbiddenException('Access denied');
        }

        // SuperAdmin can query any org; others only their own
        if (requestingUser.role !== 'SuperAdmin' && requestingUser.organizationId !== organizationId) {
            throw new ForbiddenException('Access denied to this organization');
        }

        const users = await this.userRepo.find({
            where: { organizationId, is_deleted: false },
            relations: ['role'],
            order: { created_at: 'DESC' },
        });

        return users.map(u => this.mapUserToResponse(u));
    }

    async getOrganizationUserById(organizationId: string, userId: string, requestingUser: any) {
        if (requestingUser.role !== 'SuperAdmin' && requestingUser.organizationId !== organizationId) {
            throw new ForbiddenException('Access denied to this organization');
        }

        const user = await this.userRepo.findOne({
            where: { id: userId, organizationId, is_deleted: false },
            relations: ['role'],
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return this.mapUserToResponse(user);
    }

    private mapUserToResponse(u: User) {
        return {
            id: u.id,
            uguid: u.uguid,
            first_name: u.first_name,
            last_name: u.last_name,
            email: u.email,
            mobile: u.mobile,
            dob: u.dob,
            position: u.position,
            location: u.location,
            report_to: u.report_to,
            worksWith: u.worksWith,
            projectName: u.projectName,
            projectsWorkedOn: u.projectsWorkedOn,
            profile_image: u.profile_image,
            is_active: u.is_active,
            is_email_verified: u.is_email_verified,
            organizationId: u.organizationId,
            role: u.role ? { id: u.role.id, guid: u.role.guid, name: u.role.name } : null,
            created_at: u.created_at,
            last_login: u.last_login,
            last_active: u.last_active,
            address_line1: u.address_line1,
            address_line2: u.address_line2,
            city: u.city,
            state: u.state,
            postal_code: u.postal_code,
            country: u.country,
            gender: (u as any).gender ?? null,
        };
    }
}
