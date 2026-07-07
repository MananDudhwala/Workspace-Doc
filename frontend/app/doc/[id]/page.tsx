'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Document, ShareEntry, getDocument, updateDocument } from '@/lib/api';
import { RichEditor } from '@/components/RichEditor';
import { ShareModal } from '@/components/ShareModal';
import { UploadModal } from '@/components/UploadModal';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  ChevronLeft, Check, Loader2, Upload, Share, Eye
} from 'lucide-react';
import { Input } from '@/components/ui/input';

type SaveStatus = 'saved' | 'saving' | 'unsaved';

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function EditorPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [showShare, setShowShare] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef('');
  const lastSavedTitle = useRef('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Load document
  useEffect(() => {
    if (!user || !id) return;

    getDocument(id)
      .then((data) => {
        setDoc(data);
        setTitle(data.title);
        setContent(data.content);
        setShares(data.shares || []);
        lastSavedContent.current = data.content;
        lastSavedTitle.current = data.title;
      })
      .catch(() => {
        toast.error('Could not load document — access denied or not found');
        setTimeout(() => router.push('/dashboard'), 2000);
      })
      .finally(() => setLoading(false));
  }, [user, id, router]);

  const saveDocument = useCallback(async (newTitle: string, newContent: string) => {
    if (!doc) return;
    if (newTitle === lastSavedTitle.current && newContent === lastSavedContent.current) return;

    setSaveStatus('saving');
    try {
      await updateDocument(id, { title: newTitle, content: newContent });
      lastSavedContent.current = newContent;
      lastSavedTitle.current = newTitle;
      setSaveStatus('saved');
    } catch (err: unknown) {
      setSaveStatus('unsaved');
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    }
  }, [doc, id]);

  // Auto-save content with debounce
  const handleContentChange = useCallback((html: string) => {
    setContent(html);
    setSaveStatus('unsaved');

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDocument(title, html);
    }, 1500);
  }, [saveDocument, title]);

  // Auto-save title on blur
  const handleTitleBlur = () => {
    if (title !== lastSavedTitle.current) {
      saveDocument(title, content);
    }
  };

  // Manual save with Ctrl/Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveDocument(title, content);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveDocument, title, content]);

  const canEdit = doc?.isOwner || doc?.userRole === 'edit';
  const isReadOnly = !canEdit;

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!doc) return null;

  return (
    <div className="flex flex-col h-screen bg-secondary/30">
      {/* Top navbar */}
      <header className="flex items-center justify-between h-14 px-4 border-b bg-background sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            title="Back to dashboard"
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={16} className="mr-1" />
            <span className="hidden sm:inline">Docs</span>
          </Button>

          <div className="w-[1px] h-5 bg-border flex-shrink-0" />

          <Input
            id="document-title-input"
            className="h-8 w-32 sm:w-64 border-transparent hover:border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus-visible:bg-secondary/50 bg-transparent font-semibold shadow-none"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSaveStatus('unsaved');
            }}
            onBlur={handleTitleBlur}
            placeholder="Untitled Document"
            disabled={isReadOnly}
            aria-label="Document title"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Save status */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mr-2">
            {saveStatus === 'saved' && (
              <>
                <Check size={14} className="text-green-500" />
                <span className="text-foreground">Saved</span>
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <Loader2 size={14} className="animate-spin text-primary" />
                Saving...
              </>
            )}
            {saveStatus === 'unsaved' && (
              <span className="text-orange-500">Unsaved changes</span>
            )}
          </div>

          {/* Role badge */}
          {isReadOnly && (
            <span className="flex items-center gap-1 px-2 py-1 text-[11px] uppercase font-bold tracking-wider rounded bg-orange-500/10 text-orange-500 border border-orange-500/20">
              <Eye size={12} /> <span className="hidden sm:inline">View only</span>
            </span>
          )}

          {/* Owner info for shared docs */}
          {!doc.isOwner && doc.owner && (
            <div className="flex items-center gap-2 border-l pl-3 ml-1">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary text-[10px] font-bold" title={doc.owner.email}>
                {getInitials(doc.owner.name)}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline-block">{doc.owner.name}&apos;s doc</span>
            </div>
          )}

          {/* Upload (for import into this doc context — owner only) */}
          {doc.isOwner && (
            <Button
              id="import-file-btn"
              variant="ghost"
              size="sm"
              onClick={() => setShowUpload(true)}
              title="Import file"
            >
              <Upload size={16} className="sm:mr-2" />
              <span className="hidden sm:inline">Import</span>
            </Button>
          )}

          {/* Share (owner only) */}
          {doc.isOwner && (
            <Button
              id="share-btn"
              size="sm"
              onClick={() => setShowShare(true)}
            >
              <Share size={14} className="sm:mr-2" />
              <span className="hidden sm:inline">Share</span>
              {shares.length > 0 && (
                <span className="ml-1.5 bg-primary-foreground/20 text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                  {shares.length}
                </span>
              )}
            </Button>
          )}
        </div>
      </header>

      {/* Rich text editor */}
      <RichEditor
        content={content}
        onChange={canEdit ? handleContentChange : undefined}
        readonly={isReadOnly}
        placeholder="Start writing your document..."
      />

      {/* Modals */}
      {showShare && (
        <ShareModal
          documentId={id}
          documentTitle={title}
          shares={shares}
          onClose={() => setShowShare(false)}
          onSharesUpdated={setShares}
          onSuccess={(msg) => toast.success(msg)}
          onError={(msg) => toast.error(msg)}
        />
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={(msg) => toast.success(msg)}
        />
      )}
    </div>
  );
}
