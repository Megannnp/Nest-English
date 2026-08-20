import multer from 'multer';

import { validateFileMagicBytes } from './validateFileMagicBytes.js';

const ALLOWED_ANNOUNCEMENT_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const announcementFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    cb(null, ALLOWED_ANNOUNCEMENT_FILE_TYPES.includes(file.mimetype));
  },
});

export function isValidAnnouncementUpload(file) {
  return Boolean(file) && validateFileMagicBytes(file.buffer, file.mimetype);
}
