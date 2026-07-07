'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Document, ShareEntry, getDocument, updateDocument } from '@/lib/api';
import { RichEditor } from '@/components/RichEditor';
import { ShareModal } from '@/components/ShareModal';
import { UploadModal } from '@/components/UploadModal';
import { Toast } from '@/components/Toast';

type SaveStatus = 'saved' | 'saving' | 'unsaved';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

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
  const [toast, setToast] = useState<ToastState | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef('');
  const lastSavedTitle = useRef('');

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ message, type });
  };

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
        showToast('Could not load document — access denied or not found', 'error');
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
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!doc) return null;

  return (
    <div className="editor-layout">
      {/* Top navbar */}
      <header className="editor-navbar">
        <button
          className="editor-navbar-back"
          onClick={() => router.push('/dashboard')}
          title="Back to dashboard"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Docs
        </button>

        <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', flexShrink: 0 }} />

        <input
          id="document-title-input"
          className="editor-title-input"
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

        <div className="editor-navbar-right">
          {/* Save status */}
          <div className={`save-status ${saveStatus === 'saved' ? 'saved' : saveStatus === 'saving' ? 'saving' : ''}`}>
            {saveStatus === 'saved' && (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Saved
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <div style={{ width: 10, height: 10, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Saving...
              </>
            )}
            {saveStatus === 'unsaved' && 'Unsaved changes'}
          </div>

          {/* Role badge */}
          {isReadOnly && (
            <span className="badge badge-read" style={{ fontSize: 11 }}>👁 View only</span>
          )}

          {/* Owner info for shared docs */}
          {!doc.isOwner && doc.owner && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="avatar" style={{ width: 28, height: 28, fontSize: 10 }} title={doc.owner.email}>
                {getInitials(doc.owner.name)}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doc.owner.name}&apos;s doc</span>
            </div>
          )}

          {/* Upload (for import into this doc context — owner only) */}
          {doc.isOwner && (
            <button
              id="import-file-btn"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowUpload(true)}
              title="Import file"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 16 12 12 8 16"/>
                <line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
              Import
            </button>
          )}

          {/* Share (owner only) */}
          {doc.isOwner && (
            <button
              id="share-btn"
              className="btn btn-primary btn-sm"
              onClick={() => setShowShare(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Share
              {shares.length > 0 && (
                <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '99px', padding: '0 6px', fontSize: 11 }}>
                  {shares.length}
                </span>
              )}
            </button>
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
          onSuccess={(msg) => showToast(msg)}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={(msg) => showToast(msg)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
