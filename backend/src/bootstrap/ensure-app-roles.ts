import { PrismaClient } from '@prisma/client';

const APP_ROLES = ['sangrador', 'operador'] as const;

export async function ensureAppRoles(prisma: PrismaClient) {
  console.log('[app-roles] Verificando valores obrigatorios do enum AppRole...');

  try {
    for (const role of APP_ROLES) {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          ALTER TYPE "AppRole" ADD VALUE IF NOT EXISTS '${role}';
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
    }

    console.log('[app-roles] Enum AppRole verificado com sucesso.');
  } catch (error) {
    console.error('[app-roles] Falha ao garantir valores do enum AppRole:', error);
  }
}
