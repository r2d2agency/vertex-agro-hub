import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';
import {
  CreateFarmDto,
  CreatePlotDto,
  CreateRegionalDto,
  UpdateFarmDto,
  UpdatePlotDto,
  UpdateRegionalDto,
} from './dto';
import { computeGeo } from './geo.util';

// Se boundary vem no payload, calcula centroid/bbox e (para farm) preenche
// latitude/longitude quando não informadas manualmente.
function withFarmGeo<T extends Record<string, any>>(dto: T): T {
  if (dto.boundary === undefined) return dto;
  if (dto.boundary === null) {
    return { ...dto, centroidLat: null, centroidLng: null, bboxJson: null };
  }
  const geo = computeGeo(dto.boundary);
  const patched: Record<string, any> = {
    ...dto,
    centroidLat: geo.centroidLat,
    centroidLng: geo.centroidLng,
    bboxJson: geo.bboxJson,
  };
  if (dto.latitude === undefined && geo.centroidLat != null) patched.latitude = geo.centroidLat;
  if (dto.longitude === undefined && geo.centroidLng != null) patched.longitude = geo.centroidLng;
  return patched as T;
}

function withPlotGeo<T extends Record<string, any>>(dto: T): T {
  if (dto.boundary === undefined) return dto;
  if (dto.boundary === null) {
    return { ...dto, centroidLat: null, centroidLng: null, bboxJson: null };
  }
  const geo = computeGeo(dto.boundary);
  return {
    ...dto,
    centroidLat: geo.centroidLat,
    centroidLng: geo.centroidLng,
    bboxJson: geo.bboxJson,
  };
}


@Injectable()
export class TerritorialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CompanyAccess,
  ) {}

  // ---------- Regionals ----------
  async listRegionals(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.regional.findMany({
      where: { companyId, isDeleted: false },
      orderBy: { name: 'asc' },
      include: { managerUser: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async createRegional(userId: string, dto: CreateRegionalDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    return this.prisma.regional.create({
      data: { ...dto, createdById: userId, updatedById: userId },
      include: { managerUser: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async updateRegional(userId: string, id: string, dto: UpdateRegionalDto) {
    const current = await this.prisma.regional.findUnique({ where: { id } });
    if (!current || current.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, current.companyId);
    return this.prisma.regional.update({
      where: { id },
      data: { ...dto, updatedById: userId, version: { increment: 1 } },
      include: { managerUser: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async deleteRegional(userId: string, id: string) {
    const current = await this.prisma.regional.findUnique({ where: { id } });
    if (!current || current.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, current.companyId);
    return this.prisma.regional.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), updatedById: userId, version: { increment: 1 } },
    });
  }

  // ---------- Farms ----------
  private farmInclude() {
    return {
      regional: { select: { id: true, name: true } },
      ownerRef: { select: { id: true, name: true, code: true, alternateCode: true } },
      buyers: { select: { slot: true, buyer: { select: { id: true, name: true, code: true } } }, orderBy: { slot: 'asc' as const } },
    };
  }

  private withBuyers<T extends { buyers: { slot: number; buyer: { id: string; name: string; code: string } }[] }>(farm: T) {
    const { buyers, ...rest } = farm;
    return { ...rest, buyers: buyers.map((b) => ({ ...b.buyer, slot: b.slot })) };
  }

  async listFarms(userId: string, companyId: string, regionalId?: string) {
    await this.access.ensureCompany(userId, companyId);
    const farms = await this.prisma.farm.findMany({
      where: { companyId, isDeleted: false, ...(regionalId ? { regionalId } : {}) },
      orderBy: { name: 'asc' },
      include: this.farmInclude(),
    });
    return farms.map((f) => this.withBuyers(f));
  }

  async getFarm(userId: string, id: string) {
    const f = await this.prisma.farm.findUnique({ where: { id }, include: this.farmInclude() });
    if (!f || f.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, f.companyId);
    return this.withBuyers(f);
  }

  async createFarm(userId: string, dto: CreateFarmDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    if (dto.regionalId) {
      const r = await this.prisma.regional.findUnique({ where: { id: dto.regionalId } });
      if (!r || r.companyId !== dto.companyId) throw new ForbiddenException('Regional inválida');
    }
    return this.prisma.farm.create({ data: { ...withFarmGeo(dto), createdById: userId, updatedById: userId } as any });
  }

  async updateFarm(userId: string, id: string, dto: UpdateFarmDto) {
    const current = await this.prisma.farm.findUnique({ where: { id } });
    if (!current || current.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, current.companyId);
    if (dto.regionalId) {
      const r = await this.prisma.regional.findUnique({ where: { id: dto.regionalId } });
      if (!r || r.companyId !== current.companyId) throw new ForbiddenException('Regional inválida');
    }
    return this.prisma.farm.update({
      where: { id },
      data: { ...withFarmGeo(dto), updatedById: userId, version: { increment: 1 } } as any,
    });
  }

  async deleteFarm(userId: string, id: string) {
    const current = await this.prisma.farm.findUnique({ where: { id } });
    if (!current || current.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, current.companyId);

    return this.prisma.farm.update({
      where: { id },
      // Libera o "code" (chave única por empresa) pra reuso — sem isso uma
      // fazenda nova não poderia reaproveitar o código de uma excluída.
      data: { isDeleted: true, deletedAt: new Date(), code: null, updatedById: userId, version: { increment: 1 } },
    });
  }

  // ---------- Plots ----------
  async listPlots(userId: string, companyId: string, farmId?: string) {
    await this.access.ensureCompany(userId, companyId);
    const plots = await this.prisma.plot.findMany({
      where: { companyId, isDeleted: false, ...(farmId ? { farmId } : {}) },
      orderBy: { name: 'asc' },
      include: { farm: { select: { id: true, name: true } } },
    });
    return this.withTappingSchedule(companyId, plots);
  }

  // Calcula, para cada talhão, a data da última sangria e o prazo previsto para a
  // próxima (última data + frequência em dias da tabela de sangria associada ao
  // talhão via Plot.tappingSystem, casando com notation/name da TappingTable).
  private async withTappingSchedule<T extends { id: string; tappingSystem: string | null }>(
    companyId: string,
    plots: T[],
  ): Promise<(T & { lastTappingDate: Date | null; nextTappingDate: Date | null })[]> {
    if (plots.length === 0) return [];

    const tables = await this.prisma.tappingTable.findMany({
      where: { companyId, isDeleted: false },
      select: { name: true, notation: true, frequencyDays: true },
    });
    const freqByLabel = new Map<string, number>();
    for (const t of tables) {
      if (t.frequencyDays == null) continue;
      if (t.notation) freqByLabel.set(t.notation, t.frequencyDays);
      freqByLabel.set(t.name, t.frequencyDays);
    }

    const plotIds = plots.map((p) => p.id);
    const latest = await this.prisma.tappingRecord.groupBy({
      by: ['plotId'],
      where: { companyId, isDeleted: false, plotId: { in: plotIds } },
      _max: { date: true },
    });
    const lastDateByPlot = new Map(
      latest.filter((l) => l.plotId != null).map((l) => [l.plotId as string, l._max.date]),
    );

    return plots.map((p) => {
      const lastTappingDate = lastDateByPlot.get(p.id) ?? null;
      const freq = p.tappingSystem ? freqByLabel.get(p.tappingSystem) : undefined;
      const nextTappingDate =
        lastTappingDate && freq ? new Date(lastTappingDate.getTime() + freq * 86400000) : null;
      return { ...p, lastTappingDate, nextTappingDate };
    });
  }

  async createPlot(userId: string, dto: CreatePlotDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    const farm = await this.prisma.farm.findUnique({ where: { id: dto.farmId } });
    if (!farm || farm.companyId !== dto.companyId) throw new ForbiddenException('Fazenda inválida');
    return this.prisma.plot.create({ data: { ...withPlotGeo(dto), createdById: userId, updatedById: userId } as any });
  }

  async updatePlot(userId: string, id: string, dto: UpdatePlotDto) {
    const current = await this.prisma.plot.findUnique({ where: { id } });
    if (!current || current.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, current.companyId);
    if (dto.farmId) {
      const farm = await this.prisma.farm.findUnique({ where: { id: dto.farmId } });
      if (!farm || farm.companyId !== current.companyId) throw new ForbiddenException('Fazenda inválida');
    }
    return this.prisma.plot.update({
      where: { id },
      data: { ...withPlotGeo(dto), updatedById: userId, version: { increment: 1 } } as any,
    });
  }


  async deletePlot(userId: string, id: string) {
    const current = await this.prisma.plot.findUnique({ where: { id } });
    if (!current || current.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, current.companyId);
    return this.prisma.plot.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), updatedById: userId, version: { increment: 1 } },
    });
  }

  // ---------- Proprietários e compradores (leitura — CRUD completo fica pra
  // uma tela de portfólio futura; hoje só são criados/atualizados via
  // importação de fazendas) ----------
  async listOwners(userId: string, companyId: string, q?: string) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.owner.findMany({
      where: {
        companyId, isDeleted: false,
        ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { code: { contains: q, mode: 'insensitive' } }, { alternateCode: { contains: q, mode: 'insensitive' } }] } : {}),
      },
      select: { id: true, name: true, code: true, alternateCode: true },
      orderBy: { name: 'asc' },
      take: 20,
    });
  }

  async listBuyers(userId: string, companyId: string, q?: string) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.buyer.findMany({
      where: {
        companyId, isDeleted: false,
        ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { code: { contains: q, mode: 'insensitive' } }] } : {}),
      },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
      take: 20,
    });
  }
}
