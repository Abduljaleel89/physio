"use strict";
// backend/src/controllers/uploadsController.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUploadMetadata = exports.uploadFile = void 0;
const path_1 = __importDefault(require("path"));
const storage_1 = require("../lib/storage");
const prismaClient_1 = require("../prismaClient");
const storage = new storage_1.LocalStorageAdapter({
    uploadsDir: path_1.default.join(process.cwd(), 'backend', 'uploads'),
    publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:4000',
});
/**

 * POST /uploads/file

 * - auth required

 * - single file field: "file"

 * - optional body fields: purpose, referenceId

 */
const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file provided' });
        }
        const multerFile = req.file;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = req.user?.userId ?? req.user?.id ?? null;
        const stored = await storage.saveFile(multerFile, { uploadedBy: userId?.toString() ?? null });
        // Persist Upload record (Prisma example)
        // Note: Adapting to existing schema where Upload.id is Int, but we store the UUID in filePath
        const upload = await prismaClient_1.prisma.upload.create({
            data: {
                fileName: stored.filename,
                filePath: storage.getFilePath(stored.key),
                fileType: stored.mimeType,
                fileSize: stored.size,
                uploadedBy: userId ? parseInt(userId.toString()) : null,
                patientId: req.user?.role === 'PATIENT' ? (await getPatientIdForUser(userId)) : null,
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
    }
    catch (err) {
        console.error('uploadFile error', err);
        if (err?.message === 'File type not allowed') {
            return res.status(400).json({ success: false, error: err.message });
        }
        return res.status(500).json({ success: false, error: 'Upload failed' });
    }
};
exports.uploadFile = uploadFile;
/**

 * GET /uploads/:id

 * - returns DB metadata for the upload (not the file itself)

 * - auth + ownership/role check required by route registration

 */
const getUploadMetadata = async (req, res) => {
    try {
        const { id } = req.params;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = req.user;
        const upload = await prismaClient_1.prisma.upload.findUnique({ where: { id: parseInt(id) } });
        if (!upload)
            return res.status(404).json({ success: false, error: 'Not found' });
        // Optionally restrict access: only uploader, clinician assigned, or admin
        if (user) {
            const isAdmin = user.role === 'ADMIN' || user.role === 'RECEPTIONIST';
            if (!isAdmin && upload.uploadedBy !== (user.userId ?? user.id)) {
                // for stricter logic, check patient-clinician mapping
                return res.status(403).json({ success: false, error: 'Forbidden' });
            }
        }
        // Get public URL
        const fileName = path_1.default.basename(upload.filePath);
        const url = storage.getPublicUrl(fileName);
        return res.json({ success: true, data: { ...upload, url } });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
};
exports.getUploadMetadata = getUploadMetadata;
// Helper to get patient ID for user
async function getPatientIdForUser(userId) {
    if (!userId)
        return null;
    try {
        const patient = await prismaClient_1.prisma.patient.findFirst({
            where: { userId: parseInt(userId.toString()) },
        });
        return patient ? patient.id : null;
    }
    catch {
        return null;
    }
}
