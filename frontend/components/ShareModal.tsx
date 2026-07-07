'use client';

import React, { useState } from 'react';
import { shareDocument, revokeShare, ShareEntry } from '@/lib/api';

interface ShareModalProps {
  documentId: string;
  documentTitle: string;
  shares: ShareEntry[];
  onClose: () => void;
  onSharesUpdated: (shares: ShareEntry[]) => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function ShareModal({
  documentId,
  documentTitle,
  shares,
  onClose,
  onSharesUpdated,
  onSuccess,
  onError,
}: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'read' | 'edit'>('edit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await shareDocument(documentId, email, role);
      // Update local shares list
      const existing = shares.findIndex((s) => s.user.email === email);
      let newShares: ShareEntry[];
      if (existing >= 0) {
        newShares = shares.map((s, i) => (i === existing ? result.share : s));
      } else {
        newShares = [...shares, result.share];
      }
      onSharesUpdated(newShares);
      onSuccess?.(result.message);
      setEmail('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to share';
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (targetUserId: string, name: string) => {
    try {
      await revokeShare(documentId, targetUserId);
      onSharesUpdated(shares.filter((s) => s.userId !== targetUserId));
      onSuccess?.(`Removed ${name}'s access`);
    } catch (err: unknown) {
      onError?.(err instanceof Error ? err.message : 'Failed to revoke');
    }
  };

  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Share document</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          &quot;{documentTitle}&quot;
        </p>

        <form onSubmit={handleShare} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input
            type="email"
            className="input"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ flex: 1 }}
          />
          <select
            className="share-role-select"
            value={role}
            onChange={(e) => setRole(e.target.value as 'read' | 'edit')}
            style={{ padding: '10px 8px', borderRadius: 'var(--radius-md)' }}
          >
            <option value="edit">Can edit</option>
            <option value="read">Can view</option>
          </select>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading} style={{ flexShrink: 0, padding: '10px 16px' }}>
            {loading ? '...' : 'Share'}
          </button>
        </form>

        {error && <p className="form-error" style={{ marginBottom: 12 }}>⚠ {error}</p>}

        {/* People with access */}
        {shares.length > 0 && (
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              People with access
            </p>
            <div className="share-user-list">
              {shares.map((s) => (
                <div key={s.userId} className="share-user-item">
                  <div className="avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                    {initials(s.user.name)}
                  </div>
                  <div className="share-user-info">
                    <p className="share-user-name">{s.user.name}</p>
                    <p className="share-user-email">{s.user.email}</p>
                  </div>
                  <span className={`badge badge-${s.role}`}>
                    {s.role === 'edit' ? '✎ Edit' : '👁 View'}
                  </span>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRevoke(s.userId, s.user.name)}
                    title="Revoke access"
                    style={{ padding: '4px 8px', fontSize: 11 }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {shares.length === 0 && (
          <p style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
            No one else has access yet. Share with someone above.
          </p>
        )}
      </div>
    </div>
  );
}
