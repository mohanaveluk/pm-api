import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { UserProjectMapping } from './entities/user-project-mapping.entity';
import { UNRESTRICTED_PROJECT_ROLES, UserProjectMappingStatus } from './enums/user-project-mapping.enums';

/** Who is asking to see projects (from the JWT). */
export interface ProjectViewer {
  userId: string;
  email?: string | null;
  role?: string | null;
}

/**
 * Which projects a user may see. Organization and super administrators see
 * all of them; anyone else sees a project when they are actively mapped to it,
 * manage it, or created it.
 *
 * This decides visibility only — roles and permissions still decide what the
 * user may do. Applied on the server to every project read, so hiding a project
 * in the browser is never the only guard.
 */
@Injectable()
export class UserProjectAccessService {
  constructor(
    @InjectRepository(UserProjectMapping) private readonly repo: Repository<UserProjectMapping>,
  ) {}

  /** No viewer (internal calls) or an administrator: no restriction. */
  isUnrestricted(viewer?: ProjectViewer | null): boolean {
    return !viewer || UNRESTRICTED_PROJECT_ROLES.includes(viewer.role ?? '');
  }

  /** Limits a query on projects (aliased `alias`) to the ones the viewer may see. */
  scope<T>(qb: SelectQueryBuilder<T>, alias: string, viewer?: ProjectViewer | null): SelectQueryBuilder<T> {
    if (this.isUnrestricted(viewer)) return qb;
    return qb.andWhere(new Brackets((w) => {
      w.where(`${alias}.projectManagerId = :viewerId`);
      if (viewer!.email) w.orWhere(`${alias}.createdBy = :viewerEmail`);
      w.orWhere(
        `EXISTS (SELECT 1 FROM user_project_mappings upm_scope
          WHERE upm_scope.projectId = ${alias}.id AND upm_scope.userId = :viewerId
            AND upm_scope.status = :viewerMappingActive AND upm_scope.is_deleted = 0)`,
      );
    }), {
      viewerId: viewer!.userId,
      viewerEmail: viewer!.email ?? '',
      viewerMappingActive: UserProjectMappingStatus.ACTIVE,
    });
  }

  /** Whether the viewer may see this project. */
  async canSee(
    organizationId: string,
    project: { id: string; projectManagerId?: string | null; createdBy?: string | null },
    viewer?: ProjectViewer | null,
  ): Promise<boolean> {
    if (this.isUnrestricted(viewer)) return true;
    if (project.projectManagerId && project.projectManagerId === viewer!.userId) return true;
    if (viewer!.email && project.createdBy && project.createdBy.toLowerCase() === viewer!.email.toLowerCase()) return true;
    return (await this.repo.count({
      where: {
        organizationId, projectId: project.id, userId: viewer!.userId,
        status: UserProjectMappingStatus.ACTIVE, isDeleted: false,
      },
    })) > 0;
  }

  /** A project the viewer may not see is reported as not found, so its existence is not disclosed. */
  async assertCanSee(
    organizationId: string,
    project: { id: string; projectManagerId?: string | null; createdBy?: string | null },
    viewer?: ProjectViewer | null,
    message = 'Project not found',
  ): Promise<void> {
    if (!(await this.canSee(organizationId, project, viewer))) throw new NotFoundException(message);
  }
}
