'use client';

import React, { useState } from 'react';
import { shareDocument, revokeShare, ShareEntry } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Trash2, Eye, Pencil, Users } from 'lucide-react';

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
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
          <DialogDescription className="truncate pr-8" title={documentTitle}>
            "{documentTitle}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleShare} className="flex gap-2 items-center">
          <Input
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1"
          />
          <Select value={role} onValueChange={(val: 'read' | 'edit' | null) => { if (val) setRole(val); }}>
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="edit">Can edit</SelectItem>
              <SelectItem value="read">Can view</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Share'}
          </Button>
        </form>

        {error && <p className="text-sm font-medium text-destructive mt-1">⚠ {error}</p>}

        {/* People with access */}
        <div className="mt-4 border-t pt-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Users size={14} /> People with access
          </h4>
          
          {shares.length > 0 ? (
            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
              {shares.map((s) => (
                <div key={s.userId} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(s.user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                      <p className="text-sm font-medium truncate">{s.user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-2">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full border flex-shrink-0 ${
                      s.role === 'edit' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                    }`}>
                      {s.role === 'edit' ? (
                        <span className="flex items-center gap-1"><Pencil size={10} /> Edit</span>
                      ) : (
                        <span className="flex items-center gap-1"><Eye size={10} /> View</span>
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRevoke(s.userId, s.user.name)}
                      title="Revoke access"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6 bg-muted/20 rounded-lg border border-dashed border-border/50">
              No one else has access yet. Share with someone above.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
