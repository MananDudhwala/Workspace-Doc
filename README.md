# WorkspaceDoc

A full-stack collaborative document editor with rich-text editing, file upload, sharing, and persistence.

---

## Features

| Feature | Details |
|---|---|
| **Rich-text editing** | Bold, italic, underline, H1–H3, bullet & numbered lists, text alignment, blockquote, undo/redo |
| **Auto-save** | Debounced 1.5s after last keystroke + manual Ctrl/Cmd+S |
| **File upload** | `.txt`, `.md`, `.docx` → converted to editable HTML documents |
| **Sharing** | Share with any registered user by email; grant Read or Edit access |
| **Persistence** | SQLite via Prisma — survives restarts; HTML content preserves formatting |
| **Auth** | JWT-based login/register + two demo accounts pre-seeded |

---

## Supported File Types for Upload

| Extension | Conversion |
|---|---|
| `.txt` | Paragraphs wrapped as `<p>` tags |
| `.md` | Markdown → HTML via `marked` |
| `.docx` | Word document → HTML via `mammoth` |

> ⚠️ **Not supported**: `.pdf`, `.xlsx`, `.pptx`, `.rtf`. Attempting to upload these will show an error.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Vanilla CSS |
| Rich-text | Tiptap v2 (ProseMirror-based) |
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma |
| Database | SQLite (`backend/dev.db`) |
| Auth | JWT (7-day expiry) |
| File upload | multer + mammoth + marked |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### 1. Clone and install

```bash
git clone <repo-url>
cd Workspace-Doc

# Install backend
cd backend && npm install

# Install frontend
cd ../frontend && npm install
```

### 2. Set up the database

```bash
cd backend
npm run db:push   # Creates dev.db and applies schema
npm run db:seed   # Seeds demo accounts and sample documents
```

### 3. Start both servers

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# API running at http://localhost:4000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# App running at http://localhost:3000
```

### 4. Open the app

Visit [http://localhost:3000](http://localhost:3000)

---

## Demo Accounts

Two accounts are pre-seeded. Alice already has a document shared with Bob.

| Email | Password | Role |
|---|---|---|
| `alice@demo.com` | `demo1234` | Owner of sample docs |
| `bob@demo.com` | `demo1234` | Has shared access to Alice's doc |

---

## Demonstrating the Sharing Feature

1. Login as **Alice** → see "Welcome to WorkspaceDoc" document (owner)
2. Click the document → click **Share** → share with `bob@demo.com` (already seeded as Edit)
3. Logout → login as **Bob** → see document in "Shared with me" section with an "Edit" badge
4. Bob can open and edit the document
5. Login as Alice again → changes Bob made are visible

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | ✗ | Create account |
| POST | `/auth/login` | ✗ | Get JWT |
| GET | `/auth/me` | ✓ | Current user |
| GET | `/documents` | ✓ | List owned + shared |
| POST | `/documents` | ✓ | Create document |
| GET | `/documents/:id` | ✓ | Get document (access check) |
| PATCH | `/documents/:id` | ✓ | Update title/content |
| DELETE | `/documents/:id` | ✓ | Delete (owner only) |
| POST | `/documents/:id/share` | ✓ | Share with user by email |
| GET | `/documents/:id/shares` | ✓ | List shares (owner only) |
| DELETE | `/documents/:id/share/:userId` | ✓ | Revoke access |
| POST | `/upload` | ✓ | Upload file → create doc |

---

## Project Structure

```
Workspace-Doc/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma   # DB schema
│   │   └── seed.ts         # Demo data
│   ├── src/
│   │   ├── index.ts        # Express entry
│   │   ├── middleware/auth.ts
│   │   └── routes/
│   │       ├── auth.ts
│   │       ├── documents.ts
│   │       ├── share.ts
│   │       └── upload.ts
│   └── uploads/            # Uploaded files (gitignored)
│
└── frontend/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx         # Redirect
    │   ├── login/page.tsx
    │   ├── register/page.tsx
    │   ├── dashboard/page.tsx
    │   └── doc/[id]/page.tsx
    ├── components/
    │   ├── RichEditor.tsx   # Tiptap editor + toolbar
    │   ├── ShareModal.tsx
    │   ├── UploadModal.tsx
    │   └── Toast.tsx
    └── lib/
        ├── api.ts           # Typed API client
        └── auth-context.tsx # Auth state
```

---

## Design Decisions

- **SQLite over Postgres**: Zero external dependencies — clone + run = works. Prisma makes it trivial to swap to Postgres via one env var change (`DATABASE_URL=postgresql://...`).
- **Tiptap over Quill/Draft.js**: Headless, TypeScript-native, actively maintained, and extensible.
- **JWT in localStorage**: Appropriate for a recruitment demo scope; not production-grade (should use httpOnly cookies in prod).
- **HTML content storage**: Tiptap outputs HTML natively. Storing it directly preserves all formatting without a lossy serialization step.