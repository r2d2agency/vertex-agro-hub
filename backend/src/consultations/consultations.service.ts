import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CompanyAccess } from "../common/company-access";
import { CreateConsultationDto, UpdateConsultationDto } from "./dto";

@Injectable()
export class ConsultationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CompanyAccess,
  ) {}

  async list(
    userId: string,
    companyId: string,
    opts: { farmId?: string; consultantId?: string; from?: string; to?: string } = {},
  ) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.consultation.findMany({
      where: {
        companyId,
        isDeleted: false,
        ...(opts.farmId ? { farmId: opts.farmId } : {}),
        ...(opts.consultantId ? { consultantId: opts.consultantId } : {}),
        ...(opts.from || opts.to
          ? {
              conductedAt: {
                ...(opts.from ? { gte: new Date(opts.from) } : {}),
                ...(opts.to ? { lte: new Date(opts.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ conductedAt: "desc" }, { createdAt: "desc" }],
      take: 500,
    });
  }

  async create(userId: string, dto: CreateConsultationDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    const { conductedAt, ...rest } = dto;
    return this.prisma.consultation.create({
      data: {
        ...rest,
        consultantId: dto.consultantId ?? userId,
        conductedAt: new Date(conductedAt),
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateConsultationDto) {
    const current = await this.prisma.consultation.findUnique({ where: { id } });
    if (!current || current.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, current.companyId);
    const { conductedAt, ...rest } = dto;
    return this.prisma.consultation.update({
      where: { id },
      data: {
        ...rest,
        ...(conductedAt ? { conductedAt: new Date(conductedAt) } : {}),
        updatedById: userId,
        version: { increment: 1 },
      },
    });
  }

  async remove(userId: string, id: string) {
    const current = await this.prisma.consultation.findUnique({ where: { id } });
    if (!current || current.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, current.companyId);
    return this.prisma.consultation.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedById: userId,
        version: { increment: 1 },
      },
    });
  }

  // ---------- Visita obrigatória ----------
  // Prazo padrão (dias) sem visita registrada antes de considerar a fazenda
  // "atrasada" para o consultor responsável. Sem cron: calculado sob demanda
  // sempre que o app do consultor ou o admin consultam este endpoint.
  private readonly DEFAULT_VISIT_FREQUENCY_DAYS = 30;

  private async isCompanyManager(userId: string, companyId: string) {
    const found = await this.prisma.userRole.findFirst({
      where: { userId, OR: [{ role: "admin_global" }, { companyId, role: { in: ["admin_empresa", "gestor"] } }] },
    });
    return !!found;
  }

  async getVisitStatus(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);

    const isManager = await this.isCompanyManager(userId, companyId);

    const settings = await this.prisma.companySettings.findUnique({ where: { companyId } });
    const frequencyDays =
      Number((settings?.extra as any)?.visitFrequencyDays) || this.DEFAULT_VISIT_FREQUENCY_DAYS;

    const assignments = await this.prisma.farmAssignment.findMany({
      where: {
        companyId, role: "consultor", endAt: null,
        ...(isManager ? {} : { userId }),
      },
      include: {
        farm: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (assignments.length === 0) return { frequencyDays, farms: [] };

    const farmIds = [...new Set(assignments.map((a) => a.farmId))];
    const latest = await this.prisma.consultation.groupBy({
      by: ["farmId"],
      where: { companyId, isDeleted: false, farmId: { in: farmIds } },
      _max: { conductedAt: true },
    });
    const lastByFarm = new Map(
      latest.filter((l) => l.farmId != null).map((l) => [l.farmId as string, l._max.conductedAt as Date]),
    );

    const now = Date.now();
    const farms = assignments.map((a) => {
      const lastVisitAt = lastByFarm.get(a.farmId) ?? null;
      const daysSinceVisit = lastVisitAt
        ? Math.floor((now - lastVisitAt.getTime()) / 86400000)
        : Math.floor((now - a.startAt.getTime()) / 86400000);
      return {
        assignmentId: a.id,
        farmId: a.farmId,
        farmName: a.farm.name,
        consultantUserId: a.userId,
        consultantName: a.user.fullName || a.user.email,
        lastVisitAt,
        daysSinceVisit,
        overdue: daysSinceVisit > frequencyDays,
      };
    });

    return { frequencyDays, farms };
  }

  // ---------- Dashboard do consultor ----------
  // Escopado como getVisitStatus: consultor vê só suas fazendas, admin/gestor
  // vê todas as fazendas da empresa com consultor vinculado.
  async getDashboard(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    const isManager = await this.isCompanyManager(userId, companyId);

    const assignments = await this.prisma.farmAssignment.findMany({
      where: { companyId, role: "consultor", endAt: null, ...(isManager ? {} : { userId }) },
      include: { farm: { select: { id: true, name: true, totalAreaHa: true } } },
    });
    const farmIds = [...new Set(assignments.map((a) => a.farmId))];
    if (farmIds.length === 0) {
      return { totalFarms: 0, totalMonitors: 0, totalSangradores: 0, avgQuality: null, topFarms: [], productivityKgHa: null, farmStats: [] };
    }

    const since90 = new Date(Date.now() - 90 * 86400000);
    const since30 = new Date(Date.now() - 30 * 86400000);

    const [teamAssignments, consultations, deliveries] = await Promise.all([
      this.prisma.farmAssignment.findMany({
        where: { companyId, farmId: { in: farmIds }, endAt: null, role: { in: ["monitor", "sangrador"] } },
        select: { farmId: true, role: true, userId: true },
      }),
      this.prisma.consultation.findMany({
        where: { companyId, isDeleted: false, farmId: { in: farmIds }, conductedAt: { gte: since90 }, tappingQuality: { not: null } },
        select: { farmId: true, tappingQuality: true },
      }),
      this.prisma.productionDelivery.findMany({
        where: { companyId, isDeleted: false, farmId: { in: farmIds }, deliveryDate: { gte: since30 } },
        select: { farmId: true, netWeightKg: true, drcAvgPercent: true, dryKg: true },
      }),
    ]);

    const totalMonitors = new Set(teamAssignments.filter((a) => a.role === "monitor").map((a) => a.userId)).size;
    const totalSangradores = new Set(teamAssignments.filter((a) => a.role === "sangrador").map((a) => a.userId)).size;

    const qualityByFarm = new Map<string, { sum: number; count: number }>();
    for (const c of consultations) {
      if (!c.farmId || c.tappingQuality == null) continue;
      const cur = qualityByFarm.get(c.farmId) ?? { sum: 0, count: 0 };
      cur.sum += c.tappingQuality;
      cur.count += 1;
      qualityByFarm.set(c.farmId, cur);
    }
    const avgQuality = consultations.length
      ? +(consultations.reduce((a, c) => a + (c.tappingQuality ?? 0), 0) / consultations.length).toFixed(1)
      : null;

    const topFarms = assignments
      .map((a) => {
        const q = qualityByFarm.get(a.farmId);
        return { farmId: a.farmId, farmName: a.farm.name, avgQuality: q ? +(q.sum / q.count).toFixed(1) : null };
      })
      .filter((f) => f.avgQuality != null)
      .sort((a, b) => (b.avgQuality ?? 0) - (a.avgQuality ?? 0))
      .slice(0, 5);

    const dryKgByFarm = (d: typeof deliveries) =>
      d.reduce((acc, x) => acc + (x.dryKg ?? (x.netWeightKg && x.drcAvgPercent ? x.netWeightKg * (x.drcAvgPercent / 100) : 0)), 0);

    const totalDryKg = dryKgByFarm(deliveries);
    const totalAreaHa = assignments.reduce((acc, a) => acc + (a.farm.totalAreaHa ?? 0), 0);
    const productivityKgHa = totalAreaHa > 0 ? +(totalDryKg / totalAreaHa).toFixed(1) : null;

    const deliveriesByFarm = new Map<string, typeof deliveries>();
    for (const d of deliveries) {
      if (!d.farmId) continue;
      const cur = deliveriesByFarm.get(d.farmId) ?? [];
      cur.push(d);
      deliveriesByFarm.set(d.farmId, cur);
    }

    // Cobre TODAS as fazendas do consultor (diferente de topFarms, que só traz
    // as top 5 com qualidade registrada) — usado pela aba de KPI por fazenda.
    const farmStats = assignments.map((a) => {
      const q = qualityByFarm.get(a.farmId);
      const farmDryKg = dryKgByFarm(deliveriesByFarm.get(a.farmId) ?? []);
      const farmAreaHa = a.farm.totalAreaHa ?? 0;
      return {
        farmId: a.farmId,
        farmName: a.farm.name,
        avgQuality: q ? +(q.sum / q.count).toFixed(1) : null,
        productivityKgHa: farmAreaHa > 0 ? +(farmDryKg / farmAreaHa).toFixed(1) : null,
        totalDryKg: +farmDryKg.toFixed(1),
      };
    });

    return {
      totalFarms: farmIds.length,
      totalMonitors,
      totalSangradores,
      avgQuality,
      topFarms,
      productivityKgHa,
      farmStats,
    };
  }

  async justifyMissedVisit(
    userId: string,
    dto: { companyId: string; farmId: string; reason: string },
  ) {
    await this.access.ensureCompany(userId, dto.companyId);
    const farm = await this.prisma.farm.findFirst({ where: { id: dto.farmId, companyId: dto.companyId } });
    if (!farm) throw new NotFoundException("Fazenda não encontrada");
    return this.prisma.occurrence.create({
      data: {
        companyId: dto.companyId,
        farmId: dto.farmId,
        date: new Date(),
        type: "falta_visita",
        severity: "baixa",
        status: "resolvida",
        title: `Justificativa de falta de visita — ${farm.name}`,
        description: dto.reason,
        resolvedAt: new Date(),
        createdById: userId,
        updatedById: userId,
      },
    });
  }
}
