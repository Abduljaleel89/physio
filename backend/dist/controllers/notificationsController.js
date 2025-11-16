"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotifications = listNotifications;
exports.markRead = markRead;
exports.markAllRead = markAllRead;
const prisma_1 = require("../prisma");
async function listNotifications(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const page = Math.max(1, parseInt(String(req.query.page || '1')));
        const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '50'))));
        const type = typeof req.query.type === 'string' ? req.query.type : undefined;
        const startDateStr = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
        const endDateStr = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
        const readParam = typeof req.query.read === 'string' ? req.query.read : undefined; // 'true' | 'false'
        const where = { userId: req.user.id };
        if (type)
            where.type = type;
        if (readParam === 'true')
            where.read = true;
        if (readParam === 'false')
            where.read = false;
        if (startDateStr || endDateStr) {
            where.createdAt = {};
            if (startDateStr)
                where.createdAt.gte = new Date(startDateStr);
            if (endDateStr)
                where.createdAt.lte = new Date(endDateStr);
        }
        const [total, notifications, unreadCount] = await Promise.all([
            prisma_1.prisma.notification.count({ where }),
            prisma_1.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma_1.prisma.notification.count({ where: { userId: req.user.id, read: false } }),
        ]);
        res.json({ success: true, data: { notifications, total, page, pageSize, unreadCount } });
    }
    catch (e) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}
async function markRead(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const id = parseInt(req.params.id);
        const notif = await prisma_1.prisma.notification.findUnique({ where: { id } });
        if (!notif || notif.userId !== req.user.id) {
            res.status(404).json({ success: false, error: 'Not found' });
            return;
        }
        await prisma_1.prisma.notification.update({ where: { id }, data: { read: true, readAt: new Date() } });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}
async function markAllRead(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        await prisma_1.prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true, readAt: new Date() } });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}
