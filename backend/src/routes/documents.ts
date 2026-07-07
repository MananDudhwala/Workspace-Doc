import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /documents — list owned + shared docs
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const ownedDocs = await prisma.document.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        owner: { select: { id: true, name: true, email: true } },
        shares: {
          select: {
            userId: true,
            role: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        upload: { select: { originalName: true } },
      },
    });

    const sharedDocs = await prisma.documentShare.findMany({
      where: { userId },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true,
            owner: { select: { id: true, name: true, email: true } },
            upload: { select: { originalName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      owned: ownedDocs,
      shared: sharedDocs.map((s) => ({
        ...s.document,
        sharedRole: s.role,
        sharedBy: s.document.owner,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// POST /documents — create new document
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { title, content } = req.body;

    const doc = await prisma.document.create({
      data: {
        title: title || 'Untitled Document',
        content: content || '',
        ownerId: userId,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create document' });
  }
});

// GET /documents/:id — get single document
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        shares: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        upload: { select: { originalName: true, filename: true } },
      },
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access: owner or shared
    const isOwner = doc.ownerId === userId;
    const shareEntry = doc.shares.find((s) => s.userId === userId);

    if (!isOwner && !shareEntry) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json({
      ...doc,
      isOwner,
      userRole: isOwner ? 'owner' : shareEntry?.role,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// PATCH /documents/:id — update title or content
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    const { title, content } = req.body;

    const MAX_DOCUMENT_LENGTH = 50000;
    if (content !== undefined && content.length > MAX_DOCUMENT_LENGTH) {
      return res.status(413).json({ 
        error: `Document exceeds maximum character limit of ${MAX_DOCUMENT_LENGTH}` 
      });
    }

    const doc = await prisma.document.findUnique({
      where: { id },
      include: { shares: true },
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const isOwner = doc.ownerId === userId;
    const shareEntry = doc.shares.find((s) => s.userId === userId);
    const canEdit = isOwner || shareEntry?.role === 'edit';

    if (!canEdit) {
      return res.status(403).json({ error: 'You do not have edit access' });
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update document' });
  }
});

// DELETE /documents/:id — delete document (owner only)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const doc = await prisma.document.findUnique({ where: { id } });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (doc.ownerId !== userId) {
      return res.status(403).json({ error: 'Only the owner can delete this document' });
    }

    await prisma.document.delete({ where: { id } });
    return res.json({ message: 'Document deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
