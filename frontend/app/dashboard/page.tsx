'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Document, createDocument, deleteDocument, getDocuments } from '@/lib/api';
import { UploadModal } from '@/components/UploadModal';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  FileText, Upload, Plus, Trash2, Users, File, Eye, Pencil, LogOut, Loader2
} from 'lucide-react';

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
  if (!html) return '';
  if (typeof window === 'undefined') return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}
console.log("dumy")

export default function DashboardPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [owned, setOwned] = useState<Document[]>([]);
  const [shared, setShared] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const fetchDocs = useCallback(async () => {
    try {
      const data = await getDocuments();
      setOwned(data.owned);
      setShared(data.shared);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) fetchDocs();
  }, [user, fetchDocs]);

  const handleNewDoc = async () => {
    try {
      const doc = await createDocument({ title: 'Untitled Document' });
      router.push(`/doc/${doc.id}`);
    } catch {
      toast.error('Failed to create document');
    }
  };

  const handleDelete = async (e: React.MouseEvent, docId: string, title: string) => {
    e.stopPropagation();
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteDocument(docId);
      setOwned((prev) => prev.filter((d) => d.id !== docId));
      toast.success('Document deleted');
    } catch {
      toast.error('Failed to delete document');
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-10 flex items-center justify-between h-16 px-6 border-b bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2 font-bold text-lg">
          <div className="flex items-center justify-center w-8 h-8 bg-primary rounded text-primary-foreground">
            <FileText size={18} />
          </div>
          WorkspaceDoc
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
              {getInitials(user.name)}
            </div>
            <div className="hidden md:block leading-tight">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut size={16} className="mr-2" />
            Sign out
          </Button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-6 md:p-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Documents</h1>
            <p className="text-muted-foreground mt-1">
              {owned.length + shared.length} document{owned.length + shared.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button variant="outline" onClick={() => setShowUpload(true)} className="flex-1 md:flex-none">
              <Upload size={16} className="mr-2" />
              Import file
            </Button>
            <Button onClick={handleNewDoc} className="flex-1 md:flex-none">
              <Plus size={16} className="mr-2" />
              New document
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-12">
            {/* Owned docs */}
            <div>
              <div className="flex items-center gap-2 mb-6 text-lg font-semibold border-b pb-2">
                <File size={20} className="text-primary" />
                My documents ({owned.length})
              </div>

              {owned.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed rounded-xl bg-card text-card-foreground text-center">
                  <FileText size={48} className="text-muted-foreground mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No documents yet</h3>
                  <p className="text-muted-foreground mb-6">Create your first document or import a file to get started.</p>
                  <Button onClick={handleNewDoc}>
                    <Plus size={16} className="mr-2" />
                    New document
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {owned.map((doc) => (
                    <Card
                      key={doc.id}
                      id={`doc-${doc.id}`}
                      className="group cursor-pointer hover:border-primary/50 hover:shadow-md transition-all flex flex-col relative"
                      onClick={() => router.push(`/doc/${doc.id}`)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                            {doc.upload ? <Upload size={20} /> : <FileText size={20} />}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                              Owner
                            </span>
                            {doc.shares && doc.shares.length > 0 && (
                              <span title={`Shared with ${doc.shares.length} person(s)`} className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users size={12} /> {doc.shares.length}
                              </span>
                            )}
                          </div>
                        </div>
                        <CardTitle className="text-lg line-clamp-1">{doc.title}</CardTitle>
                      </CardHeader>
                      {/* <CardContent className="flex-1">
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {stripHtml(doc.content) || 'Empty document'}
                        </p>
                      </CardContent> */}
                      <CardFooter className="pt-4 border-t text-xs text-muted-foreground flex justify-between items-center bg-muted/20 rounded-b-xl">
                        <span>Updated {formatDate(doc.updatedAt)}</span>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10 absolute right-4 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDelete(e, doc.id, doc.title)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Shared docs */}
            {shared.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-6 text-lg font-semibold border-b pb-2">
                  <Users size={20} className="text-accent-foreground" />
                  Shared with me ({shared.length})
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {shared.map((doc) => (
                    <Card
                      key={doc.id}
                      id={`shared-doc-${doc.id}`}
                      className="group cursor-pointer hover:border-primary/50 hover:shadow-md transition-all flex flex-col"
                      onClick={() => router.push(`/doc/${doc.id}`)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 mb-3">
                            <FileText size={20} />
                          </div>
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full border ${doc.sharedRole === 'edit' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                            {doc.sharedRole === 'edit' ? (
                              <span className="flex items-center gap-1"><Pencil size={10} /> Edit</span>
                            ) : (
                              <span className="flex items-center gap-1"><Eye size={10} /> View</span>
                            )}
                          </span>
                        </div>
                        <CardTitle className="text-lg line-clamp-1">{doc.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {stripHtml(doc.content) || 'Empty document'}
                        </p>
                      </CardContent>
                      <CardFooter className="pt-4 border-t text-xs text-muted-foreground flex justify-between items-center bg-muted/20 rounded-b-xl">
                        <span>Updated {formatDate(doc.updatedAt)}</span>
                        {doc.sharedBy && (
                          <div className="flex items-center gap-1.5" title={`Shared by ${doc.sharedBy.name}`}>
                            <div className="w-4 h-4 rounded-full bg-primary/20 text-[8px] flex items-center justify-center text-primary font-bold">
                              {getInitials(doc.sharedBy.name)}
                            </div>
                            <span className="truncate max-w-[80px]">{doc.sharedBy.name}</span>
                          </div>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={(msg) => toast.success(msg)}
        />
      )}
    </div>
  );
}
