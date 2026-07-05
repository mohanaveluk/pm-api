import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { RefreshToken } from '../user/entity/refresh-token.entity';
import { User } from '../user/entity/user.entity';
import { identity } from 'rxjs';


@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async generateTokens(user: User) {

    const payload = {
        sub: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.first_name + ' ' + user.last_name,
        organizationId: user.organizationId || null,
        role: user.role || null,
      };

    const accessToken = this.jwtService.sign(payload);
    /*const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m', // Access token expires in 15 minutes
    });*/

    const refreshToken = await this.createRefreshToken(user);

    return {
      access_token: accessToken,
      refresh_token: refreshToken.token,
      user: {
        id: user.uguid,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        avatar: user.profile_image,
        username: user.first_name + ' ' + user.last_name,
        identity: user.position || user.first_name + ' ' + user.last_name, // Use major or organisation_name as identity
        roleName: user.role?.name,
        role_id: user.role_guid,
        organizationId: user.organizationId
      } 
    };
  }

  private async createRefreshToken(user: User): Promise<RefreshToken> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Refresh token expires in 7 days

    const refreshToken = this.refreshTokenRepository.create({
      
      token,
      expiresAt,
      user,
      userId: user.id,
    });

    return this.refreshTokenRepository.save(refreshToken);
  }

  async refreshAccessToken(refreshToken: string) {
    const token = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, isRevoked: false },
      relations: ['user'],
    });

    if (!token) {
      throw new Error('Invalid refresh token');
    }

    if (new Date() > token.expiresAt) {
      throw new Error('Refresh token has expired');
    }

    const payload = { 
        sub: token.user.uguid, 
        email: token.user.email,
        firstName: token.user.first_name,
        lastName: token.user.last_name,
      };

    const newAccessToken = this.jwtService.sign(payload);
    /*const newAccessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });*/

    return {
      access_token: newAccessToken,
    };
  }

  async revokeRefreshToken(token: string) {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token },
    });

    if (refreshToken) {
      refreshToken.isRevoked = true;
      await this.refreshTokenRepository.save(refreshToken);
    }
  }

  async revokeAllUserRefreshTokens(userId: string) {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true }
    );
  }
}