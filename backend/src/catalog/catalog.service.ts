import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';
import { seedCompanyCatalog } from '../bootstrap/seed-catalog';
import {
  CreateCloneDto,
  CreateTappingTableDto,
  UpdateCloneDto,
  UpdateTappingTableDto, CreateTappingTableTemplateDto, UpdateTappingTableTemplateDto,
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
    await this.ensureSeeded(companyId);
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

  async listTemplates(userId: string, companyId: string) { await this.access.ensureCompany(userId, companyId); return this.prisma.tappingTableTemplate.findMany({ where: { companyId, isDeleted: false }, include: { items: { orderBy: { position: 'asc' } } }, orderBy: { name: 'asc' } }); }
  async createTemplate(userId: string, dto: CreateTappingTableTemplateDto) { await this.access.ensureCompany(userId, dto.companyId); const tables = await this.prisma.tappingTable.count({ where: { companyId: dto.companyId, id: { in: dto.tableIds }, isDeleted: false } }); if (tables !== dto.tableIds.length) throw new NotFoundException('Tabela inválida'); return this.prisma.tappingTableTemplate.create({ data: { companyId: dto.companyId, name: dto.name, description: dto.description, active: dto.active ?? true, createdById: userId, updatedById: userId, items: { create: dto.tableIds.map((tappingTableId, position) => ({ tappingTableId, position })) } }, include: { items: true } }); }
  async updateTemplate(userId: string, id: string, dto: UpdateTappingTableTemplateDto) { const t = await this.prisma.tappingTableTemplate.findUnique({ where: { id } }); if (!t) throw new NotFoundException(); await this.access.ensureCompany(userId, t.companyId); if (dto.tableIds) { const n = await this.prisma.tappingTable.count({ where: { companyId: t.companyId, id: { in: dto.tableIds }, isDeleted: false } }); if (n !== dto.tableIds.length) throw new NotFoundException('Tabela inválida'); } return this.prisma.$transaction(async tx => { if (dto.tableIds) await tx.tappingTableTemplateItem.deleteMany({ where: { templateId: id } }); return tx.tappingTableTemplate.update({ where: { id }, data: { name: dto.name, description: dto.description, active: dto.active, updatedById: userId, items: dto.tableIds ? { create: dto.tableIds.map((tappingTableId, position) => ({ tappingTableId, position })) } : undefined }, include: { items: true } }); }); }
  async deleteTemplate(userId: string, id: string) { const t = await this.prisma.tappingTableTemplate.findUnique({ where: { id } }); if (!t) throw new NotFoundException(); await this.access.ensureCompany(userId, t.companyId); return this.prisma.tappingTableTemplate.update({ where: { id }, data: { active: false, isDeleted: true, deletedAt: new Date(), updatedById: userId } }); }

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
