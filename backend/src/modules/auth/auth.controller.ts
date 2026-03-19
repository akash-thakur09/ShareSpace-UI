import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Response,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from './entities/user.entity';

const REFRESH_COOKIE = 'refresh_token';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/auth',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 10 requests per minute per IP for register
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const tokens = await this.authService.register(dto);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, cookieOptions);
    return { accessToken: tokens.accessToken };
  }

  // 10 requests per minute per IP for login
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const tokens = await this.authService.login(dto);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, cookieOptions);
    return { accessToken: tokens.accessToken };
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Request() req: ExpressRequest,
    @Body() dto: RefreshTokenDto,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    // Accept token from httpOnly cookie first, fall back to body
    const rawToken = (req.cookies?.[REFRESH_COOKIE] as string | undefined) ?? dto.refreshToken;
    const tokens = await this.authService.refresh(rawToken);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, cookieOptions);
    return { accessToken: tokens.accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @Request() req: { user: User },
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    await this.authService.logout(req.user.id);
    res.clearCookie(REFRESH_COOKIE, { ...cookieOptions, maxAge: 0 });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req: { user: User }) {
    return this.authService.getMe(req.user.id);
  }
}
