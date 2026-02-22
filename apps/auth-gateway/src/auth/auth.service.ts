import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { RedisTokenService } from './redis-token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisTokenService: RedisTokenService,
    private readonly configService: ConfigService,
  ) {}

  private getAccessTtl(): string {
    return this.configService.get<string>('JWT_ACCESS_TTL', '15m');
  }

  private getRefreshTtl(): string {
    return this.configService.get<string>('JWT_REFRESH_TTL', '7d');
  }

  private ttlToSeconds(ttl: string, fallbackSeconds: number): number {
    const match = ttl.trim().match(/^(\d+)([smhd])$/i);
    if (!match) return fallbackSeconds;
    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 24 * 60 * 60,
    };
    return value * multipliers[unit];
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) return null;
    const match = await bcrypt.compare(password, user.passwordHash);
    return match ? user : null;
  }

  private claimsFor(user: User) {
    const roles = Array.from(new Set(Object.values(user.teamRoles ?? {})));
    const teams = Object.keys(user.teamRoles ?? {});
    return { sub: user.id, email: user.email, roles, teams, teamRoles: user.teamRoles ?? {} };
  }

  async issueTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const claims = this.claimsFor(user);
    const refreshJti = uuidv4();
    const accessTtl = this.getAccessTtl();
    const refreshTtl = this.getRefreshTtl();
    const accessTtlSeconds = this.ttlToSeconds(accessTtl, 15 * 60);
    const refreshTtlSeconds = this.ttlToSeconds(refreshTtl, 7 * 24 * 60 * 60);

    const accessToken = await this.jwtService.signAsync(claims, { expiresIn: accessTtlSeconds });
    const refreshToken = await this.jwtService.signAsync(
      { ...claims, jti: refreshJti, typ: 'refresh' },
      { expiresIn: refreshTtlSeconds },
    );

    await this.redisTokenService.storeRefreshToken(user.id, refreshJti, refreshTtlSeconds);
    await this.usersService.updateLastLogin(user.id);

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = await this.jwtService.verifyAsync<{ sub: string; jti: string; typ: string }>(
      refreshToken,
    );
    if (payload.typ !== 'refresh') throw new UnauthorizedException('Invalid token type');

    const valid = await this.redisTokenService.hasRefreshToken(payload.sub, payload.jti);
    if (!valid) throw new UnauthorizedException('Refresh token invalidated');

    await this.redisTokenService.invalidateRefreshToken(payload.sub, payload.jti);
    const user = await this.usersService.findById(payload.sub);
    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    const payload = await this.jwtService.verifyAsync<{ sub: string; jti: string }>(refreshToken);
    await this.redisTokenService.invalidateRefreshToken(payload.sub, payload.jti);
  }

  async oauthLogin(email: string, displayName: string) {
    let user = await this.usersService.findByEmail(email);
    if (!user) {
      user = await this.usersService.create({ email, displayName, password: uuidv4() });
    }
    return this.issueTokens(user);
  }
}
