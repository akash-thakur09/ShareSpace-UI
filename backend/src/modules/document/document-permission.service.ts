import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentPermission, DocumentRole, ROLE_HIERARCHY } from './entities/document-permission.entity';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class DocumentPermissionService {
  constructor(
    @InjectRepository(DocumentPermission)
    private readonly permRepo: Repository<DocumentPermission>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async grantRole(documentId: string, userId: string, role: DocumentRole): Promise<void> {
    const existing = await this.permRepo.findOne({ where: { documentId, userId } });
    if (existing) {
      existing.role = role;
      await this.permRepo.save(existing);
    } else {
      await this.permRepo.save(this.permRepo.create({ documentId, userId, role }));
    }
  }

  async revokeRole(documentId: string, userId: string): Promise<void> {
    await this.permRepo.delete({ documentId, userId });
  }

  async getPermission(documentId: string, userId: string): Promise<DocumentPermission | null> {
    return this.permRepo.findOne({ where: { documentId, userId } });
  }

  async canUserAccess(documentId: string, userId: string, requiredRole: DocumentRole): Promise<boolean> {
    const perm = await this.permRepo.findOne({ where: { documentId, userId } });
    if (!perm) return false;
    return ROLE_HIERARCHY[perm.role] >= ROLE_HIERARCHY[requiredRole];
  }

  async listPermissionsForUser(userId: string): Promise<DocumentPermission[]> {
    return this.permRepo.find({ where: { userId } });
  }

  async listPermissions(documentId: string): Promise<DocumentPermission[]> {
    return this.permRepo.find({
      where: { documentId },
      relations: ['user'],
    });
  }

  async togglePin(documentId: string, userId: string): Promise<boolean> {
    const perm = await this.permRepo.findOne({ where: { documentId, userId } });
    if (!perm) return false;
    perm.isPinned = !perm.isPinned;
    await this.permRepo.save(perm);
    return perm.isPinned;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findUserById(userId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id: userId } });
  }
}
