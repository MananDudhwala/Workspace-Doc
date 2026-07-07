'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Document, createDocument, deleteDocument, getDocuments } from '@/lib/api';
import { UploadModal } from '@/components/UploadModal';
import { Toast } from '@/components/Toast';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function stripHtml(html: string): string {
  if (typeof window === 'undefined') return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function DashboardPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [owned, setOwned] = useState<Document[]>([]);
  const [shared, setShared] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ message, type });
  };

  const fetchDocs = useCallback(async () => {
    try {
      const data = await getDocuments();
      setOwned(data.owned);
      setShared(data.shared);
    } catch {
      showToast('Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only redirect once auth state has fully resolved and user is confirmed absent
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Show spinner while auth is loading OR while we have a user but docs haven't loaded yet
  // This prevents the flash-redirect issue

  useEffect(() => {
    if (user) fetchDocs();
  }, [user, fetchDocs]);

  const handleNewDoc = async () => {
    try {
      const doc = await createDocument({ title: 'Untitled Document' });
      router.push(`/doc/${doc.id}`);
    } catch {
      showToast('Failed to create document', 'error');
    }
  };

  const handleDelete = async (e: React.MouseEvent, docId: string, title: string) => {
    e.stopPropagation();
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteDocument(docId);
      setOwned((prev) => prev.filter((d) => d.id !== docId));
      showToast('Document deleted');
    } catch {
      showToast('Failed to delete document', 'error');
    }
  };

  // Keep showing spinner while auth resolves — never render dashboard HTML with no user
  if (authLoading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Nav */}
      <nav className="dashboard-nav">
        <div className="dashboard-nav-logo">
          <div className="dashboard-nav-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="14,2 14,8 20,8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="16" y1="13" x2="8" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="16" y1="17" x2="8" y2="17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          WorkspaceDoc
        </div>

        <div className="dashboard-nav-spacer" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="avatar" title={user.email}>{getInitials(user.name)}</div>
          <div style={{ lineHeight: 1.3 }}>
            <p style={{ fontSize: 14, fontWeight: 600 }}>{user.name}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.email}</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={logout} style={{ marginLeft: 8 }}>
            Sign out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">My Documents</h1>
            <p className="dashboard-subtitle">
              {owned.length + shared.length} document{owned.length + shared.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="dashboard-actions">
            <button
              id="upload-btn"
              className="btn btn-ghost"
              onClick={() => setShowUpload(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 16 12 12 8 16"/>
                <line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
              Import file
            </button>
            <button
              id="new-doc-btn"
              className="btn btn-primary"
              onClick={handleNewDoc}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New document
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div className="spinner" />
          </div>
        ) : (
          <>
            {/* Owned docs */}
            <div>
              <p className="section-heading">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                My documents ({owned.length})
              </p>

              {owned.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="12" y1="18" x2="12" y2="12"/>
                      <line x1="9" y1="15" x2="15" y2="15"/>
                    </svg>
                  </div>
                  <h3>No documents yet</h3>
                  <p>Create your first document or import a file</p>
                </div>
              ) : (
                <div className="docs-grid" style={{ marginBottom: 48 }}>
                  {owned.map((doc) => (
                    <div
                      key={doc.id}
                      id={`doc-${doc.id}`}
                      className="card card-hover doc-card"
                      onClick={() => router.push(`/doc/${doc.id}`)}
                    >
                      <div className="doc-card-header">
                        <div className="doc-card-icon">
                          {doc.upload ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
                              <polyline points="16 16 12 12 8 16"/>
                              <line x1="12" y1="12" x2="12" y2="21"/>
                              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                            </svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span className="badge badge-owner">Owner</span>
                          {doc.shares && doc.shares.length > 0 && (
                            <span title={`Shared with ${doc.shares.length} person(s)`} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              👥 {doc.shares.length}
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="doc-card-title">{doc.title}</h3>
                      <p className="doc-card-preview">{stripHtml(doc.content) || 'Empty document'}</p>

                      <div className="doc-card-meta">
                        <span>Updated {formatDate(doc.updatedAt)}</span>
                        {doc.upload && (
                          <span style={{ color: 'var(--text-accent)' }}>
                            📎 {doc.upload.originalName}
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="doc-card-actions">
                        <button
                          className="doc-card-action-btn delete"
                          onClick={(e) => handleDelete(e, doc.id, doc.title)}
                          title="Delete document"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shared docs */}
            {shared.length > 0 && (
              <div>
                <p className="section-heading">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                  Shared with me ({shared.length})
                </p>

                <div className="docs-grid">
                  {shared.map((doc) => (
                    <div
                      key={doc.id}
                      id={`shared-doc-${doc.id}`}
                      className="card card-hover doc-card"
                      onClick={() => router.push(`/doc/${doc.id}`)}
                    >
                      <div className="doc-card-header">
                        <div className="doc-card-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                        </div>
                        <span className={`badge badge-${doc.sharedRole}`}>
                          {doc.sharedRole === 'edit' ? '✎ Can edit' : '👁 View only'}
                        </span>
                      </div>

                      <h3 className="doc-card-title">{doc.title}</h3>
                      <p className="doc-card-preview">{stripHtml(doc.content) || 'Empty document'}</p>

                      <div className="doc-card-meta">
                        <span>Updated {formatDate(doc.updatedAt)}</span>
                        {doc.sharedBy && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div className="avatar" style={{ width: 16, height: 16, fontSize: 8 }}>
                              {getInitials(doc.sharedBy.name)}
                            </div>
                            {doc.sharedBy.name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={(msg) => showToast(msg)}
        />
      )}

      {/* Toast */}
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
