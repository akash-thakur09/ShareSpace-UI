import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Document } from './document.entity';
import { User } from '../../auth/entities/user.entity';

export enum DocumentRole {
  OWNER = 'owner',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

// Role hierarchy — higher index = more access
export const ROLE_HIERARCHY: Record<DocumentRole, number> = {
  [DocumentRole.VIEWER]: 0,
  [DocumentRole.EDITOR]: 1,
  [DocumentRole.OWNER]: 2,
};

@Entity('document_permissions')
@Unique(['documentId', 'userId'])
@Index(['documentId', 'userId']) // fast lookup per document+user
export class DocumentPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id' })
  documentId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: DocumentRole })
  role: DocumentRole;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
