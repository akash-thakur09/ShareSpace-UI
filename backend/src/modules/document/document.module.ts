import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { DocumentPermissionService } from './document-permission.service';
import { DocumentRoleGuard } from './guards/document-role.guard';
import { Document } from './entities/document.entity';
import { DocumentSnapshot } from './entities/document-snapshot.entity';
import { DocumentPermission } from './entities/document-permission.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentSnapshot, DocumentPermission, User]),
  ],
  controllers: [DocumentController],
  providers: [DocumentService, DocumentPermissionService, DocumentRoleGuard],
  exports: [DocumentService, DocumentPermissionService],
})
export class DocumentModule {}
