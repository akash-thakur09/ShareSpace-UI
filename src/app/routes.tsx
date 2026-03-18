import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from 'react';
import App from "./App";
import { documentService } from '../services/document.service';

function Home() {
  const [loading, setLoading] = useState(true);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function createDocument() {
      try {
        const doc = await documentService.create({
          title: 'Untitled Document',
        });
        setDocumentId(doc.publicId);
      } catch (err) {
        console.error('Failed to create document:', err);
        setError('Failed to create document. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    }

    createDocument();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "rgb(249 250 251)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2" style={{ borderColor: "rgb(226 228 233)", borderTopColor: "rgb(99 102 241)" }} />
          <p className="text-sm" style={{ color: "rgb(107 114 128)" }}>Creating document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "rgb(249 250 251)" }}>
        <div className="flex flex-col items-center gap-3 text-center max-w-md px-6">
          <p style={{ color: "rgb(239 68 68)" }}>{error}</p>
          <p className="text-sm" style={{ color: "rgb(107 114 128)" }}>
            Make sure the backend is running on http://localhost:4000
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (documentId) {
    return <Navigate to={`/doc/${documentId}`} replace />;
  }

  return <div>Error creating document</div>;
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/doc/:documentId" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
}