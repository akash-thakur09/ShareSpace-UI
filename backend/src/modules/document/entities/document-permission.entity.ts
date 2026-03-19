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
  COMMENTER = 'commenter',
  VIEWER = 'viewer',
}

// Role hierarchy — higher index = more access
export const ROLE_HIERARCHY: Record<DocumentRole, number> = {
  [DocumentRole.VIEWER]: 0,
  [DocumentRole.COMMENTER]: 1,
  [DocumentRole.EDITOR]: 2,
  [DocumentRole.OWNER]: 3,
};

@Entity('document_permissions')
@Unique(['documentId', 'userId'])
@Index(['documentId', 'userId'])
export class DocumentPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id' })
  documentId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: DocumentRole })
  role: DocumentRole;

  @Column({ name: 'is_pinned', type: 'boolean', default: false })
  isPinned: boolean;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
