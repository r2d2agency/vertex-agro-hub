import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';
import { seedCompanyCatalog } from '../bootstrap/seed-catalog';
import {
  CreateCloneDto,
  CreateTappingTableDto,
  UpdateCloneDto,
  UpdateTappingTableDto,
} from './dto';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CompanyAccess,
  ) {}

  // ---------- Clones ----------
  async listClones(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    await this.ensureSeeded(companyId);
    return this.prisma.clone.findMany({
      where: { companyId, isDeleted: false },
      orderBy: { name: 'asc' },
    });
  }

  private async ensureSeeded(companyId: string) {
    const [c, t] = await Promise.all([
      this.prisma.clone.count({ where: { companyId, isDeleted: false } }),
      this.prisma.tappingTable.count({ where: { companyId, isDeleted: false } }),
    ]);
    if (c === 0 || t === 0) {
      try {
        await seedCompanyCatalog(this.prisma, companyId);
      } catch (err) {
        console.error('[catalog] seed on-demand falhou:', err);
      }
    }
  }

  async createClone(userId: string, dto: CreateCloneDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    return this.prisma.clone.create({
      data: { ...dto, createdById: userId, updatedById: userId },
    });
  }

  async updateClone(userId: string, id: string, dto: UpdateCloneDto) {
    const current = await this.prisma.clone.findUnique({ where: { id } });
    if (!current || current.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, current.companyId);
    return this.prisma.clone.update({
      where: { id },
      data: { ...dto, updatedById: userId, version: { increment: 1 } },
    });
  }

  async deleteClone(userId: string, id: string) {
    const current = await this.prisma.clone.findUnique({ where: { id } });
    if (!current || current.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, current.companyId);
    return this.prisma.clone.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedById: userId,
        version: { increment: 1 },
      },
    });
  }

  // ---------- Tapping Tables ----------
  async listTables(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.tappingTable.findMany({
      where: { companyId, isDeleted: false },
      orderBy: { name: 'asc' },
    });
  }

  async createTable(userId: string, dto: CreateTappingTableDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    return this.prisma.tappingTable.create({
      data: { ...dto, createdById: userId, updatedById: userId },
    });
  }

  async updateTable(userId: string, id: string, dto: UpdateTappingTableDto) {
    const current = await this.prisma.tappingTable.findUnique({ where: { id } });
    if (!current || current.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, current.companyId);
    return this.prisma.tappingTable.update({
      where: { id },
      data: { ...dto, updatedById: userId, version: { increment: 1 } },
    });
  }

  async deleteTable(userId: string, id: string) {
    const current = await this.prisma.tappingTable.findUnique({ where: { id } });
    if (!current || current.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, current.companyId);
    return this.prisma.tappingTable.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedById: userId,
        version: { increment: 1 },
      },
    });
  }
}
