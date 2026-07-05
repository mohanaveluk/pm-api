// src/auth/entities/password-reset-token.entity.ts

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // The email this reset belongs to — indexed for fast lookups
  @Index()
  @Column({ type: 'varchar', length: 255 })
  email: string;

  // Bcrypt hash of the 6-digit OTP — never store plaintext
  @Column({ type: 'varchar', length: 255 })
  otpHash: string;

  // Short-lived UUID set after OTP is verified (step 2 → step 3)
  // Null until the OTP has been verified
  @Column({ type: 'varchar', length: 255, nullable: true })
  resetToken: string | null;

  // Token / OTP expiry — checked on every verification
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  // Marks the token as consumed after a successful password update
  // Prevents replay attacks
  @Column({ type: 'boolean', default: false })
  used: boolean;

  @CreateDateColumn()
  createdAt: Date;
}