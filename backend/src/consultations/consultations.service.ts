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

  async getVisitStatus(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);

    const isManager = await this.prisma.userRole.findFirst({
      where: { userId, OR: [{ role: "admin_global" }, { companyId, role: { in: ["admin_empresa", "gestor"] } }] },
    });

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
