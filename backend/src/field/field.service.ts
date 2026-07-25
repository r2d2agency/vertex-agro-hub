import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';
import {
  CreatePhotoDto, CreateStimulationDto, UpdatePhotoDto, UpdateStimulationDto,
} from './dto';

@Injectable()
export class FieldService {
  constructor(private readonly prisma: PrismaService, private readonly access: CompanyAccess) {}

  // ---------- App de campo ----------
  async fieldMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, roles: { select: { role: true, companyId: true } } },
    });
    if (!user) throw new NotFoundException();
    const roleNames = user.roles.map((r) => r.role);
    const isAdmin = roleNames.includes('admin_global');
    const companyIds = isAdmin
      ? (await this.prisma.company.findMany({ where: { isDeleted: false }, select: { id: true } })).map((c) => c.id)
      : Array.from(new Set(user.roles.map((r) => r.companyId).filter(Boolean) as string[]));
    const companies = await this.prisma.company.findMany({
      where: { id: { in: companyIds }, isDeleted: false },
      select: { id: true, name: true, legalName: true },
      orderBy: { name: 'asc' },
    });
    const assignments = await this.prisma.farmAssignment.findMany({
      where: { userId, OR: [{ endAt: null }, { endAt: { gte: new Date() } }] },
      include: { farm: { select: { id: true, name: true, companyId: true, city: true, state: true, latitude: true, longitude: true } } },
      orderBy: { startAt: 'desc' },
    });
    const primaryRole = roleNames.includes('consultor')
      ? 'consultor'
      : roleNames.includes('monitor')
      ? 'monitor'
      : roleNames.includes('sangrador')
      ? 'sangrador'
      : (roleNames[0] ?? 'user');
    return {
      user: { id: user.id, email: user.email, fullName: user.fullName },
      roles: roleNames,
      primaryRole,
      isAdmin,
      companies,
      assignments: assignments.map((a) => ({
        id: a.id, role: a.role, startAt: a.startAt, endAt: a.endAt,
        farm: a.farm,
      })),
    };
  }

  async checkin(userId: string, dto: {
    companyId: string; farmId?: string; plotId?: string;
    latitude?: number; longitude?: number; accuracyM?: number;
    taskId?: string; notes?: string;
  }) {
    if (!dto?.companyId) throw new NotFoundException('companyId obrigatório');
    await this.access.ensureCompany(userId, dto.companyId);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, email: true } });
    const who = user?.fullName || user?.email || 'usuário';
    const parts: string[] = [];
    if (dto.latitude != null && dto.longitude != null) {
      parts.push(`Lat ${Number(dto.latitude).toFixed(6)}, Lng ${Number(dto.longitude).toFixed(6)}`);
    }
    if (dto.accuracyM != null) parts.push(`±${Math.round(Number(dto.accuracyM))}m`);
    if (dto.notes) parts.push(dto.notes);
    const occ = await this.prisma.occurrence.create({
      data: {
        companyId: dto.companyId,
        farmId: dto.farmId ?? null,
        plotId: dto.plotId ?? null,
        date: new Date(),
        type: 'checkin',
        severity: 'baixa',
        status: 'resolvida',
        title: `Check-in de ${who}`,
        description: parts.join(' · ') || null,
        responsible: who,
        resolvedAt: new Date(),
        createdById: userId,
        updatedById: userId,
      },
    });
    if (dto.taskId) {
      await this.prisma.scheduledTask.updateMany({
        where: { id: dto.taskId, companyId: dto.companyId },
        data: { status: 'concluida', completedAt: new Date(), updatedById: userId, version: { increment: 1 } },
      }).catch(() => undefined);
    }
    return occ;
  }



  // ---------- Stimulations ----------
  async listStimulations(userId: string, companyId: string, opts: { farmId?: string; plotId?: string; from?: string; to?: string } = {}) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.stimulation.findMany({
      where: {
        companyId, isDeleted: false,
        ...(opts.farmId ? { farmId: opts.farmId } : {}),
        ...(opts.plotId ? { plotId: opts.plotId } : {}),
        ...(opts.from || opts.to ? {
          date: {
            ...(opts.from ? { gte: new Date(opts.from) } : {}),
            ...(opts.to ? { lte: new Date(opts.to) } : {}),
          },
        } : {}),
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
  }

  async createStimulation(userId: string, dto: CreateStimulationDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    const { date, ...rest } = dto;
    return this.prisma.stimulation.create({
      data: { ...rest, date: new Date(date), createdById: userId, updatedById: userId },
    });
  }

  async updateStimulation(userId: string, id: string, dto: UpdateStimulationDto) {
    const cur = await this.prisma.stimulation.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    const { date, ...rest } = dto;
    return this.prisma.stimulation.update({
      where: { id },
      data: {
        ...rest,
        ...(date ? { date: new Date(date) } : {}),
        updatedById: userId, version: { increment: 1 },
      },
    });
  }

  async deleteStimulation(userId: string, id: string) {
    const cur = await this.prisma.stimulation.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    return this.prisma.stimulation.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), updatedById: userId, version: { increment: 1 } },
    });
  }

  // ---------- Photos ----------
  async listPhotos(userId: string, companyId: string, opts: { farmId?: string; category?: string; from?: string; to?: string } = {}) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.photo.findMany({
      where: {
        companyId, isDeleted: false,
        ...(opts.farmId ? { farmId: opts.farmId } : {}),
        ...(opts.category ? { category: opts.category } : {}),
        ...(opts.from || opts.to ? {
          takenAt: {
            ...(opts.from ? { gte: new Date(opts.from) } : {}),
            ...(opts.to ? { lte: new Date(opts.to) } : {}),
          },
        } : {}),
      },
      orderBy: [{ takenAt: 'desc' }],
      take: 500,
    });
  }

  async createPhoto(userId: string, dto: CreatePhotoDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    const { takenAt, ...rest } = dto;
    return this.prisma.photo.create({
      data: {
        ...rest,
        takenAt: takenAt ? new Date(takenAt) : new Date(),
        createdById: userId, updatedById: userId,
      },
    });
  }

  async updatePhoto(userId: string, id: string, dto: UpdatePhotoDto) {
    const cur = await this.prisma.photo.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    const { takenAt, ...rest } = dto;
    return this.prisma.photo.update({
      where: { id },
      data: {
        ...rest,
        ...(takenAt ? { takenAt: new Date(takenAt) } : {}),
        updatedById: userId, version: { increment: 1 },
      },
    });
  }

  async deletePhoto(userId: string, id: string) {
    const cur = await this.prisma.photo.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    return this.prisma.photo.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), updatedById: userId, version: { increment: 1 } },
    });
  }

  // ---------- History (timeline) ----------
  async history(userId: string, companyId: string, opts: { farmId?: string; from?: string; to?: string; limit?: number } = {}) {
    await this.access.ensureCompany(userId, companyId);
    const limit = Math.min(opts.limit ?? 200, 500);
    const dateFilter = opts.from || opts.to ? {
      ...(opts.from ? { gte: new Date(opts.from) } : {}),
      ...(opts.to ? { lte: new Date(opts.to) } : {}),
    } : undefined;
    const farm = opts.farmId ? { farmId: opts.farmId } : {};
    const base = { companyId, isDeleted: false, ...farm };

    const [taps, dels, occ, tasks, stims, photos] = await Promise.all([
      this.prisma.tappingRecord.findMany({
        where: { ...base, ...(dateFilter ? { date: dateFilter } : {}) },
        orderBy: { date: 'desc' }, take: limit,
      }),
      this.prisma.productionDelivery.findMany({
        where: { ...base, ...(dateFilter ? { deliveryDate: dateFilter } : {}) },
        orderBy: { deliveryDate: 'desc' }, take: limit,
      }),
      this.prisma.occurrence.findMany({
        where: { ...base, ...(dateFilter ? { date: dateFilter } : {}) },
        orderBy: { date: 'desc' }, take: limit,
      }),
      this.prisma.scheduledTask.findMany({
        where: { ...base, ...(dateFilter ? { scheduledAt: dateFilter } : {}) },
        orderBy: { scheduledAt: 'desc' }, take: limit,
      }),
      this.prisma.stimulation.findMany({
        where: { ...base, ...(dateFilter ? { date: dateFilter } : {}) },
        orderBy: { date: 'desc' }, take: limit,
      }),
      this.prisma.photo.findMany({
        where: { ...base, ...(dateFilter ? { takenAt: dateFilter } : {}) },
        orderBy: { takenAt: 'desc' }, take: limit,
      }),
    ]);

    type Event = {
      id: string; kind: string; date: string; title: string; subtitle?: string;
      farmId?: string | null; meta?: Record<string, any>;
    };
    const events: Event[] = [];

    for (const t of taps) events.push({
      id: `tap-${t.id}`, kind: 'sangria', date: t.date.toISOString(),
      title: `Sangria — ${t.sangradorName}`,
      subtitle: [t.liters != null ? `${t.liters} L` : null, t.dryKg != null ? `${t.dryKg} kg secos` : null].filter(Boolean).join(' · '),
      farmId: t.farmId,
    });
    for (const d of dels) events.push({
      id: `del-${d.id}`, kind: 'producao', date: d.deliveryDate.toISOString(),
      title: `Entrega ${d.latexType ?? ''}`.trim(),
      subtitle: [d.netWeightKg != null ? `${d.netWeightKg} kg líq.` : null, d.drcAvgPercent != null ? `DRC ${d.drcAvgPercent}%` : null].filter(Boolean).join(' · '),
      farmId: d.farmId,
    });
    for (const o of occ) events.push({
      id: `occ-${o.id}`, kind: 'ocorrencia', date: o.date.toISOString(),
      title: o.title, subtitle: `${o.type} · ${o.severity} · ${o.status}`, farmId: o.farmId,
    });
    for (const s of tasks) events.push({
      id: `task-${s.id}`, kind: 'agenda', date: s.scheduledAt.toISOString(),
      title: s.title, subtitle: `${s.category} · ${s.status}`, farmId: s.farmId,
    });
    for (const s of stims) events.push({
      id: `stim-${s.id}`, kind: 'estimulacao', date: s.date.toISOString(),
      title: `Estimulação — ${s.product}`,
      subtitle: [s.concentration, s.method].filter(Boolean).join(' · '),
      farmId: s.farmId,
    });
    for (const p of photos) events.push({
      id: `photo-${p.id}`, kind: 'fotografia', date: p.takenAt.toISOString(),
      title: p.caption || 'Fotografia',
      subtitle: p.category ?? undefined,
      farmId: p.farmId, meta: { url: p.url },
    });

    events.sort((a, b) => (a.date < b.date ? 1 : -1));
    return events.slice(0, limit);
  }
}
