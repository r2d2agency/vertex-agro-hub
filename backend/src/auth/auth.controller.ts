import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refresh_token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Req() req: Request & { user: { sub: string } }) {
    return this.auth.logoutAll(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request & { user: { sub: string } }) {
    return this.auth.me(req.user.sub);
  }

  // ---------- Google OAuth ----------
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    /* redirect handled by passport */
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request & { user: any },
    @Res() res: Response,
  ) {
    const tokens = await this.auth.loginWithGoogle(req.user);
    const url = new URL(
      '/auth/callback',
      process.env.FRONTEND_URL ?? 'http://localhost:3000',
    );
    url.searchParams.set('access_token', tokens.access_token);
    url.searchParams.set('refresh_token', tokens.refresh_token);
    res.redirect(url.toString());
  }
}
