'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadFile } from '@/lib/api';

interface UploadModalProps {
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

const ACCEPTED = ['.txt', '.md', '.docx'];

export function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFile = async (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      setError(`Unsupported file type: ${ext}. Only .txt, .md, and .docx are supported.`);
      return;
    }

    setError('');
    setUploading(true);

    try {
      const { message, document } = await uploadFile(file);
      onSuccess?.(message);
      onClose();
      router.push(`/doc/${document.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Import File</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
          Upload a file to create a new editable document. Your formatting will be preserved where possible.
        </p>

        <div
          className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-zone-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
              <polyline points="16 16 12 12 8 16"/>
              <line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
          </div>
          <h3>Drop your file here</h3>
          <p>or click to browse</p>
          <div className="supported-types">
            {ACCEPTED.map((ext) => (
              <span key={ext} className="type-chip">{ext}</span>
            ))}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />

        {uploading && (
          <div className="upload-progress">
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Processing file...
            </p>
            <div className="upload-progress-bar">
              <div className="upload-progress-fill" />
            </div>
          </div>
        )}

        {error && (
          <p className="form-error" style={{ marginTop: 12 }}>⚠ {error}</p>
        )}

        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16, textAlign: 'center' }}>
          Max file size: 10 MB · Supported: .txt, .md, .docx
        </p>
      </div>
    </div>
  );
}
