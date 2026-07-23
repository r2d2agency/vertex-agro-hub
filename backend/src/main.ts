import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { ensureSuperadmin } from './bootstrap/ensure-superadmin';
import { seedAllCompaniesCatalog } from './bootstrap/seed-catalog';


const DEFAULT_ALLOWED_HEADERS = 'Content-Type, Authorization, Accept, Origin, X-Requested-With';

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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const prisma = app.get(PrismaService);
  await ensureSuperadmin(prisma);
  await seedAllCompaniesCatalog(prisma);




  app.use(corsMiddleware);
  app.enableCors({
    origin: true,
    credentials: false,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: DEFAULT_ALLOWED_HEADERS,
    maxAge: 86400,
  });
  app.use(helmet());
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
