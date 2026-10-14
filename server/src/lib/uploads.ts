import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config';
import { badRequest } from './http';

export const UPLOAD_KINDS = {
  video: { dir: 'videos', maxMb: 2048, accept: /^video\// },
  material: { dir: 'materials', maxMb: 100, accept: /.*/ },
  image: { dir: 'images', maxMb: 10, accept: /^image\// },
  csv: { dir: 'tmp', maxMb: 10, accept: /(csv|text|excel|octet-stream)/ },
} as const;

export type UploadKind = keyof typeof UPLOAD_KINDS;

for (const k of Object.values(UPLOAD_KINDS)) fs.mkdirSync(path.join(config.uploadsDir, k.dir), { recursive: true });

export function uploader(kind: UploadKind) {
  const spec = UPLOAD_KINDS[kind];
  return multer({
    storage: multer.diskStorage({
      destination: path.join(config.uploadsDir, spec.dir),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
      },
    }),
    limits: { fileSize: spec.maxMb * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (spec.accept.test(file.mimetype)) cb(null, true);
      else cb(badRequest(`Tipo de arquivo não permitido para ${kind}: ${file.mimetype}`));
    },
  });
}

export const publicUrl = (kind: UploadKind, filename: string) => `/uploads/${UPLOAD_KINDS[kind].dir}/${filename}`;

/** Remove um arquivo enviado (apenas se estiver dentro do diretório de uploads). */
export function removeUpload(url: string | null | undefined) {
  if (!url?.startsWith('/uploads/')) return;
  const file = path.resolve(config.uploadsDir, url.slice('/uploads/'.length));
  if (file.startsWith(config.uploadsDir)) fs.rm(file, { force: true }, () => {});
}
