import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateDocumentDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
