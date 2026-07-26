import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { Organization } from '../../organization/entity/organization.entity';
import { Department } from '../../department/entity/department.entity';
import { Discipline } from '../../discipline/entity/discipline.entity';

@Entity('department_discipline_mapping')
@Unique(['organizationId', 'departmentId', 'disciplineId'])
@Index(['organizationId'])
@Index(['departmentId'])
@Index(['disciplineId'])
@Index(['isActive'])
export class DepartmentDiscipline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  @Column({ nullable: false })
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ nullable: false })
  departmentId: string;

  @ManyToOne(() => Department, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'departmentId' })
  department: Department;

  @Column({ nullable: false })
  disciplineId: string;

  @ManyToOne(() => Discipline, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'disciplineId' })
  discipline: Discipline;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false, name: 'is_deleted' })
  isDeleted: boolean;

  @Column({ nullable: true })
  deletedAt: Date;

  @Column({ length: 255, nullable: true })
  deletedBy: string;

  @Column({ length: 255, nullable: true })
  createdBy: string;

  @Column({ length: 255, nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
