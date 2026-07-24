import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService, private readonly access: CompanyAccess) {}

  async record(params: {
    companyId?: string | null;
    userId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    diff?: any;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    try {
      await this.prisma.auditLog.create({ data: {
        companyId: params.companyId ?? null,
        userId: params.userId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        diff: params.diff ?? undefined,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      } });
    } catch { /* auditoria não pode derrubar operação */ }
  }

  async list(userId: string, companyId: string, opts: { entity?: string; action?: string; userId?: string; from?: string; to?: string; limit?: number } = {}) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.auditLog.findMany({
      where: {
        companyId,
        ...(opts.entity ? { entity: opts.entity } : {}),
        ...(opts.action ? { action: opts.action } : {}),
        ...(opts.userId ? { userId: opts.userId } : {}),
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
