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
    });
  }

  async createRegional(userId: string, dto: CreateRegionalDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    return this.prisma.regional.create({
      data: { ...dto, createdById: userId, updatedById: userId },
    });
  }

  async updateRegional(userId: string, id: string, dto: UpdateRegionalDto) {
    const current = await this.prisma.regional.findUnique({ where: { id } });
    if (!current || current.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, current.companyId);
    return this.prisma.regional.update({
      where: { id },
      data: { ...dto, updatedById: userId, version: { increment: 1 } },
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
  async listFarms(userId: string, companyId: string, regionalId?: string) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.farm.findMany({
      where: { companyId, isDeleted: false, ...(regionalId ? { regionalId } : {}) },
      orderBy: { name: 'asc' },
      include: { regional: { select: { id: true, name: true } } },
    });
  }

  async getFarm(userId: string, id: string) {
    const f = await this.prisma.farm.findUnique({ where: { id }, include: { regional: true } });
    if (!f || f.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, f.companyId);
    return f;
  }

  async createFarm(userId: string, dto: CreateFarmDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    if (dto.regionalId) {
      const r = await this.prisma.regional.findUnique({ where: { id: dto.regionalId } });
      if (!r || r.companyId !== dto.companyId) throw new ForbiddenException('Regional inválida');
    }
    return this.prisma.farm.create({ data: { ...dto, createdById: userId, updatedById: userId } });
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
      data: { ...dto, updatedById: userId, version: { increment: 1 } },
    });
  }

  async deleteFarm(userId: string, id: string) {
    const current = await this.prisma.farm.findUnique({ where: { id } });
    if (!current || current.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, current.companyId);
    return this.prisma.farm.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), updatedById: userId, version: { increment: 1 } },
    });
  }

  // ---------- Plots ----------
  async listPlots(userId: string, companyId: string, farmId?: string) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.plot.findMany({
      where: { companyId, isDeleted: false, ...(farmId ? { farmId } : {}) },
      orderBy: { name: 'asc' },
      include: { farm: { select: { id: true, name: true } } },
    });
  }

  async createPlot(userId: string, dto: CreatePlotDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    const farm = await this.prisma.farm.findUnique({ where: { id: dto.farmId } });
    if (!farm || farm.companyId !== dto.companyId) throw new ForbiddenException('Fazenda inválida');
    return this.prisma.plot.create({ data: { ...dto, createdById: userId, updatedById: userId } as any });
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
      data: { ...dto, updatedById: userId, version: { increment: 1 } } as any,
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
}
