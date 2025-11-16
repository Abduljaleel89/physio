import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import * as notificationsController from '../controllers/notificationsController';

const router = express.Router();

router.get('/', authMiddleware, notificationsController.listNotifications);
router.post('/:id/read', authMiddleware, notificationsController.markRead);
router.post('/read-all', authMiddleware, notificationsController.markAllRead);

export default router;
