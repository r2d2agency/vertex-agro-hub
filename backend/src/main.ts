import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { ensureSuperadmin } from './bootstrap/ensure-superadmin';
import { fixMissingColumns } from './bootstrap/fix-missing-columns';
import { seedAllCompaniesCatalog } from './bootstrap/seed-catalog';
import { backfillGeo } from './bootstrap/backfill-geo';
import { UPLOADS_DIR } from './uploads/uploads.controller';



const DEFAULT_ALLOWED_HEADERS = 'Content-Type, Authorization, Accept, Origin, X-Requested-With, X-Idempotency-Key';

function corsMiddleware(request: Request, response: Response, next: NextFunction) {
  const origin = request.headers.origin;
  const requestedHeaders = request.headers['access-control-request-headers'];

  response.header('Access-Control-Allow-Origin', origin || '*');
  response.header('Vary', 'Origin');
  response.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  response.header(
    'Access-Control-Allow-Headers',
    Array.isArray(requestedHeaders)
      ? requestedHeaders.join(', ')
      : requestedHeaders || DEFAULT_ALLOWED_HEADERS,
  );
  response.header('Access-Control-Max-Age', '86400');

  if (request.method === 'OPTIONS') {
    response.status(204).send();
    return;
  }

  next();
}

// Cache simples em memória para deduplicar mutações reenviadas pela fila offline.
type IdempotencyEntry = { status: number; body: any; ts: number };
const idempotencyCache = new Map<string, IdempotencyEntry>();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
function idempotencyMiddleware(request: Request, response: Response, next: NextFunction) {
  const key = (request.headers['x-idempotency-key'] as string) || '';
  if (!key || !['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) return next();
  const now = Date.now();
  // limpa entradas antigas oportunisticamente
  if (idempotencyCache.size > 500) {
    for (const [k, v] of idempotencyCache) if (now - v.ts > IDEMPOTENCY_TTL_MS) idempotencyCache.delete(k);
  }
  const hit = idempotencyCache.get(key);
  if (hit && now - hit.ts < IDEMPOTENCY_TTL_MS) {
    response.status(hit.status).json(hit.body);
    return;
  }
  const originalJson = response.json.bind(response);
  response.json = (body: any) => {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      idempotencyCache.set(key, { status: response.statusCode, body, ts: Date.now() });
    }
    return originalJson(body);
  };
  next();
}


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const prisma = app.get(PrismaService);
  try {
    await ensureSuperadmin(prisma);
  } catch (e: any) {
    console.error('[superadmin] failed:', e?.message || e);
  }
  
  try {
    await fixMissingColumns(prisma);
  } catch (e: any) {
    console.error('[fix-columns] failed:', e?.message || e);
  }

  try {
    await seedAllCompaniesCatalog(prisma);
  } catch (e: any) {
    console.error('[seed] failed:', e?.message || e);
  }

  try {
    await backfillGeo(prisma);
  } catch (e: any) {
    console.error('[backfill] failed:', e?.message || e);
  }





  app.use(corsMiddleware);
  app.use(idempotencyMiddleware);
  app.enableCors({
    origin: true,
    credentials: false,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: DEFAULT_ALLOWED_HEADERS,
    maxAge: 86400,
  });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d', fallthrough: false }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.setGlobalPrefix('', { exclude: ['health'] });

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`Vertex API listening on :${port}`);
}
bootstrap();
