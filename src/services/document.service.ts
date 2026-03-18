const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface Document {
  publicId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface CreateDocumentDto {
  title?: string;
  metadata?: Record<string, any>;
}

export const documentService = {
  async create(dto: CreateDocumentDto = {}): Promise<Document> {
    const response = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create document');
    }
    
    return response.json();
  },

  async get(publicId: string): Promise<Document> {
    const response = await fetch(`${API_URL}/documents/${publicId}`);
    
    if (!response.ok) {
      throw new Error('Document not found');
    }
    
    return response.json();
  },

  async update(publicId: string, dto: Partial<CreateDocumentDto>): Promise<Document> {
    const response = await fetch(`${API_URL}/documents/${publicId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update document');
    }
    
    return response.json();
  },

  async createSnapshot(publicId: string) {
    const response = await fetch(`${API_URL}/documents/${publicId}/snapshots`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to create snapshot');
    }
    
    return response.json();
  },

  async getSnapshots(publicId: string) {
    const response = await fetch(`${API_URL}/documents/${publicId}/snapshots`);
    
    if (!response.ok) {
      throw new Error('Failed to get snapshots');
    }
    
    return response.json();
  },
};
