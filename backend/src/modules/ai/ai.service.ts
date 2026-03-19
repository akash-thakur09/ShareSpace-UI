import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiChatDto } from './dto/ai-chat.dto';

const SYSTEM_PROMPTS: Record<string, string> = {
  improve:
    'You are a professional writing assistant. Improve the clarity, flow, and professionalism of the provided text. Return only the improved text, no explanations.',
  summarize:
    'You are a concise summarizer. Summarize the provided text in 2-4 sentences. Return only the summary.',
  grammar:
    'You are a grammar and spelling checker. Fix all grammar, spelling, and punctuation errors in the provided text. Return only the corrected text.',
  custom:
    'You are a helpful writing assistant. Follow the user\'s instructions precisely.',
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string | undefined;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.model  = this.configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini');
  }

  async chat(dto: AiChatDto): Promise<string> {
    // If no API key, return a mock response so the UI still works
    if (!this.apiKey) {
      this.logger.warn('OPENAI_API_KEY not set — returning mock AI response');
      return this.mockResponse(dto);
    }

    const systemPrompt = SYSTEM_PROMPTS[dto.action] ?? SYSTEM_PROMPTS.custom;
    const userMessage  = dto.action === 'custom'
      ? `${dto.prompt ?? 'Help me with this text'}\n\n${dto.content}`
      : dto.content;

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userMessage },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        this.logger.error({ status: res.status, err }, 'OpenAI API error');
        throw new ServiceUnavailableException('AI service temporarily unavailable');
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() ?? '';
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.error({ err }, 'Failed to call OpenAI');
      throw new ServiceUnavailableException('AI service temporarily unavailable');
    }
  }

  private mockResponse(dto: AiChatDto): string {
    switch (dto.action) {
      case 'improve':
        return `[AI Mock] Here is an improved version of your text:\n\n${dto.content}`;
      case 'summarize':
        return `[AI Mock] Summary: ${dto.content.slice(0, 120)}...`;
      case 'grammar':
        return `[AI Mock] Grammar checked: ${dto.content}`;
      default:
        return `[AI Mock] Response to "${dto.prompt}": ${dto.content.slice(0, 100)}`;
    }
  }
}
