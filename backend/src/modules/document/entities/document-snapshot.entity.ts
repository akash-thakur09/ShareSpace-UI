import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Document } from './document.entity';

@Entity('document_snapshots')
export class DocumentSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'document_id' })
  @Index()
  documentId: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @Column({ name: 'yjs_state', type: 'bytea' })
  yjsState: Buffer;

  @Column({ type: 'int', default: 0 })
  version: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
