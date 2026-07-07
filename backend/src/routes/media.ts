import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Ensure uploads/media directory exists
const mediaDir = path.join(__dirname, '../../uploads/media');
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, mediaDir),
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
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Only JPEG, PNG, GIF, and WEBP images are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// POST /media/upload - upload an image
router.post('/upload', authenticate, upload.single('file'), (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Create the public URL for the file
    const port = process.env.PORT || 3001;
    const protocol = req.protocol || 'http';
    const host = req.get('host') || `localhost:${port}`;
    const url = `${protocol}://${host}/uploads/media/${req.file.filename}`;
    
    return res.status(201).json({
      url,
      filename: req.file.filename,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Unsupported file type')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Media upload error:', err);
    return res.status(500).json({ error: 'Failed to process media upload' });
  }
});

export default router;
