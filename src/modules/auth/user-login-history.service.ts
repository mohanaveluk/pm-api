import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserLoginHistory } from './entity/user-login-history.entity';

@Injectable()
export class UserLoginHistoryService {
  constructor(
    @InjectRepository(UserLoginHistory)
    private loginHistoryRepository: Repository<UserLoginHistory>
  ) {}

  async recordLogin(userId: string, userGuid: string, loginTime: Date, ipAddress: string, userAgent: string): Promise<UserLoginHistory> {
    const loginRecord = this.loginHistoryRepository.create({
      userId,
      userGuid,
      loginTime: loginTime,
      ipAddress,
      userAgent,
      deviceType: this.getDeviceType(userAgent)
    });

    return await this.loginHistoryRepository.save(loginRecord);
  }

  async recordLogout(userId: string): Promise<void> {
    // Find the most recent login record without a logout time
    const lastLoginRecord = await this.loginHistoryRepository.findOne({
      where: {
        userId,
        logoutTime: null
      },
      order: {
        loginTime: 'DESC'
      }
    });

    if (lastLoginRecord) {
      lastLoginRecord.logoutTime = new Date();
      await this.loginHistoryRepository.save(lastLoginRecord);
    }
  }

  async getUserLoginHistory(userId: string): Promise<UserLoginHistory[]> {
    return await this.loginHistoryRepository.find({
      where: { userId },
      order: { loginTime: 'DESC' }
    });
  }

  getDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
    const ua = userAgent.toLowerCase();

    // Check for tablets first as they may also match mobile patterns
    if (
      /ipad|tablet|playbook|silk/.test(ua) ||
      (/android/.test(ua) && !/mobile/.test(ua))
    ) {
      return 'tablet';
    }

    // Check for mobile devices
    if (
      /mobile|iphone|ipod|android|blackberry|opera mini|opera mobi|webos|windows phone|iemobile/.test(ua)
    ) {
      return 'mobile';
    }

    // Default to desktop
    return 'desktop';
  }
}