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
} from '@nestjs/common';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentRoleGuard } from './guards/document-role.guard';
import { RequireDocumentRole } from './decorators/require-document-role.decorator';
import { DocumentRole } from './entities/document-permission.entity';
import { User } from '../auth/entities/user.entity';

@Controller('documents')
@UseGuards(JwtAuthGuard) // all document routes require authentication
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

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

  /** GET /documents/:publicId — viewer+ */
  @Get(':publicId')
  @RequireDocumentRole(DocumentRole.VIEWER)
  @UseGuards(DocumentRoleGuard)
  async findOne(@Param('publicId') publicId: string) {
    const document = await this.documentService.findByPublicId(publicId);
    return {
      publicId: document.publicId,
      title: document.title,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      lastAccessedAt: document.lastAccessedAt,
      metadata: document.metadata,
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

  /** POST /documents/:publicId/snapshots — editor+ */
  @Post(':publicId/snapshots')
  @HttpCode(HttpStatus.CREATED)
  @RequireDocumentRole(DocumentRole.EDITOR)
  @UseGuards(DocumentRoleGuard)
  async createSnapshot(@Param('publicId') publicId: string) {
    const document = await this.documentService.findByPublicId(publicId);
    const snapshot = await this.documentService.createSnapshot(document.id);
    return {
      id: snapshot.id,
      version: snapshot.version,
      createdAt: snapshot.createdAt,
    };
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
