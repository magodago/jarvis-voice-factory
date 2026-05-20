import { Router } from 'express';
import multer from 'multer';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, '..', 'uploads');
try { mkdirSync(UPLOADS_DIR, { recursive: true }); } catch {}

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const router = Router();

/**
 * POST /upload/file
 * Upload any file (audio, document, image)
 */
router.post('/file', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
    path: '/uploads/' + req.file.filename,
    url: '/uploads/' + req.file.filename,
  });
});

export default router;
