import { PrismaClient } from '@prisma/client';

/**
 * Garante que o e-mail definido em SUPERADMIN_EMAIL (default: tnicodemos@gmail.com)
 * tenha o papel `admin_global`. Executa a cada boot do backend, é idempotente
 * e nunca remove o papel — apenas garante que ele exista.
 *
 * O usuário só é promovido depois que existir no cadastro interno de usuários.
 * Enquanto não existir, o boot apenas loga um aviso.
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
        `[superadmin] usuário ${email} ainda não existe — crie-o internamente para ser promovido automaticamente no próximo boot.`,
      );
      return;
    }

    const promoted = await ensureSuperadminForUser(prisma, user.id, user.email);
    console.log(
      promoted
        ? `[superadmin] papel admin_global atribuído a ${email}.`
        : `[superadmin] ${email} já é admin_global.`,
    );
  } catch (err) {
    console.error('[superadmin] falha ao garantir superadmin:', err);
  }
}

export function configuredSuperadminEmail() {
  return (process.env.SUPERADMIN_EMAIL ?? 'tnicodemos@gmail.com')
    .trim()
    .toLowerCase();
}

export async function ensureSuperadminForUser(
  prisma: PrismaClient,
  userId: string,
  email: string,
) {
  const superEmail = configuredSuperadminEmail();
  if (!superEmail || email.trim().toLowerCase() !== superEmail) return false;

  const existing = await prisma.userRole.findFirst({
    where: { userId, role: 'admin_global', companyId: null },
  });
  if (existing) return false;

  await prisma.userRole.create({
    data: { userId, role: 'admin_global' },
  });
  return true;
}

/**
 * Bloqueia remoção/rebaixamento do superadmin definido em SUPERADMIN_EMAIL.
 * Deve ser chamado por qualquer serviço que for deletar usuário
 * ou remover papel `admin_global`.
 */
export function assertNotSuperadmin(email: string | null | undefined) {
  const superEmail = configuredSuperadminEmail();
  if (email && email.trim().toLowerCase() === superEmail) {
    throw new Error('Superadmin não pode ser removido ou rebaixado.');
  }
}
