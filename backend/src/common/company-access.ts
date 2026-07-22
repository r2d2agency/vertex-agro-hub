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
    const member = await this.prisma.userRole.findFirst({
      where: { userId, companyId },
    });
    if (!member) throw new ForbiddenException('Sem acesso à empresa');
  }

  async accessibleCompanyIds(userId: string): Promise<string[] | 'all'> {
    if (await this.isAdminGlobal(userId)) return 'all';
    const roles = await this.prisma.userRole.findMany({
      where: { userId, companyId: { not: null } },
      select: { companyId: true },
    });
    return roles.map((r) => r.companyId!).filter(Boolean);
  }
}
