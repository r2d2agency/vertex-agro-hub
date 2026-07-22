import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

function parseAllowedOrigins() {
  return [process.env.CORS_ORIGIN, process.env.FRONTEND_URL]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  const allowedOrigins = parseAllowedOrigins();
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/$/, '');
      if (allowedOrigins.length === 0 || allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      return callback(null, allowedOrigins.includes(normalizedOrigin));
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    optionsSuccessStatus: 204,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.setGlobalPrefix('', { exclude: ['health'] });

  const port = parseInt(process.env.PORT ?? '4000', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`Vertex API listening on :${port}`);
}
bootstrap();
