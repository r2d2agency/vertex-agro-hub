import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';

@Injectable()
export class LogsService {
  constructor(private readonly prisma: PrismaService, private readonly access: CompanyAccess) {}

  async write(level: string, source: string, message: string, meta?: any, companyId?: string) {
    try {
      await this.prisma.systemLog.create({ data: { level, source, message, meta: meta ?? undefined, companyId: companyId ?? null } });
    } catch { /* logging não pode derrubar operação */ }
  }

  async list(userId: string, companyId: string, opts: { level?: string; source?: string; q?: string; from?: string; to?: string; limit?: number } = {}) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.systemLog.findMany({
      where: {
        companyId,
        ...(opts.level ? { level: opts.level } : {}),
        ...(opts.source ? { source: opts.source } : {}),
        ...(opts.q ? { message: { contains: opts.q, mode: 'insensitive' as const } } : {}),
        ...(opts.from || opts.to ? { createdAt: {
          ...(opts.from ? { gte: new Date(opts.from) } : {}),
          ...(opts.to ? { lte: new Date(opts.to) } : {}),
        } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(opts.limit ?? 200, 500),
    });
  }
}
