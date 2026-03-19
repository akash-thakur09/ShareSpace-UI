import { IsString, IsIn, IsOptional, MaxLength } from 'class-validator';

export type AiAction = 'improve' | 'summarize' | 'grammar' | 'custom';

export class AiChatDto {
  @IsIn(['improve', 'summarize', 'grammar', 'custom'])
  action: AiAction;

  /** The document text or selected text to process */
  @IsString()
  @MaxLength(8000)
  content: string;

  /** Optional free-form prompt for 'custom' action */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  prompt?: string;
}
