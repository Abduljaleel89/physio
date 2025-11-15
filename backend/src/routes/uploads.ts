// backend/src/routes/uploads.ts

import { Router } from 'express';

import { uploadFile, getUploadMetadata } from '../controllers/uploadsController';

import { uploadMiddleware } from '../lib/multer';

import { authMiddleware } from '../middleware/authMiddleware';



const router = Router();



router.post('/file', authMiddleware, uploadMiddleware.single('file'), uploadFile);

router.get('/:id', authMiddleware, getUploadMetadata);



export default router;

