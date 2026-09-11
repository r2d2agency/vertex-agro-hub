import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

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

  async listEvents(userId: string, companyId: string, opts: { limit?: number; farmId?: string } = {}) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.alertEvent.findMany({
      where: { companyId, ...(opts.farmId ? { farmId: opts.farmId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: Math.min(opts.limit ?? 100, 500),
    });
  }

  // Chamada via HTTP (botão "Avaliar agora" no admin) — valida acesso do usuário.
  async evaluate(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    return this.evaluateCompanyRules(companyId);
  }

  // ---------- Execução automática (cron) ----------
  // Roda 1x por dia, sem precisar de ninguém clicar em "Avaliar agora".
  // Sem userId (não é uma requisição de um usuário): avalia todas as
  // empresas ativas diretamente, sem passar por CompanyAccess.
  @Cron(CronExpression.EVERY_DAY_AT_6AM, { name: 'daily-alerts-evaluation', timeZone: 'America/Sao_Paulo' })
  async runDailyEvaluation() {
    const companies = await this.prisma.company.findMany({
      where: { isDeleted: false, active: true },
      select: { id: true },
    });
    let totalCreated = 0;
    for (const c of companies) {
      try {
        const r = await this.evaluateCompanyRules(c.id);
        totalCreated += r.created;
      } catch (e) {
        this.logger.warn(`Falha ao avaliar alertas da empresa ${c.id}: ${e instanceof Error ? e.message : e}`);
      }
    }
    this.logger.log(`Avaliação diária de alertas concluída: ${companies.length} empresa(s), ${totalCreated} evento(s) criado(s).`);
    return { companies: companies.length, created: totalCreated };
  }

  // Núcleo da avaliação, reaproveitado tanto pela chamada manual (evaluate)
  // quanto pelo cron diário (runDailyEvaluation). Não recria um evento para a
  // mesma regra se já existe um evento dela criado nas últimas 20h — evita
  // duplicar alerta todo dia enquanto a mesma condição continuar valendo.
  private async evaluateCompanyRules(companyId: string) {
    const rules = await this.prisma.alertRule.findMany({ where: { companyId, active: true } });
    let created = 0;
    const recentCutoff = new Date(Date.now() - 20 * 3_600_000);

    const alreadyFiredRecently = async (ruleId: string) => {
      const recent = await this.prisma.alertEvent.findFirst({
        where: { ruleId, createdAt: { gte: recentCutoff } },
        select: { id: true },
      });
      return !!recent;
    };

    for (const r of rules) {
      if (await alreadyFiredRecently(r.id)) continue;

      if (r.kind === 'occurrence_open_days') {
        const days = Number((r.threshold as any)?.days ?? 3);
        const cutoff = new Date(Date.now() - days * 86400000);
        const stale = await this.prisma.occurrence.findMany({
          where: { companyId, isDeleted: false, status: { not: 'resolvida' }, date: { lte: cutoff } },
          select: { farmId: true },
        });
        if (stale.length > 0) {
          const byFarm = new Map<string | null, number>();
          for (const o of stale) byFarm.set(o.farmId, (byFarm.get(o.farmId) ?? 0) + 1);
          const farmIds = [...byFarm.keys()].filter((id): id is string => !!id);
          const farms = farmIds.length
            ? await this.prisma.farm.findMany({ where: { id: { in: farmIds } }, select: { id: true, name: true } })
            : [];
          const farmNameById = new Map(farms.map((f) => [f.id, f.name]));

          for (const [farmId, count] of byFarm.entries()) {
            const farmName = farmId ? farmNameById.get(farmId) : undefined;
            await this.prisma.alertEvent.create({ data: {
              companyId, farmId, ruleId: r.id, level: 'warning',
              title: farmName
                ? `${count} ocorrência(s) abertas há mais de ${days} dias em ${farmName}`
                : `${count} ocorrências abertas há mais de ${days} dias`,
              meta: { stale: count, days, farmId, farmName },
            } });
            created += 1;
          }
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
          const byFarm = new Map<string | null, number>();
          for (const d of off) byFarm.set(d.farmId, (byFarm.get(d.farmId) ?? 0) + 1);
          const farmIds = [...byFarm.keys()].filter((id): id is string => !!id);
          const farms = farmIds.length
            ? await this.prisma.farm.findMany({ where: { id: { in: farmIds } }, select: { id: true, name: true } })
            : [];
          const farmNameById = new Map(farms.map((f) => [f.id, f.name]));

          for (const [farmId, count] of byFarm.entries()) {
            const farmName = farmId ? farmNameById.get(farmId) : undefined;
            await this.prisma.alertEvent.create({ data: {
              companyId, farmId, ruleId: r.id, level: 'warning',
              title: farmName
                ? `${count} entrega(s) com DRC fora da faixa (${min}%–${max}%) em ${farmName}`
                : `${count} entregas com DRC fora da faixa (${min}%–${max}%)`,
              meta: { min, max, count, farmId, farmName },
            } });
            created += 1;
          }
        }
      } else if (r.kind === 'visit_overdue') {
        const days = Number((r.threshold as any)?.days ?? 30);
        const cutoff = new Date(Date.now() - days * 86400000);
        const assignments = await this.prisma.farmAssignment.findMany({
          where: { companyId, role: 'consultor', endAt: null },
          select: { farmId: true, startAt: true, farm: { select: { name: true } } },
        });
        if (assignments.length > 0) {
          const farmIds = [...new Set(assignments.map((a) => a.farmId))];
          const latest = await this.prisma.consultation.groupBy({
            by: ['farmId'],
            where: { companyId, isDeleted: false, farmId: { in: farmIds } },
            _max: { conductedAt: true },
          });
          const lastByFarm = new Map(
            latest.filter((l) => l.farmId != null).map((l) => [l.farmId as string, l._max.conductedAt as Date]),
          );
          const overdue = assignments.filter((a) => {
            const last = lastByFarm.get(a.farmId) ?? a.startAt;
            return last <= cutoff;
          });
          for (const a of overdue) {
            await this.prisma.alertEvent.create({ data: {
              companyId, farmId: a.farmId, ruleId: r.id, level: 'warning',
              title: `${a.farm.name} está sem visita de consultor há mais de ${days} dias`,
              meta: { days, farmId: a.farmId, farmName: a.farm.name },
            } });
            created += 1;
          }
        }
      }
    }
    return { evaluated: rules.length, created };
  }
}
