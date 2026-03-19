import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentPermissionService } from './document-permission.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentRoleGuard } from './guards/document-role.guard';
import { RequireDocumentRole } from './decorators/require-document-role.decorator';
import { DocumentRole } from './entities/document-permission.entity';
import { User } from '../auth/entities/user.entity';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly permissionService: DocumentPermissionService,
  ) {}

  /** POST /documents — authenticated user becomes owner */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDocumentDto: CreateDocumentDto,
    @Request() req: { user: User },
  ) {
    const document = await this.documentService.create(createDocumentDto, req.user.id);
    return {
      publicId: document.publicId,
      title: document.title,
      createdAt: document.createdAt,
      metadata: document.metadata,
    };
  }

  /** GET /documents — returns { owned, shared } */
  @Get()
  async list(@Request() req: { user: User }) {
    const { owned, shared } = await this.documentService.listForUser(req.user.id);
    const mapDoc = (d: any) => ({
      publicId: d.publicId,
      title: d.title,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      metadata: d.metadata,
      role: d.role,
      isPinned: d.isPinned,
    });
    return {
      owned: owned.map(mapDoc),
      shared: shared.map(mapDoc),
    };
  }

  /** GET /documents/:publicId — viewer+ */
  @Get(':publicId')
  @RequireDocumentRole(DocumentRole.VIEWER)
  @UseGuards(DocumentRoleGuard)
  async findOne(
    @Param('publicId') publicId: string,
    @Request() req: { user: User },
  ) {
    const document = await this.documentService.findByPublicId(publicId);
    const perm = await this.permissionService.getPermission(document.id, req.user.id);
    return {
      publicId: document.publicId,
      title: document.title,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      lastAccessedAt: document.lastAccessedAt,
      metadata: document.metadata,
      role: perm?.role ?? null,
    };
  }

  /** PUT /documents/:publicId — editor+ */
  @Put(':publicId')
  @RequireDocumentRole(DocumentRole.EDITOR)
  @UseGuards(DocumentRoleGuard)
  async update(
    @Param('publicId') publicId: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    const document = await this.documentService.update(publicId, updateDocumentDto);
    return {
      publicId: document.publicId,
      title: document.title,
      updatedAt: document.updatedAt,
      metadata: document.metadata,
    };
  }

  /** DELETE /documents/:publicId — owner only */
  @Delete(':publicId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireDocumentRole(DocumentRole.OWNER)
  @UseGuards(DocumentRoleGuard)
  async remove(@Param('publicId') publicId: string) {
    await this.documentService.deleteByPublicId(publicId);
  }

  // ── Pin ────────────────────────────────────────────────────────────────────

  /** POST /documents/:publicId/pin — viewer+ */
  @Post(':publicId/pin')
  @HttpCode(HttpStatus.OK)
  @RequireDocumentRole(DocumentRole.VIEWER)
  @UseGuards(DocumentRoleGuard)
  async togglePin(
    @Param('publicId') publicId: string,
    @Request() req: { user: User },
  ) {
    const document = await this.documentService.findByPublicId(publicId);
    const isPinned = await this.permissionService.togglePin(document.id, req.user.id);
    return { isPinned };
  }

  // ── Permissions ────────────────────────────────────────────────────────────

  /** GET /documents/:publicId/permissions — viewer+ (write ops remain owner-only) */
  @Get(':publicId/permissions')
  @RequireDocumentRole(DocumentRole.VIEWER)
  @UseGuards(DocumentRoleGuard)
  async listPermissions(@Param('publicId') publicId: string) {
    const document = await this.documentService.findByPublicId(publicId);
    const perms = await this.permissionService.listPermissions(document.id);
    return perms.map((p) => ({
      userId: p.userId,
      email: p.user?.email,
      name: p.user?.name ?? undefined,
      role: p.role,
    }));
  }

  /** POST /documents/:publicId/permissions — owner only, grant role by email */
  @Post(':publicId/permissions')
  @HttpCode(HttpStatus.CREATED)
  @RequireDocumentRole(DocumentRole.OWNER)
  @UseGuards(DocumentRoleGuard)
  async addPermission(
    @Param('publicId') publicId: string,
    @Body() body: { email: string; role: DocumentRole },
  ) {
    const document = await this.documentService.findByPublicId(publicId);
    const user = await this.permissionService.findUserByEmail(body.email);
    if (!user) throw new NotFoundException(`User with email ${body.email} not found`);
    await this.permissionService.grantRole(document.id, user.id, body.role);
    return { userId: user.id, email: user.email, name: user.name ?? undefined, role: body.role };
  }

  /** PUT /documents/:publicId/permissions/:userId — owner only, update role */
  @Put(':publicId/permissions/:userId')
  @RequireDocumentRole(DocumentRole.OWNER)
  @UseGuards(DocumentRoleGuard)
  async updatePermission(
    @Param('publicId') publicId: string,
    @Param('userId') userId: string,
    @Body() body: { role: DocumentRole },
  ) {
    const document = await this.documentService.findByPublicId(publicId);
    await this.permissionService.grantRole(document.id, userId, body.role);
    const targetUser = await this.permissionService.findUserById(userId);
    return { userId, email: targetUser?.email, name: targetUser?.name ?? undefined, role: body.role };
  }

  /** DELETE /documents/:publicId/permissions/:userId — owner only, revoke */
  @Delete(':publicId/permissions/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireDocumentRole(DocumentRole.OWNER)
  @UseGuards(DocumentRoleGuard)
  async removePermission(
    @Param('publicId') publicId: string,
    @Param('userId') userId: string,
  ) {
    const document = await this.documentService.findByPublicId(publicId);
    await this.permissionService.revokeRole(document.id, userId);
  }

  // ── Snapshots ──────────────────────────────────────────────────────────────

  /** POST /documents/:publicId/snapshots — editor+ */
  @Post(':publicId/snapshots')
  @HttpCode(HttpStatus.CREATED)
  @RequireDocumentRole(DocumentRole.EDITOR)
  @UseGuards(DocumentRoleGuard)
  async createSnapshot(@Param('publicId') publicId: string) {
    const document = await this.documentService.findByPublicId(publicId);
    const snapshot = await this.documentService.createSnapshot(document.id);
    return { id: snapshot.id, version: snapshot.version, createdAt: snapshot.createdAt };
  }

  /** GET /documents/:publicId/snapshots — viewer+ */
  @Get(':publicId/snapshots')
  @RequireDocumentRole(DocumentRole.VIEWER)
  @UseGuards(DocumentRoleGuard)
  async getSnapshots(@Param('publicId') publicId: string) {
    const snapshots = await this.documentService.getSnapshots(publicId);
    return snapshots.map((s) => ({
      id: s.id,
      version: s.version,
      createdAt: s.createdAt,
      metadata: s.metadata,
    }));
  }

  /** POST /documents/:publicId/snapshots/:snapshotId/restore — editor+ */
  @Post(':publicId/snapshots/:snapshotId/restore')
  @HttpCode(HttpStatus.OK)
  @RequireDocumentRole(DocumentRole.EDITOR)
  @UseGuards(DocumentRoleGuard)
  async restoreSnapshot(
    @Param('publicId') publicId: string,
    @Param('snapshotId') snapshotId: string,
  ) {
    const document = await this.documentService.restoreSnapshot(publicId, snapshotId);
    return {
      publicId: document.publicId,
      title: document.title,
      updatedAt: document.updatedAt,
    };
  }
}
