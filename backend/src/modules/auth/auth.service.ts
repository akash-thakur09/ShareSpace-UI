import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 12;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  tokens: TokenPair;
  user: { id: string; email: string; name: string | null };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.userRepo.create({ email: dto.email, password: passwordHash, name: dto.name ?? null });

    try {
      await this.userRepo.save(user);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).code === '23505') {
        throw new ConflictException('Email already in use');
      }
      throw err;
    }

    const tokens = await this.issueTokens(user);
    return { tokens, user: { id: user.id, email: user.email, name: user.name } };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'name', 'password', 'tokenVersion'],
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.issueTokens(user);
    return { tokens, user: { id: user.id, email: user.email, name: user.name } };
  }

  async refresh(rawRefreshToken: string): Promise<AuthResult> {
    let payload: { sub: string; email: string; ver: number };

    try {
      payload = this.jwtService.verify(rawRefreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
      select: ['id', 'email', 'name', 'refreshTokenHash', 'tokenVersion'],
    });

    if (!user || !user.refreshTokenHash) throw new UnauthorizedException('Invalid refresh token');

    // Validate token version
    if (user.tokenVersion !== payload.ver) throw new UnauthorizedException('Token has been revoked');

    const tokenMatch = await bcrypt.compare(rawRefreshToken, user.refreshTokenHash);
    if (!tokenMatch) throw new UnauthorizedException('Invalid refresh token');

    const tokens = await this.issueTokens(user);
    return { tokens, user: { id: user.id, email: user.email, name: user.name } };
  }

  async logout(userId: string): Promise<void> {
    // Increment tokenVersion to invalidate all existing tokens, clear stored hash
    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({
        refreshTokenHash: null,
        tokenVersion: () => 'token_version + 1',
      })
      .where('id = :id', { id: userId })
      .execute();
  }

  async getMe(userId: string): Promise<Omit<User, 'password' | 'refreshTokenHash'>> {
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    return user;
  }

  private async issueTokens(user: User): Promise<TokenPair> {
    const payload = { sub: user.id, email: user.email, ver: user.tokenVersion };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.userRepo.update(user.id, { refreshTokenHash });

    return { accessToken, refreshToken };
  }
}
