import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { AiChatDto } from './dto/ai-chat.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /** POST /ai/chat — improve writing, summarize, fix grammar */
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: AiChatDto) {
    const result = await this.aiService.chat(dto);
    return { reply: result };
  }
}
