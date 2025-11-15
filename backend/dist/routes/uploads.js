"use strict";
// backend/src/routes/uploads.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uploadsController_1 = require("../controllers/uploadsController");
const multer_1 = require("../lib/multer");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.post('/file', authMiddleware_1.authMiddleware, multer_1.uploadMiddleware.single('file'), uploadsController_1.uploadFile);
router.get('/:id', authMiddleware_1.authMiddleware, uploadsController_1.getUploadMetadata);
exports.default = router;
