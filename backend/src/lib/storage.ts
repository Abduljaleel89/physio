// backend/src/lib/storage.ts

import fs from 'fs/promises';

import path from 'path';

import { randomUUID } from 'crypto';

import type { Express } from 'express';

export interface StoredFile {
  id: string; // uuid
  filename: string; // original filename
  key: string; // stored filename (uuid.ext)
  url: string; // public URL to access file (e.g. /uploads/uuid.ext)
  size: number; // bytes
  mimeType: string;
  uploadedAt: Date;
  uploadedBy?: string | null; // userId
}

export interface StorageAdapter {
  saveFile(file: Express.Multer.File, opts?: { uploadedBy?: string | null }): Promise<StoredFile>;
  deleteFile(key: string): Promise<void>;
  getFilePath(key: string): string; // absolute path on disk
  getPublicUrl(key: string): string;
}

/**
 * Local filesystem storage adapter
 * Stores files in backend/uploads/ directory
 */
export class LocalStorageAdapter implements StorageAdapter {
  uploadsDir: string;
  publicBaseUrl: string; // e.g. process.env.PUBLIC_BASE_URL || 'http://localhost:4000'

  constructor(opts: { uploadsDir?: string; publicBaseUrl?: string } = {}) {
    this.uploadsDir =
      opts.uploadsDir || path.join(process.cwd(), "backend", "uploads");
    this.publicBaseUrl =
      opts.publicBaseUrl || process.env.PUBLIC_BASE_URL || "http://localhost:4000";
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.uploadsDir, { recursive: true });
  }

  /**
   * Save a multer file to local uploads dir and return metadata.
   */
  public async saveFile(file: Express.Multer.File, opts?: { uploadedBy?: string | null }): Promise<StoredFile> {
    await this.ensureDir();

    const ext = path.extname(file.originalname) || "";
    const id = randomUUID();
    const safeKey = `${id}${ext}`;
    const dest = path.join(this.uploadsDir, safeKey);

    // multer diskStorage writes to file.path; memory storage exposes buffer
    if (file.path) {
      // Use copyFile + unlink instead of rename to handle cross-device issues in Docker
      // When /tmp is on a different filesystem than the uploads volume, rename() fails with EXDEV
      try {
        await fs.copyFile(file.path, dest);
        // Try to delete the temp file, but don't fail if it doesn't exist
        await fs.unlink(file.path).catch(() => {
          // Ignore errors when cleaning up temp file
        });
      } catch (copyError: any) {
        // If copyFile fails, fall back to read/write for cross-device scenarios
        if (copyError.code === 'EXDEV' || copyError.code === 'ENOSPC') {
          const fileBuffer = await fs.readFile(file.path);
          await fs.writeFile(dest, fileBuffer);
          await fs.unlink(file.path).catch(() => {
            // Ignore errors when cleaning up temp file
          });
        } else {
          throw copyError;
        }
      }
    } else if ((file as any).buffer) {
      await fs.writeFile(dest, (file as any).buffer);
    } else {
      throw new Error('Unsupported multer storage type');
    }

    const stat = await fs.stat(dest);

    const stored: StoredFile = {
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

  public async deleteFile(key: string): Promise<void> {
    const p = path.join(this.uploadsDir, key);
    await fs.unlink(p).catch((err: any) => {
      if (err?.code === 'ENOENT') return;
      throw err;
    });
  }

  public getFilePath(key: string): string {
    return path.join(this.uploadsDir, key);
  }

  public getPublicUrl(key: string): string {
    return `${this.publicBaseUrl.replace(/\/$/, '')}/uploads/${encodeURIComponent(key)}`;
  }
}

