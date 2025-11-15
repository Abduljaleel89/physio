"use strict";
// backend/src/lib/multer.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const tmpDir = path_1.default.join(os_1.default.tmpdir(), 'physio-uploads');
// ensure tmp dir exists
if (!fs_1.default.existsSync(tmpDir)) {
    fs_1.default.mkdirSync(tmpDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, tmpDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path_1.default.extname(file.originalname)}`),
});
exports.uploadMiddleware = (0, multer_1.default)({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
    fileFilter: (_req, file, cb) => {
        const allowed = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'video/mp4',
            'video/quicktime',
            'video/x-m4v',
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cb(new Error('File type not allowed'), false);
        }
    },
});
