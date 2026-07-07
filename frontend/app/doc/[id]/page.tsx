'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Document as DocType, ShareEntry, getDocument, updateDocument } from '@/lib/api';
import { RichEditor } from '@/components/RichEditor';
import { ShareModal } from '@/components/ShareModal';
import { UploadModal } from '@/components/UploadModal';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft, Check, Loader2, Upload, Share, Eye, Wifi, WifiOff,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

type SaveStatus = 'saved' | 'saving' | 'unsaved';

interface OnlineUser {
  id: string;
  name: string;
  email: string;
  initials: string;
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function avatarColor(id: string): string {
  if (!id) return 'bg-gray-500';
  const palette = [
    'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500', 'bg-indigo-500',
    'bg-teal-500', 'bg-pink-500',
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

const WS_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, 'ws') || 'ws://localhost:4000';

export default function EditorPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [doc, setDoc] = useState<DocType | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [showShare, setShowShare] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);

  const lastSavedTitle = useRef('');
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // We initialize the Yjs document and the provider
  const ydoc = useMemo(() => new Y.Doc(), []);
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [idbProvider, setIdbProvider] = useState<IndexeddbPersistence | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !id) return;

    let wasOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
    
    const handleOffline = () => {
      toast.error('You are offline. Changes are saved locally.');
      wasOffline = true;
    };

    const handleOnline = () => {
      if (wasOffline) {
        toast.success('Back online! Syncing changes...');
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    getDocument(id)
      .then((data) => {
        setDoc(data);
        setTitle(data.title);
        setShares(data.shares || []);
        lastSavedTitle.current = data.title;
        
        // Connect to Hocuspocus
        const token = localStorage.getItem('token');
        const hpProvider = new HocuspocusProvider({
          url: WS_URL,
          name: id,
          document: ydoc,
          token: token || undefined,
        });

        // Initialize offline persistence
        const indexeddbProvider = new IndexeddbPersistence(id, ydoc);
        setIdbProvider(indexeddbProvider);

        // Set our awareness data (our cursor info)
        hpProvider.setAwarenessField('user', {
          id: user.id,
          name: user.name,
          email: user.email,
          initials: getInitials(user.name),
          color: avatarColor(user.id),
        });

        hpProvider.on('status', ({ status }: { status: string }) => {
          setSocketConnected(status === 'connected');
        });

        hpProvider.on('awarenessUpdate', ({ states }: { states: any[] }) => {
          const users: OnlineUser[] = [];
          states.forEach(state => {
            if (state.user && state.user.id !== user.id) {
              users.push(state.user);
            }
          });
          // De-duplicate in case of multiple tabs
          const uniqueUsers = users.filter((u, i, self) => 
            i === self.findIndex(su => su.id === u.id)
          );
          setOnlineUsers(uniqueUsers);
        });
        
        hpProvider.on('synced', () => {
          setSaveStatus('saved');
          if (wasOffline) {
            toast.success('All offline changes have been synced to the server.');
            wasOffline = false;
          }
        });

        // Yjs Map for title sync
        const ymap = ydoc.getMap('metadata');
        
        // Only set the title from REST if the Yjs map is empty
        if (!ymap.has('title')) {
           ymap.set('title', data.title);
        } else {
           setTitle(ymap.get('title') as string);
        }

        ymap.observe(() => {
           const remoteTitle = ymap.get('title') as string;
           if (remoteTitle !== undefined && remoteTitle !== title) {
             setTitle(remoteTitle);
           }
        });

        setProvider(hpProvider);
      })
      .catch(() => {
        toast.error('Could not load document — access denied or not found');
        setTimeout(() => router.push('/dashboard'), 2000);
      })
      .finally(() => setLoading(false));

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      if (provider) {
        provider.destroy();
      }
      if (idbProvider) {
        idbProvider.destroy();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  const saveTitle = async (newTitle: string) => {
    if (newTitle === lastSavedTitle.current) return;
    try {
      setSaveStatus('saving');
      await updateDocument(id, { title: newTitle });
      lastSavedTitle.current = newTitle;
      setSaveStatus('saved');
    } catch {
      toast.error('Failed to save title');
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    
    // Sync via Yjs Map
    if (provider) {
       const ymap = ydoc.getMap('metadata');
       ymap.set('title', newTitle);
    }
    
    setSaveStatus('unsaved');
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      saveTitle(newTitle);
    }, 1500);
  };

  const canEdit = doc?.isOwner || doc?.userRole === 'edit';
  const isReadOnly = !canEdit;

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!doc || !provider || !user) return null;

  return (
    <div className="flex flex-col h-screen bg-secondary/30">
      <header className="flex items-center justify-between h-14 px-4 border-b bg-background sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            title="Back to dashboard"
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <ChevronLeft size={16} className="mr-1" />
            <span className="hidden sm:inline">Docs</span>
          </Button>

          <div className="w-[1px] h-5 bg-border flex-shrink-0" />

          <Input
            id="document-title-input"
            className="h-8 w-32 sm:w-64 border-transparent hover:border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus-visible:bg-secondary/50 bg-transparent font-semibold shadow-none"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onBlur={() => saveTitle(title)}
            placeholder="Untitled Document"
            disabled={isReadOnly}
            aria-label="Document title"
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {onlineUsers.length > 0 && (
            <div className="flex items-center" title={`Also viewing: ${onlineUsers.map((u) => u.name).join(', ')}`}>
              <div className="flex -space-x-2">
                {onlineUsers.slice(0, 4).map((u) => (
                  <div
                    key={u.id}
                    title={`${u.name} (${u.email})`}
                    className={`w-7 h-7 rounded-full ${avatarColor(u.id)} text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-background select-none cursor-default transition-all`}
                  >
                    {u.initials}
                  </div>
                ))}
                {onlineUsers.length > 4 && (
                  <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
                    +{onlineUsers.length - 4}
                  </div>
                )}
              </div>
            </div>
          )}

          <div title={socketConnected ? 'Live sync active' : 'Reconnecting…'} className={`flex-shrink-0 transition-colors ${socketConnected ? 'text-green-500' : 'text-muted-foreground/40'}`}>
            {socketConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {saveStatus === 'saved' && (
              <>
                <Check size={14} className="text-green-500" />
                <span className="text-foreground hidden sm:inline">Saved</span>
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <Loader2 size={14} className="animate-spin text-primary" />
                <span className="hidden sm:inline">Saving…</span>
              </>
            )}
            {saveStatus === 'unsaved' && (
              <span className="text-orange-500 hidden sm:inline">Unsaved</span>
            )}
          </div>

          {isReadOnly && (
            <span className="flex items-center gap-1 px-2 py-1 text-[11px] uppercase font-bold tracking-wider rounded bg-orange-500/10 text-orange-500 border border-orange-500/20">
              <Eye size={12} /> <span className="hidden sm:inline">View only</span>
            </span>
          )}

          {!doc.isOwner && doc.owner && (
            <div className="flex items-center gap-2 border-l pl-3 ml-1">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary text-[10px] font-bold" title={doc.owner.email}>
                {getInitials(doc.owner.name)}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline-block">
                {doc.owner.name}&apos;s doc
              </span>
            </div>
          )}

          {doc.isOwner && (
            <Button id="import-file-btn" variant="ghost" size="sm" onClick={() => setShowUpload(true)} title="Import file">
              <Upload size={16} className="sm:mr-2" />
              <span className="hidden sm:inline">Import</span>
            </Button>
          )}

          {doc.isOwner && (
            <Button id="share-btn" size="sm" onClick={() => setShowShare(true)}>
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

      <RichEditor
        provider={provider}
        ydoc={ydoc}
        user={{ 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          initials: getInitials(user.name), 
          color: avatarColor(user.id) 
        }}
        readonly={isReadOnly}
        placeholder="Start writing your document..."
      />

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
