import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompanyAccess {
  constructor(private readonly prisma: PrismaService) {}

  async isAdminGlobal(userId: string) {
    const r = await this.prisma.userRole.findFirst({
      where: { userId, role: 'admin_global' },
    });
    return !!r;
  }

  async ensureCompany(userId: string, companyId: string) {
    if (await this.isAdminGlobal(userId)) return;
    const member = await this.prisma.userCompany.findFirst({
      where: { userId, companyId, active: true },
    });
    if (member) return;

    // getFieldMe() lista as fazendas do usuário a partir só de FarmAssignment,
    // sem exigir UserCompany — então quem tem um vínculo ativo de fazenda
    // numa empresa (consultor, monitor, sangrador, operador) já enxerga essa
    // fazenda no app de campo. Sem essa checagem aqui, ações nessa mesma
    // fazenda (agenda, ocorrências etc.) eram bloqueadas por falta de
    // UserCompany, mesmo a fazenda aparecendo normalmente pro usuário —
    // sintoma: funciona numa fazenda e não em outra, sem erro visível.
    const farmLink = await this.prisma.farmAssignment.findFirst({
      where: { userId, companyId, OR: [{ endAt: null }, { endAt: { gte: new Date() } }] },
    });
    if (farmLink) return;

    throw new ForbiddenException('Sem acesso à empresa');
  }

  async accessibleCompanyIds(userId: string): Promise<string[] | 'all'> {
    if (await this.isAdminGlobal(userId)) return 'all';
    const [roles, links] = await Promise.all([
      this.prisma.userRole.findMany({
        where: { userId, companyId: { not: null } },
        select: { companyId: true },
      }),
      this.prisma.userCompany.findMany({
        where: { userId, active: true },
        select: { companyId: true },
      }),
    ]);
    return Array.from(
      new Set([
        ...roles.map((r) => r.companyId!).filter(Boolean),
        ...links.map((r) => r.companyId).filter(Boolean),
      ]),
    );
  }
}
