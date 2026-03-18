import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
