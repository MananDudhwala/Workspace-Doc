import { Hocuspocus } from '@hocuspocus/server';
import { PrismaClient } from '@prisma/client';
import { TiptapTransformer } from '@hocuspocus/transformer';
import { generateHTML } from '@tiptap/html';
import { generateJSON } from '@tiptap/html/server';
import jwt from 'jsonwebtoken';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { PageBreak } from './extensions/PageBreak';
import * as Y from 'yjs';

const prisma = new PrismaClient();

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

// Ensure the transformer knows about the extensions used in our frontend
// so it can correctly parse the Yjs document back into HTML.
const extensions = [
  StarterKit,
  Underline,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  PageBreak,
];

export const hocuspocus = new Hocuspocus({
  name: 'WorkspaceDoc-Hocuspocus',
  
  async onAuthenticate(data) {
    const { token } = data;
    if (!token) throw new Error('Authentication required');

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
        userId: string;
        email: string;
      };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, email: true },
      });

      if (!user) throw new Error('User not found');

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          initials: getInitials(user.name),
        }
      };
    } catch {
      throw new Error('Invalid token');
    }
  },

  async onLoadDocument(data) {
    const { documentName, context } = data;
    const user = context.user;

    if (!user) throw new Error('Not authorized');

    const doc = await prisma.document.findUnique({
      where: { id: documentName },
      include: { shares: true },
    });

    if (!doc) throw new Error('Document not found');

    const isOwner = doc.ownerId === user.id;
    const hasShare = doc.shares.some((s) => s.userId === user.id);

    if (!isOwner && !hasShare) {
      throw new Error('You do not have access to this document');
    }

    if (doc.yjsState) {
      return doc.yjsState;
    }

    // If there is no Yjs state but we have old HTML content (migration scenario),
    // we convert it to a Y.Doc and then to an update Uint8Array.
    if (doc.content) {
      const json = generateJSON(doc.content, extensions);
      const ydoc = TiptapTransformer.toYdoc(json, 'default', extensions);
      return Y.encodeStateAsUpdate(ydoc);
    }

    return null;
  },

  async onStoreDocument(data) {
    const { documentName, document } = data;

    // document is a Y.Doc instance
    const yjsState = Buffer.from(Y.encodeStateAsUpdate(document));
    
    // Convert Y.Doc to Prosemirror JSON
    const json = TiptapTransformer.fromYdoc(document, 'default');
    
    // Generate HTML from JSON using our extensions
    const html = generateHTML(json, extensions);

    await prisma.document.update({
      where: { id: documentName },
      data: {
        yjsState,
        content: html,
      },
    });
  },
});

