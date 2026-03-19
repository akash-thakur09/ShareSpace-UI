import { SetMetadata } from '@nestjs/common';
import { DocumentRole } from '../entities/document-permission.entity';
import { REQUIRED_ROLE_KEY } from '../guards/document-role.guard';

export const RequireDocumentRole = (role: DocumentRole) =>
  SetMetadata(REQUIRED_ROLE_KEY, role);
