import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { customAlphabet } from 'nanoid';
import * as Y from 'yjs';
import { Document } from './entities/document.entity';
import { DocumentSnapshot } from './entities/document-snapshot.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentPermissionService } from './document-permission.service';
import { DocumentRole } from './entities/document-permission.entity';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 6);

export interface DocumentWithMeta extends Document {
  role: DocumentRole;
  isPinned: boolean;
}

export interface DocumentListResponse {
  owned: DocumentWithMeta[];
  shared: DocumentWithMeta[];
}

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(DocumentSnapshot)
    private snapshotRepository: Repository<DocumentSnapshot>,
    private readonly permissionService: DocumentPermissionService,
  ) {}

  async create(createDocumentDto: CreateDocumentDto, creatorId: string): Promise<Document> {
    const publicId = await this.generateUniquePublicId();

    const ydoc = new Y.Doc();
    const yjsState = Buffer.from(Y.encodeStateAsUpdate(ydoc));

    const document = this.documentRepository.create({
      publicId,
      title: createDocumentDto.title || 'Untitled Document',
      yjsState,
      metadata: createDocumentDto.metadata || {},
    });

    const saved = await this.documentRepository.save(document);
    this.logger.log(`Created document: ${publicId} (${saved.id})`);

    await this.permissionService.grantRole(saved.id, creatorId, DocumentRole.OWNER);

    return saved;
  }

  async listForUser(userId: string): Promise<DocumentListResponse> {
    const perms = await this.permissionService.listPermissionsForUser(userId);
    if (perms.length === 0) return { owned: [], shared: [] };

    const ids = perms.map((p) => p.documentId);
    const docs = await this.documentRepository.find({
      where: ids.map((id) => ({ id })),
      order: { updatedAt: 'DESC' },
    });

    const permMap = new Map(perms.map((p) => [p.documentId, p]));

    const owned: DocumentWithMeta[] = [];
    const shared: DocumentWithMeta[] = [];

    for (const doc of docs) {
      const perm = permMap.get(doc.id);
      if (!perm) continue;
      const entry: DocumentWithMeta = {
        ...doc,
        role: perm.role,
        isPinned: perm.isPinned,
      };
      if (perm.role === DocumentRole.OWNER) {
        owned.push(entry);
      } else {
        shared.push(entry);
      }
    }

    return { owned, shared };
  }

  async findByPublicId(publicId: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { publicId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${publicId} not found`);
    }

    await this.documentRepository.update(document.id, {
      lastAccessedAt: new Date(),
    });

    return document;
  }

  async findById(id: string): Promise<Document> {
    const document = await this.documentRepository.findOne({ where: { id } });
    if (!document) throw new NotFoundException(`Document not found`);
    return document;
  }

  async update(publicId: string, updateDocumentDto: UpdateDocumentDto): Promise<Document> {
    const document = await this.findByPublicId(publicId);

    if (updateDocumentDto.title !== undefined) {
      document.title = updateDocumentDto.title;
    }
    if (updateDocumentDto.metadata !== undefined) {
      document.metadata = { ...document.metadata, ...updateDocumentDto.metadata };
    }

    return this.documentRepository.save(document);
  }

  async saveYjsState(documentId: string, yjsState: Buffer): Promise<void> {
    await this.documentRepository.update(documentId, {
      yjsState,
      updatedAt: new Date(),
    });
    this.logger.debug(`Saved Yjs state for document: ${documentId}`);
  }

  async createSnapshot(documentId: string): Promise<DocumentSnapshot> {
    const document = await this.findById(documentId);
    if (!document.yjsState) throw new Error('Cannot create snapshot: document has no Yjs state');

    const latestSnapshot = await this.snapshotRepository.findOne({
      where: { documentId },
      order: { version: 'DESC' },
    });
    const version = latestSnapshot ? latestSnapshot.version + 1 : 1;

    const snapshot = this.snapshotRepository.create({
      documentId,
      yjsState: document.yjsState,
      version,
      metadata: { title: document.title, createdBy: 'system' },
    });

    const saved = await this.snapshotRepository.save(snapshot);
    this.logger.log(`Created snapshot v${version} for document: ${document.publicId}`);
    return saved;
  }

  async getSnapshots(publicId: string): Promise<DocumentSnapshot[]> {
    const document = await this.findByPublicId(publicId);
    return this.snapshotRepository.find({
      where: { documentId: document.id },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async restoreSnapshot(publicId: string, snapshotId: string): Promise<Document> {
    const document = await this.findByPublicId(publicId);
    const snapshot = await this.snapshotRepository.findOne({
      where: { id: snapshotId, documentId: document.id },
    });
    if (!snapshot) throw new NotFoundException('Snapshot not found');

    document.yjsState = snapshot.yjsState;
    const restored = await this.documentRepository.save(document);
    this.logger.log(`Restored snapshot ${snapshotId} for document: ${publicId}`);
    return restored;
  }

  async deleteByPublicId(publicId: string): Promise<void> {
    const document = await this.findByPublicId(publicId);
    await this.documentRepository.remove(document);
    this.logger.log(`Deleted document: ${publicId}`);
  }

  async canUserAccess(
    documentId: string,
    userId: string,
    requiredRole: DocumentRole,
  ): Promise<boolean> {
    return this.permissionService.canUserAccess(documentId, userId, requiredRole);
  }

  private async generateUniquePublicId(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const publicId = nanoid();
      const existing = await this.documentRepository.findOne({ where: { publicId } });
      if (!existing) return publicId;
    }
    throw new Error('Failed to generate unique public ID');
  }
}
