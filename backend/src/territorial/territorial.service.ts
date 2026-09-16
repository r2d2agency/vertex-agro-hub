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
  UpdateOwnerDto,
  CreateOwnerDocumentDto,
  CreateFarmDocumentDto,
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
      owners: { select: { regime: true, owner: { select: { id: true, name: true, code: true, alternateCode: true } } } },
      buyers: { select: { slot: true, buyer: { select: { id: true, name: true, code: true } } }, orderBy: { slot: 'asc' as const } },
    };
  }

  // Owner e Buyer são N:N (uma fazenda pode ter vários proprietários/CNPJs e
  // vários compradores) — achata pra um array simples no formato que o
  // frontend consome, em vez do shape aninhado do join do Prisma.
  private withRelations<T extends {
    buyers: { slot: number; buyer: { id: string; name: string; code: string } }[];
    owners: { regime: string | null; owner: { id: string; name: string; code: string | null; alternateCode: string | null } }[];
  }>(farm: T) {
    const { buyers, owners, ...rest } = farm;
    return {
      ...rest,
      buyers: buyers.map((b) => ({ ...b.buyer, slot: b.slot })),
      owners: owners.map((o) => ({ ...o.owner, regime: o.regime })),
    };
  }

  async listFarms(userId: string, companyId: string, regionalId?: string) {
    await this.access.ensureCompany(userId, companyId);
    const farms = await this.prisma.farm.findMany({
      where: { companyId, isDeleted: false, ...(regionalId ? { regionalId } : {}) },
      orderBy: { name: 'asc' },
      include: this.farmInclude(),
    });
    return farms.map((f) => this.withRelations(f));
  }

  async getFarm(userId: string, id: string) {
    const f = await this.prisma.farm.findUnique({ where: { id }, include: this.farmInclude() });
    if (!f || f.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, f.companyId);
    return this.withRelations(f);
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

  private async ensureFarm(userId: string, farmId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    const farm = await this.prisma.farm.findFirst({ where: { id: farmId, companyId, isDeleted: false } });
    if (!farm) throw new NotFoundException('Fazenda não encontrada');
    return farm;
  }

  async listFarmDocuments(userId: string, farmId: string, companyId: string) {
    await this.ensureFarm(userId, farmId, companyId);
    return this.prisma.farmDocument.findMany({ where: { farmId, companyId }, orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }] });
  }

  async createFarmDocument(userId: string, farmId: string, dto: CreateFarmDocumentDto) {
    await this.ensureFarm(userId, farmId, dto.companyId);
    return this.prisma.farmDocument.create({
      data: {
        farmId,
        companyId: dto.companyId,
        kind: dto.kind,
        name: dto.name,
        number: dto.number ?? null,
        fileUrl: dto.fileUrl ?? null,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        notes: dto.notes ?? null,
      },
    });
  }

  async deleteFarmDocument(userId: string, farmId: string, documentId: string, companyId: string) {
    await this.ensureFarm(userId, farmId, companyId);
    const deleted = await this.prisma.farmDocument.deleteMany({ where: { id: documentId, farmId, companyId } });
    if (!deleted.count) throw new NotFoundException('Documento não encontrado');
    return { ok: true };
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

  private async ensureOwner(userId: string, ownerId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    const owner = await this.prisma.owner.findFirst({ where: { id: ownerId, companyId, isDeleted: false } });
    if (!owner) throw new NotFoundException('Proprietário não encontrado');
    return owner;
  }

  async getOwner(userId: string, ownerId: string, companyId: string) {
    return this.ensureOwner(userId, ownerId, companyId);
  }

  async updateOwner(userId: string, ownerId: string, companyId: string, dto: UpdateOwnerDto) {
    await this.ensureOwner(userId, ownerId, companyId);
    return this.prisma.owner.update({
      where: { id: ownerId },
      data: { ...dto, updatedById: userId },
    });
  }

  async listOwnerDocuments(userId: string, ownerId: string, companyId: string) {
    await this.ensureOwner(userId, ownerId, companyId);
    return this.prisma.ownerDocument.findMany({ where: { ownerId, companyId }, orderBy: { createdAt: 'desc' } });
  }

  async createOwnerDocument(userId: string, ownerId: string, dto: CreateOwnerDocumentDto) {
    await this.ensureOwner(userId, ownerId, dto.companyId);
    return this.prisma.ownerDocument.create({
      data: {
        ownerId,
        companyId: dto.companyId,
        kind: dto.kind,
        name: dto.name,
        number: dto.number ?? null,
        fileUrl: dto.fileUrl ?? null,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        notes: dto.notes ?? null,
      },
    });
  }

  async deleteOwnerDocument(userId: string, ownerId: string, documentId: string, companyId: string) {
    await this.ensureOwner(userId, ownerId, companyId);
    const deleted = await this.prisma.ownerDocument.deleteMany({ where: { id: documentId, ownerId, companyId } });
    if (!deleted.count) throw new NotFoundException('Documento não encontrado');
    return { ok: true };
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
