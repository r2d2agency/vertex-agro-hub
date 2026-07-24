import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService, private readonly access: CompanyAccess) {}

  async get(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    const cur = await this.prisma.companySettings.findUnique({ where: { companyId } });
    if (cur) return cur;
    return this.prisma.companySettings.create({ data: { companyId } });
  }

  async update(userId: string, companyId: string, dto: any) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.companySettings.upsert({
      where: { companyId },
      create: { companyId, ...dto },
      update: dto,
    });
  }
}
