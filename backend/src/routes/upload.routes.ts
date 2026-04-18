import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { s3Service } from '../integrations/s3.service';
import { config } from '../config';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// Allowed folders for uploads (whitelist approach)
const ALLOWED_FOLDERS = ['uploads', 'documents', 'images', 'audio', 'video', 'attachments', 'temp'];

// Sanitize folder path to prevent path traversal
function sanitizeFolderPath(folder: string): string {
  if (!folder) return 'uploads';
  // Remove any path traversal attempts
  const sanitized = folder
    .replace(/\.\./g, '')
    .replace(/[\/\\]+/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase();
  // Only allow whitelisted folders
  if (!ALLOWED_FOLDERS.includes(sanitized.split('/')[0])) {
    return 'uploads';
  }
  return sanitized;
}

// Sanitize file name
function sanitizeFileName(fileName: string): string {
  if (!fileName) return `${uuidv4()}.bin`;
  // Remove path components and dangerous characters
  const baseName = path.basename(fileName);
  const sanitized = baseName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 200); // Limit length
  return sanitized || `${uuidv4()}.bin`;
}

// Configure multer for memory storage (for S3 uploads)
const memoryStorage = multer.memoryStorage();

// Configure multer for disk storage (fallback for local)
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

// File filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
    'audio/mpeg',
    'audio/wav',
    'video/mp4',
    'video/webm',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
};

// Use memory storage if S3 is configured, otherwise disk
const upload = multer({
  storage: s3Service.isEnabled() ? memoryStorage : diskStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Upload single file
router.post('/single', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const folder = (req.body.folder as string) || 'uploads';

    if (s3Service.isEnabled()) {
      // Upload to S3
      const result = await s3Service.uploadFile(
        req.file.buffer,
        req.file.originalname,
        {
          folder,
          contentType: req.file.mimetype,
          isPublic: req.body.isPublic === 'true',
        }
      );

      return res.json({
        success: true,
        file: {
          key: result.key,
          url: result.url,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          storage: 's3',
        },
      });
    } else {
      // Local storage
      const fileUrl = `${config.baseUrl}/uploads/${req.file.filename}`;

      return res.json({
        success: true,
        file: {
          key: req.file.filename,
          url: fileUrl,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          storage: 'local',
        },
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// Upload multiple files
router.post('/multiple', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const folder = (req.body.folder as string) || 'uploads';
    const results = [];

    for (const file of files) {
      if (s3Service.isEnabled()) {
        const result = await s3Service.uploadFile(file.buffer, file.originalname, {
          folder,
          contentType: file.mimetype,
          isPublic: req.body.isPublic === 'true',
        });

        results.push({
          key: result.key,
          url: result.url,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          storage: 's3',
        });
      } else {
        const fileUrl = `${config.baseUrl}/uploads/${file.filename}`;
        results.push({
          key: file.filename,
          url: fileUrl,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          storage: 'local',
        });
      }
    }

    return res.json({ success: true, files: results });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// Get presigned upload URL (for direct client-to-S3 uploads)
router.post('/presigned-url', validate([
  body('fileName').trim().notEmpty().withMessage('fileName is required')
    .isLength({ max: 200 }).withMessage('fileName must be at most 200 characters'),
  body('folder').optional().trim().isLength({ max: 50 }).withMessage('folder must be at most 50 characters'),
  body('contentType').optional().trim().isLength({ max: 100 }).withMessage('Invalid content type'),
]), async (req: Request, res: Response) => {
  try {
    if (!s3Service.isEnabled()) {
      return res.status(400).json({
        success: false,
        message: 'S3 is not configured. Use direct upload endpoint instead.',
      });
    }

    const { folder, fileName, contentType } = req.body;

    // Sanitize inputs to prevent path traversal
    const safeFolder = sanitizeFolderPath(folder);
    const safeFileName = sanitizeFileName(fileName);

    // Validate content type against allowed list
    const allowedContentTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv', 'text/plain', 'audio/mpeg', 'audio/wav', 'video/mp4', 'video/webm'
    ];

    if (contentType && !allowedContentTypes.includes(contentType)) {
      return res.status(400).json({ success: false, message: 'Invalid content type' });
    }

    const result = await s3Service.generateUploadUrl(
      safeFolder,
      safeFileName,
      contentType
    );

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Presigned URL error:', error);
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// Get presigned download URL
router.get('/download-url/:key', validate([
  param('key').trim().notEmpty().withMessage('Key is required')
    .isLength({ max: 500 }).withMessage('Key too long'),
]), async (req: Request, res: Response) => {
  try {
    if (!s3Service.isEnabled()) {
      return res.status(400).json({
        success: false,
        message: 'S3 is not configured',
      });
    }

    const { key } = req.params;

    // Validate key doesn't contain path traversal attempts
    if (key.includes('..') || key.startsWith('/')) {
      return res.status(400).json({ success: false, message: 'Invalid key' });
    }

    const url = await s3Service.getSignedDownloadUrl(key);

    return res.json({ success: true, url });
  } catch (error) {
    console.error('Download URL error:', error);
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// Upload branding assets (logo, favicon, etc.)
router.post('/branding', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const type = req.body.type || 'logo'; // logo, favicon, loginBg
    const folder = 'branding';

    if (s3Service.isEnabled()) {
      // Upload to S3
      const result = await s3Service.uploadFile(
        req.file.buffer,
        req.file.originalname,
        {
          folder,
          contentType: req.file.mimetype,
          isPublic: true, // Branding assets should be public
        }
      );

      return res.json({
        success: true,
        data: {
          type,
          key: result.key,
          url: result.url,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          storage: 's3',
        },
      });
    } else {
      // Local storage
      const fileUrl = `${config.baseUrl}/uploads/${req.file.filename}`;

      return res.json({
        success: true,
        data: {
          type,
          key: req.file.filename,
          url: fileUrl,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          storage: 'local',
        },
      });
    }
  } catch (error) {
    console.error('Branding upload error:', error);
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// Delete file
router.delete('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    if (s3Service.isEnabled()) {
      await s3Service.deleteFile(key);
    } else {
      const filePath = path.join(__dirname, '../../uploads', key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    return res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
});

export default router;
