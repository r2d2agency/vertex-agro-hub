import {
  Controller, Post, UploadedFile, UseGuards, UseInterceptors, Req, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

export const UPLOADS_DIR = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED = /\.(png|jpe?g|gif|webp|pdf|doc|docx|xls|xlsx|txt|csv|heic)$/i;

@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: UPLOADS_DIR,
      filename: (_req, file, cb) => {
        const ext = extname(file.originalname || '').toLowerCase() || '';
        cb(null, `${randomUUID()}${ext}`);
      },
    }),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED.test(file.originalname || '')) {
        return cb(new BadRequestException('Formato de arquivo não permitido'), false);
      }
      cb(null, true);
    },
  }))
  upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('Arquivo ausente');
    // URL pública servida por main.ts em /uploads/:filename
    // O proxy do frontend (server.mjs) reescreve /api/uploads/... -> /uploads/... no backend.
    const url = `/api/uploads/${file.filename}`;
    return {
      url,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mime: file.mimetype,
      uploadedBy: req.user?.sub ?? null,
    };
  }
}
