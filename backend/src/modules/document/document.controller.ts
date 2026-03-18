import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDocumentDto: CreateDocumentDto) {
    const document = await this.documentService.create(createDocumentDto);
    return {
      publicId: document.publicId,
      title: document.title,
      createdAt: document.createdAt,
      metadata: document.metadata,
    };
  }

  @Get(':publicId')
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

  @Put(':publicId')
  async update(
    @Param('publicId') publicId: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    const document = await this.documentService.update(
      publicId,
      updateDocumentDto,
    );
    return {
      publicId: document.publicId,
      title: document.title,
      updatedAt: document.updatedAt,
      metadata: document.metadata,
    };
  }

  @Post(':publicId/snapshots')
  @HttpCode(HttpStatus.CREATED)
  async createSnapshot(@Param('publicId') publicId: string) {
    const document = await this.documentService.findByPublicId(publicId);
    const snapshot = await this.documentService.createSnapshot(document.id);
    return {
      id: snapshot.id,
      version: snapshot.version,
      createdAt: snapshot.createdAt,
    };
  }

  @Get(':publicId/snapshots')
  async getSnapshots(@Param('publicId') publicId: string) {
    const snapshots = await this.documentService.getSnapshots(publicId);
    return snapshots.map((s) => ({
      id: s.id,
      version: s.version,
      createdAt: s.createdAt,
      metadata: s.metadata,
    }));
  }

  @Post(':publicId/snapshots/:snapshotId/restore')
  @HttpCode(HttpStatus.OK)
  async restoreSnapshot(
    @Param('publicId') publicId: string,
    @Param('snapshotId') snapshotId: string,
  ) {
    const document = await this.documentService.restoreSnapshot(
      publicId,
      snapshotId,
    );
    return {
      publicId: document.publicId,
      title: document.title,
      updatedAt: document.updatedAt,
    };
  }
}
