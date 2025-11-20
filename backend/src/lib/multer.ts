// backend/src/lib/multer.ts

import multer, { FileFilterCallback } from 'multer';

import path from 'path';

import os from 'os';

import fs from 'fs';



const tmpDir = path.join(os.tmpdir(), 'physio-uploads');



// ensure tmp dir exists

if (!fs.existsSync(tmpDir)) {

  fs.mkdirSync(tmpDir, { recursive: true });

}



const storage = multer.diskStorage({

  destination: (_req, _file, cb) => cb(null, tmpDir),

  filename: (_req, file, cb) =>

    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),

});



export const uploadMiddleware = multer({

  storage,

  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB

  fileFilter: (_req, file, cb: FileFilterCallback) => {

    const allowed = [

      'image/jpeg',

      'image/png',

      'image/webp',

      'image/gif',

      'video/mp4',

      'video/quicktime',

      'video/x-m4v',

      'application/pdf', // For payment proof documents

      'application/msword', // .doc

      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx

    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cb(new Error('File type not allowed') as any, false);
    }

  },

});

