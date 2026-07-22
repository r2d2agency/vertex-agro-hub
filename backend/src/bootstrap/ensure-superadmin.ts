import { PrismaClient } from '@prisma/client';

/**
 * Garante que o e-mail definido em SUPERADMIN_EMAIL (default: tnicodemos@gmail.com)
 * tenha o papel `admin_global`. Executa a cada boot do backend, é idempotente
 * e nunca remove o papel — apenas garante que ele exista.
 *
 * O usuário só é promovido depois que ele mesmo criar a conta pelo /auth/register
 * (ou Google, futuramente). Enquanto não existir, o boot apenas loga um aviso.
 */
export async function ensureSuperadmin(prisma: PrismaClient) {
  const email = (process.env.SUPERADMIN_EMAIL ?? 'tnicodemos@gmail.com')
    .trim()
    .toLowerCase();
  if (!email) return;

  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, email: true },
    });

    if (!user) {
      console.log(
        `[superadmin] usuário ${email} ainda não existe — cadastre-se pelo app para ser promovido automaticamente no próximo boot ou registro.`,
      );
      return;
    }

    const existing = await prisma.userRole.findFirst({
      where: { userId: user.id, role: 'admin_global', companyId: null },
    });
    if (existing) {
      console.log(`[superadmin] ${email} já é admin_global.`);
      return;
    }

    await prisma.userRole.create({
      data: { userId: user.id, role: 'admin_global' },
    });
    console.log(`[superadmin] papel admin_global atribuído a ${email}.`);
  } catch (err) {
    console.error('[superadmin] falha ao garantir superadmin:', err);
  }
}

/**
 * Bloqueia remoção/rebaixamento do superadmin definido em SUPERADMIN_EMAIL.
 * Deve ser chamado por qualquer serviço que for deletar usuário
 * ou remover papel `admin_global`.
 */
export function assertNotSuperadmin(email: string | null | undefined) {
  const superEmail = (process.env.SUPERADMIN_EMAIL ?? 'tnicodemos@gmail.com')
    .trim()
    .toLowerCase();
  if (email && email.trim().toLowerCase() === superEmail) {
    throw new Error('Superadmin não pode ser removido ou rebaixado.');
  }
}
