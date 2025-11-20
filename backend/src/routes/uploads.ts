// backend/src/routes/uploads.ts

import { Router } from 'express';

import { uploadFile, getUploadMetadata } from '../controllers/uploadsController';

import { uploadMiddleware } from '../lib/multer';

import { authMiddleware } from '../middleware/authMiddleware';

import { prisma } from '../prisma';



const router = Router();



router.post('/file', authMiddleware, uploadMiddleware.single('file'), uploadFile);

router.get('/:id', authMiddleware, getUploadMetadata);

router.get('/:id/file', authMiddleware, async (req, res) => {
  try {
    const uploadId = parseInt(req.params.id);
    const upload = await prisma.upload.findUnique({
      where: { id: uploadId },
    });

    if (!upload) {
      return res.status(404).json({ success: false, error: 'Upload not found' });
    }

    const fs = require('fs');
    const path = require('path');
    
    // The filePath stored in DB is relative to uploads directory
    // It might be just the filename or a relative path
    let filePath = upload.filePath;
    
    // If it's already an absolute path, use it; otherwise construct it
    if (!path.isAbsolute(filePath)) {
      filePath = path.join(process.cwd(), 'backend', 'uploads', filePath);
    }

    if (!fs.existsSync(filePath)) {
      // Try alternative path format
      const altPath = path.join(process.cwd(), 'backend', 'uploads', path.basename(upload.filePath));
      if (fs.existsSync(altPath)) {
        filePath = altPath;
      } else {
        return res.status(404).json({ success: false, error: 'File not found on disk' });
      }
    }

    res.setHeader('Content-Type', upload.fileType);
    res.setHeader('Content-Disposition', `inline; filename="${upload.fileName}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Serve file error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;

