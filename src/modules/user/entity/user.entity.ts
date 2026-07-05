import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn, ManyToMany, JoinTable, Index } from 'typeorm';
import { PasswordArchive } from './password-archive.entity';
import { RoleEntity } from './roles.entity';
import { UserLoginHistory } from 'src/modules/auth/entity/user-login-history.entity';
import { RefreshToken } from './refresh-token.entity';
import { Organization } from 'src/modules/organization/entity/organization.entity';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  first_name: string;

  @Column({nullable: true})
  last_name: string;

  @Column({ unique: true })
  email: string;

  @Column({nullable: false})
  password: string;

  @Column({nullable: true})
  mobile: string;

  @Column({nullable: true})
  dob: string;

  @Column({nullable: true})
  position: string;

  @Column({nullable: true})
  location: string;

  @Column({nullable: true})
  report_to: string;

  @Column({nullable: true, name: 'works_with'})
  worksWith: string;

  @Column({nullable: true, name: 'project_name'})
  projectName: string;

  @Column({nullable: true, name: 'projects_worked_on'})
  projectsWorkedOn: string;
  
  @Column({ default: false })
  is_email_verified: boolean;

  @Column({ nullable: true })
  verification_code: string;

  @Column({ nullable: true })
  verification_code_expiry: Date;
  
  @Column({ type: 'datetime' })
  created_at: Date
  
  @Column({ type: 'datetime', nullable: true })
  updated_at: Date
  
  @Column({ default: '1' })
  is_active: number
  
  @Index({ unique: true })
  @Column({nullable: false})
  uguid: string

  @ManyToOne(() => RoleEntity, role => role.users)
  @JoinColumn({ name: 'role_id' })
  role: RoleEntity;

  @Column({ nullable: true })
  role_id: string;

  @Column({ nullable: true })
  role_guid: string;

  @Column({ nullable: true })
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.users, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ nullable: true })
  profile_image: string;

  @Column({ default: false, name: 'is_deleted' })
  is_deleted: boolean;

  @Column({ nullable: true })
  last_login: Date;

  @Column({ nullable: true })
  last_active: Date;

  @Column({ length: 255, nullable: true })
  address_line1: string;

  @Column({ length: 255, nullable: true })
  address_line2: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 100, nullable: true })
  state: string;

  @Column({ length: 20, nullable: true })
  postal_code: string;

  @Column({ length: 100, nullable: true })
  country: string;

  @OneToMany(() => PasswordArchive, passwordArchive => passwordArchive.user)
  password_history: PasswordArchive[];

  @OneToMany(() => RefreshToken, refreshToken => refreshToken.user)
  refresh_tokens: RefreshToken[];

  @OneToMany(() => UserLoginHistory, userLoginHistory => userLoginHistory.user)
  login_history: UserLoginHistory[];

  @OneToMany(() => Projects, project => project.user)
  projects: Projects[];

  @OneToMany(() => Manager, manager => manager.user)
  managers: Manager[];

  @OneToMany(() => Position, position => position.user)
  positions: Position[];

}

@Entity('position')
export class Position{

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, user => user.positions)
  @JoinColumn({ name: 'userId' })
  user: User;

}

@Entity('manager')
export class Manager  {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  first_name: string;

  @Column({nullable: true})
  last_name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, user => user.managers)
  @JoinColumn({ name: 'userId' })
  user: User;

}

@Entity('projects')
export class Projects{

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  start_at: string;

  @Column({ nullable: true })
  end_at: string;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, user => user.projects)
  @JoinColumn({ name: 'userId' })
  user: User;

}
