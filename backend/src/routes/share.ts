import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// POST /documents/:id/share — share with another user by email
router.post('/:id/share', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    if (!['read', 'edit'].includes(role)) {
      return res.status(400).json({ error: 'Role must be "read" or "edit"' });
    }

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (doc.ownerId !== userId) {
      return res.status(403).json({ error: 'Only the owner can share this document' });
    }

    // Find the target user
    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      return res.status(404).json({ error: `No user found with email: ${email}` });
    }

    if (targetUser.id === userId) {
      return res.status(400).json({ error: 'You cannot share a document with yourself' });
    }

    // Upsert the share
    const share = await prisma.documentShare.upsert({
      where: { documentId_userId: { documentId: id, userId: targetUser.id } },
      update: { role },
      create: { documentId: id, userId: targetUser.id, role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return res.json({ message: `Document shared with ${targetUser.name}`, share });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to share document' });
  }
});

// GET /documents/:id/shares — list all shares for a doc
router.get('/:id/shares', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.ownerId !== userId) {
      return res.status(403).json({ error: 'Only the owner can view shares' });
    }

    const shares = await prisma.documentShare.findMany({
      where: { documentId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return res.json(shares);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch shares' });
  }
});

// DELETE /documents/:id/share/:targetUserId — revoke access
router.delete('/:id/share/:targetUserId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id, targetUserId } = req.params;
    const userId = req.userId!;

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (doc.ownerId !== userId) {
      return res.status(403).json({ error: 'Only the owner can revoke access' });
    }

    await prisma.documentShare.deleteMany({
      where: { documentId: id, userId: targetUserId },
    });

    return res.json({ message: 'Access revoked' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to revoke access' });
  }
});

export default router;
