"use strict";
// backend/src/lib/storage.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageAdapter = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
/**
 * Local filesystem storage adapter
 * Stores files in backend/uploads/ directory
 */
class LocalStorageAdapter {
    constructor(opts = {}) {
        this.uploadsDir =
            opts.uploadsDir || path_1.default.join(process.cwd(), "backend", "uploads");
        this.publicBaseUrl =
            opts.publicBaseUrl || process.env.PUBLIC_BASE_URL || "http://localhost:4000";
    }
    async ensureDir() {
        await promises_1.default.mkdir(this.uploadsDir, { recursive: true });
    }
    /**
     * Save a multer file to local uploads dir and return metadata.
     */
    async saveFile(file, opts) {
        await this.ensureDir();
        const ext = path_1.default.extname(file.originalname) || "";
        const id = (0, crypto_1.randomUUID)();
        const safeKey = `${id}${ext}`;
        const dest = path_1.default.join(this.uploadsDir, safeKey);
        // multer diskStorage writes to file.path; memory storage exposes buffer
        if (file.path) {
            // Use copyFile + unlink instead of rename to handle cross-device issues in Docker
            // When /tmp is on a different filesystem than the uploads volume, rename() fails with EXDEV
            try {
                await promises_1.default.copyFile(file.path, dest);
                // Try to delete the temp file, but don't fail if it doesn't exist
                await promises_1.default.unlink(file.path).catch(() => {
                    // Ignore errors when cleaning up temp file
                });
            }
            catch (copyError) {
                // If copyFile fails, fall back to read/write for cross-device scenarios
                if (copyError.code === 'EXDEV' || copyError.code === 'ENOSPC') {
                    const fileBuffer = await promises_1.default.readFile(file.path);
                    await promises_1.default.writeFile(dest, fileBuffer);
                    await promises_1.default.unlink(file.path).catch(() => {
                        // Ignore errors when cleaning up temp file
                    });
                }
                else {
                    throw copyError;
                }
            }
        }
        else if (file.buffer) {
            await promises_1.default.writeFile(dest, file.buffer);
        }
        else {
            throw new Error('Unsupported multer storage type');
        }
        const stat = await promises_1.default.stat(dest);
        const stored = {
            id,
            filename: file.originalname,
            key: safeKey,
            url: `${this.publicBaseUrl.replace(/\/$/, '')}/uploads/${encodeURIComponent(safeKey)}`,
            size: stat.size,
            mimeType: file.mimetype,
            uploadedAt: new Date(),
            uploadedBy: opts?.uploadedBy ?? null,
        };
        return stored;
    }
    async deleteFile(key) {
        const p = path_1.default.join(this.uploadsDir, key);
        await promises_1.default.unlink(p).catch((err) => {
            if (err?.code === 'ENOENT')
                return;
            throw err;
        });
    }
    getFilePath(key) {
        return path_1.default.join(this.uploadsDir, key);
    }
    getPublicUrl(key) {
        return `${this.publicBaseUrl.replace(/\/$/, '')}/uploads/${encodeURIComponent(key)}`;
    }
}
exports.LocalStorageAdapter = LocalStorageAdapter;
