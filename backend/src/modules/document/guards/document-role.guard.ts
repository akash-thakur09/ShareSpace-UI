import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentRole } from '../entities/document-permission.entity';
import { DocumentPermissionService } from '../document-permission.service';
import { Document } from '../entities/document.entity';

export const REQUIRED_ROLE_KEY = 'requiredDocumentRole';

@Injectable()
export class DocumentRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permService: DocumentPermissionService,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.get<DocumentRole>(
      REQUIRED_ROLE_KEY,
      context.getHandler(),
    );

    // No role requirement set — allow through
    if (!requiredRole) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new ForbiddenException('Authentication required');

    const publicId: string = request.params?.publicId;
    if (!publicId) throw new ForbiddenException('Document ID missing');

    // Resolve internal UUID from publicId
    const doc = await this.documentRepo.findOne({
      where: { publicId },
      select: ['id'],
    });
    if (!doc) throw new NotFoundException(`Document not found`);

    // Attach internal id to request so downstream handlers can reuse it
    request.documentId = doc.id;

    const allowed = await this.permService.canUserAccess(
      doc.id,
      user.id,
      requiredRole,
    );

    if (!allowed) throw new ForbiddenException('Insufficient permissions');

    return true;
  }
}
