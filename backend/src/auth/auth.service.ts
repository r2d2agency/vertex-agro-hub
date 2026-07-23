import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { jwtAccessTtl, jwtRefreshTtlSeconds, jwtSecret } from './auth.config';

export type GoogleProfile = {
  googleId: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private async signTokens(userId: string, email: string) {
    const access_token = await this.jwt.signAsync(
      { sub: userId, email },
      {
        secret: jwtSecret(),
        expiresIn: jwtAccessTtl(),
      },
    );
    const refreshRaw = crypto.randomBytes(48).toString('hex');
    const refreshHash = crypto
      .createHash('sha256')
      .update(refreshRaw)
      .digest('hex');
    const ttl = jwtRefreshTtlSeconds();
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: refreshHash,
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
    });
    return { access_token, refresh_token: refreshRaw };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash)
      throw new UnauthorizedException('Credenciais inválidas');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');
    return this.signTokens(user.id, user.email);
  }

  async loginWithGoogle(profile: GoogleProfile) {
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: profile.googleId }, { email: profile.email }],
      },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          googleId: profile.googleId,
          fullName: profile.fullName,
          avatarUrl: profile.avatarUrl,
        },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.googleId, avatarUrl: profile.avatarUrl },
      });
    }
    return this.signTokens(user.id, user.email);
  }

  async refresh(refreshToken: string) {
    const hash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash },
      include: { user: true },
    });
    if (!record || record.revokedAt || record.expiresAt < new Date())
      throw new UnauthorizedException('Refresh token inválido');
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    return this.signTokens(record.user.id, record.user.email);
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
    if (!user) throw new UnauthorizedException();
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
