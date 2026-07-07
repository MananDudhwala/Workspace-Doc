'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadFile } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UploadCloud, File, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

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
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import File</DialogTitle>
          <DialogDescription>
            Upload a file to create a new editable document. Your formatting will be preserved where possible.
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "flex flex-col items-center justify-center p-8 mt-4 border-2 border-dashed rounded-xl transition-colors cursor-pointer",
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50",
            uploading && "opacity-50 pointer-events-none"
          )}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
            <UploadCloud size={24} />
          </div>
          <h3 className="text-lg font-semibold mb-1">Drop your file here</h3>
          <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
          
          <div className="flex gap-2">
            {ACCEPTED.map((ext) => (
              <span key={ext} className="px-2 py-1 text-xs font-medium rounded-md bg-secondary text-secondary-foreground border border-border">
                {ext}
              </span>
            ))}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          onChange={handleInputChange}
          className="hidden"
        />

        {uploading && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Processing file...</span>
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary w-2/3 animate-pulse rounded-full" />
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4 py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2 text-sm">{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="mt-4 sm:justify-center">
          <p className="text-xs text-muted-foreground text-center">
            Max file size: 10 MB &middot; Supported: .txt, .md, .docx
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
