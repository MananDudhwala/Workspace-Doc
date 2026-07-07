import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mammoth from 'mammoth';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowed = ['.txt', '.md', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Only .txt, .md, and .docx files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// POST /upload — upload file and create a new document
router.post('/', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.userId!;
    const file = req.file;
    const ext = path.extname(file.originalname).toLowerCase();

    let htmlContent = '';
    let title = path.basename(file.originalname, ext);

    if (ext === '.docx') {
      // Convert DOCX to HTML using mammoth
      const result = await mammoth.convertToHtml({ path: file.path });
      htmlContent = result.value;

      if (result.messages.length > 0) {
        console.log('Mammoth warnings:', result.messages);
      }
    } else if (ext === '.txt') {
      // Plain text — wrap paragraphs
      const raw = fs.readFileSync(file.path, 'utf-8');
      const paragraphs = raw
        .split(/\n\n+/)
        .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('');
      htmlContent = paragraphs || '<p></p>';
    } else if (ext === '.md') {
      // Markdown — convert to HTML using marked
      const { marked } = await import('marked');
      const raw = fs.readFileSync(file.path, 'utf-8');
      const parsed = await marked(raw);
      htmlContent = parsed;
    }

    // Create document
    const doc = await prisma.document.create({
      data: {
        title,
        content: htmlContent,
        ownerId: userId,
        upload: {
          create: {
            filename: file.filename,
            originalName: file.originalname,
            path: file.path,
          },
        },
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        upload: true,
      },
    });

    return res.status(201).json({
      message: `File "${file.originalname}" imported successfully`,
      document: doc,
    });
  } catch (err: unknown) {
    // Handle multer file type error
    if (err instanceof Error && err.message.includes('Unsupported file type')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Failed to process file upload' });
  }
});

export default router;
