import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService, private readonly access: CompanyAccess) {}

  async listRules(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.alertRule.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } });
  }
  async createRule(userId: string, dto: { companyId: string; kind: string; name: string; threshold?: any; channel?: string; active?: boolean }) {
    await this.access.ensureCompany(userId, dto.companyId);
    return this.prisma.alertRule.create({ data: {
      companyId: dto.companyId, kind: dto.kind, name: dto.name,
      threshold: dto.threshold ?? undefined,
      channel: dto.channel ?? 'in_app', active: dto.active ?? true,
    } });
  }
  async updateRule(userId: string, id: string, dto: any) {
    const cur = await this.prisma.alertRule.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    return this.prisma.alertRule.update({ where: { id }, data: { ...dto, companyId: undefined } });
  }
  async deleteRule(userId: string, id: string) {
    const cur = await this.prisma.alertRule.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    await this.prisma.alertRule.delete({ where: { id } });
    return { ok: true };
  }

  async listEvents(userId: string, companyId: string, opts: { limit?: number } = {}) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.alertEvent.findMany({
      where: { companyId }, orderBy: { createdAt: 'desc' },
      take: Math.min(opts.limit ?? 100, 500),
    });
  }

  async evaluate(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    const rules = await this.prisma.alertRule.findMany({ where: { companyId, active: true } });
    let created = 0;
    for (const r of rules) {
      if (r.kind === 'occurrence_open_days') {
        const days = Number((r.threshold as any)?.days ?? 3);
        const cutoff = new Date(Date.now() - days * 86400000);
        const stale = await this.prisma.occurrence.count({
          where: { companyId, isDeleted: false, status: { not: 'resolvida' }, date: { lte: cutoff } },
        });
        if (stale > 0) {
          await this.prisma.alertEvent.create({ data: {
            companyId, ruleId: r.id, level: 'warning',
            title: `${stale} ocorrências abertas há mais de ${days} dias`,
            meta: { stale, days },
          } });
          created += 1;
        }
      } else if (r.kind === 'drc_out_of_range') {
        const min = Number((r.threshold as any)?.min ?? 25);
        const max = Number((r.threshold as any)?.max ?? 45);
        const since = new Date(Date.now() - 7 * 86400000);
        const rows = await this.prisma.productionDelivery.findMany({
          where: { companyId, isDeleted: false, deliveryDate: { gte: since }, drcAvgPercent: { not: null } },
          select: { id: true, drcAvgPercent: true, deliveryDate: true, farmId: true },
        });
        const off = rows.filter((r2) => r2.drcAvgPercent! < min || r2.drcAvgPercent! > max);
        if (off.length > 0) {
          await this.prisma.alertEvent.create({ data: {
            companyId, ruleId: r.id, level: 'warning',
            title: `${off.length} entregas com DRC fora da faixa (${min}%–${max}%)`,
            meta: { min, max, count: off.length },
          } });
          created += 1;
        }
      }
    }
    return { evaluated: rules.length, created };
  }
}
