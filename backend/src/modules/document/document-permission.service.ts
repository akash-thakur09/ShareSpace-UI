import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DocumentPermission,
  DocumentRole,
  ROLE_HIERARCHY,
} from './entities/document-permission.entity';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class DocumentPermissionService {
  constructor(
    @InjectRepository(DocumentPermission)
    private readonly permRepo: Repository<DocumentPermission>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /** Grant a role to a user on a document. Upserts if a record already exists. */
  async grantRole(
    documentId: string,
    userId: string,
    role: DocumentRole,
  ): Promise<void> {
    await this.permRepo
      .createQueryBuilder()
      .insert()
      .into(DocumentPermission)
      .values({ documentId, userId, role })
      .orUpdate(['role'], ['document_id', 'user_id'])
      .execute();
  }

  /**
   * Returns true when the user holds a role that satisfies the required minimum.
   * e.g. requiredRole=VIEWER is satisfied by VIEWER, EDITOR, or OWNER.
   */
  async canUserAccess(
    documentId: string,
    userId: string,
    requiredRole: DocumentRole,
  ): Promise<boolean> {
    const perm = await this.permRepo.findOne({
      where: { documentId, userId },
      select: ['role'],
    });

    if (!perm) return false;

    return ROLE_HIERARCHY[perm.role] >= ROLE_HIERARCHY[requiredRole];
  }

  /** Fetch the user's permission record for a document (null if none). */
  async getPermission(
    documentId: string,
    userId: string,
  ): Promise<DocumentPermission | null> {
    return this.permRepo.findOne({ where: { documentId, userId } });
  }

  /** List all permissions for a document (useful for sharing UI). */
  async listPermissions(documentId: string): Promise<DocumentPermission[]> {
    return this.permRepo.find({
      where: { documentId },
      relations: ['user'],
    });
  }

  async revokeRole(documentId: string, userId: string): Promise<void> {
    await this.permRepo.delete({ documentId, userId });
  }

  /** List all document IDs accessible by a user. */
  async listDocumentIdsForUser(userId: string): Promise<string[]> {
    const perms = await this.permRepo.find({
      where: { userId },
      select: ['documentId'],
    });
    return perms.map((p) => p.documentId);
  }

  /** Find a user by email (used when granting permissions by email). */
  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }
}
