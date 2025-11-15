// backend/src/controllers/uploadsController.ts

import { Request, Response } from 'express';

import path from 'path';

import { LocalStorageAdapter } from '../lib/storage';

import prisma from '../prismaClient'; // adjust import based on your prisma client file

import { UploadedFile as MulterFile } from 'multer';



const storage = new LocalStorageAdapter({

  uploadsDir: path.join(process.cwd(), 'backend', 'uploads'),

  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:4000',

});



/**

 * POST /uploads/file

 * - auth required

 * - single file field: "file"

 * - optional body fields: purpose, referenceId

 */

export const uploadFile = async (req: Request, res: Response) => {

  try {

    if (!req.file) {

      return res.status(400).json({ success: false, error: 'No file provided' });

    }



    // eslint-disable-next-line @typescript-eslint/no-explicit-any

    const multerFile = req.file as unknown as MulterFile;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any

    const userId = (req as any).user?.userId ?? (req as any).user?.id ?? null;



    const stored = await storage.saveFile(multerFile, { uploadedBy: userId?.toString() ?? null });



    // Persist Upload record (Prisma example)

    // Note: Adapting to existing schema where Upload.id is Int, but we store the UUID in filePath

    const upload = await prisma.upload.create({

      data: {

        fileName: stored.filename,

        filePath: storage.getFilePath(stored.key),

        fileType: stored.mimeType,

        fileSize: stored.size,

        uploadedBy: userId ? parseInt(userId.toString()) : null,

        patientId: (req as any).user?.role === 'PATIENT' ? (await getPatientIdForUser(userId)) : null,

        entityType: req.body.purpose || null,

        entityId: req.body.referenceId ? parseInt(req.body.referenceId) : null,

      },

    });



    // Optionally create notification if purpose indicates 'completion' and referenceId present

    const { purpose, referenceId } = req.body;

    if (purpose === 'completion' && referenceId && userId) {

      // fetch assigned doctor for patient/plan if needed. Keep simple: create notification record

      // Note: notification will be created by completionEventsController when completion is created

      // Skip here to avoid duplicate notifications

    }



    return res.status(201).json({ success: true, data: { ...upload, url: stored.url } });

  } catch (err: any) {

    console.error('uploadFile error', err);

    if (err?.message === 'File type not allowed') {

      return res.status(400).json({ success: false, error: err.message });

    }

    return res.status(500).json({ success: false, error: 'Upload failed' });

  }

};



/**

 * GET /uploads/:id

 * - returns DB metadata for the upload (not the file itself)

 * - auth + ownership/role check required by route registration

 */

export const getUploadMetadata = async (req: Request, res: Response) => {

  try {

    const { id } = req.params;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any

    const user = (req as any).user;

    const upload = await prisma.upload.findUnique({ where: { id: parseInt(id) } });

    if (!upload) return res.status(404).json({ success: false, error: 'Not found' });



    // Optionally restrict access: only uploader, clinician assigned, or admin

    if (user) {

      const isAdmin = user.role === 'ADMIN' || user.role === 'RECEPTIONIST';

      if (!isAdmin && upload.uploadedBy !== (user.userId ?? user.id)) {

        // for stricter logic, check patient-clinician mapping

        return res.status(403).json({ success: false, error: 'Forbidden' });

      }

    }



    // Get public URL

    const fileName = path.basename(upload.filePath);

    const url = storage.getPublicUrl(fileName);



    return res.json({ success: true, data: { ...upload, url } });

  } catch (err) {

    console.error(err);

    return res.status(500).json({ success: false, error: 'Server error' });

  }

};



// Helper to get patient ID for user

async function getPatientIdForUser(userId: any): Promise<number | null> {

  if (!userId) return null;

  try {

    const patient = await prisma.patient.findFirst({

      where: { userId: parseInt(userId.toString()) },

    });

    return patient ? patient.id : null;

  } catch {

    return null;

  }

}
