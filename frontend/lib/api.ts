const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
}

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(email: string, name: string, password: string): Promise<{ token: string; user: User }> {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, name, password }),
  });
}

export async function getMe(): Promise<{ user: User }> {
  return request('/auth/me');
}

// ─── Documents ───────────────────────────────────────────────────────────────

export interface ShareEntry {
  userId: string;
  role: 'read' | 'edit';
  user: { id: string; name: string; email: string };
}

export interface Document {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  owner: { id: string; name: string; email: string };
  shares?: ShareEntry[];
  upload?: { originalName: string; filename: string } | null;
  isOwner?: boolean;
  userRole?: 'owner' | 'read' | 'edit';
  sharedRole?: string;
  sharedBy?: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export async function getDocuments(): Promise<{ owned: Document[]; shared: Document[] }> {
  return request('/documents');
}

export async function getDocument(id: string): Promise<Document> {
  return request(`/documents/${id}`);
}

export async function createDocument(data?: { title?: string; content?: string }): Promise<Document> {
  return request('/documents', {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
}

export async function updateDocument(id: string, data: { title?: string; content?: string }): Promise<Document> {
  return request(`/documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteDocument(id: string): Promise<void> {
  return request(`/documents/${id}`, { method: 'DELETE' });
}

// ─── Sharing ─────────────────────────────────────────────────────────────────

export async function shareDocument(
  id: string,
  email: string,
  role: 'read' | 'edit'
): Promise<{ message: string; share: ShareEntry }> {
  return request(`/documents/${id}/share`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export async function revokeShare(id: string, targetUserId: string): Promise<void> {
  return request(`/documents/${id}/share/${targetUserId}`, { method: 'DELETE' });
}

// ─── Upload ──────────────────────────────────────────────────────────────────

export async function uploadFile(file: File): Promise<{ message: string; document: Document }> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}
