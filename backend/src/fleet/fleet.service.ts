import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';
import { seedFleetOperations } from '../bootstrap/seed-fleet';
import {
  CreateImplementDto, CreateMachineDto, CreateOperatorDto,
  CreateOperationTypeDto, UpdateMachineDto,
} from './dto';

@Injectable()
export class FleetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CompanyAccess,
  ) {}

  // ---------- Machines ----------
  async listMachines(userId: string, companyId: string, farmId?: string, status?: string) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.machine.findMany({
      where: {
        companyId, isDeleted: false,
        ...(farmId ? { farmId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
  }

  async getMachine(userId: string, id: string) {
    const m = await this.prisma.machine.findUnique({ where: { id } });
    if (!m || m.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, m.companyId);
    const [docs, logs, implementLinks] = await Promise.all([
      this.prisma.machineDocument.findMany({ where: { machineId: id }, orderBy: { createdAt: 'desc' } }),
      this.prisma.machineStatusLog.findMany({ where: { machineId: id }, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.implement.findMany({ where: { machineId: id, isDeleted: false } }),
    ]);
    return { ...m, documents: docs, statusLogs: logs, implements: implementLinks };
  }

  async createMachine(userId: string, dto: CreateMachineDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    return this.prisma.machine.create({
      data: { ...dto, createdById: userId, updatedById: userId } as any,
    });
  }

  async updateMachine(userId: string, id: string, dto: UpdateMachineDto) {
    const cur = await this.prisma.machine.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    const patch: any = { ...dto };
    delete patch.companyId;
    // Log de mudança de status/horímetro
    if (dto.status && dto.status !== cur.status) {
      await this.prisma.machineStatusLog.create({
        data: { machineId: id, kind: 'status', fromValue: cur.status, toValue: dto.status, byUserId: userId },
      });
    }
    if (dto.hourmeter != null && dto.hourmeter !== cur.hourmeter) {
      await this.prisma.machineStatusLog.create({
        data: {
          machineId: id, kind: 'hourmeter',
          fromValue: cur.hourmeter?.toString() ?? null,
          toValue: String(dto.hourmeter),
          byUserId: userId,
        },
      });
    }
    return this.prisma.machine.update({
      where: { id },
      data: { ...patch, updatedById: userId, version: { increment: 1 } },
    });
  }

  async deleteMachine(userId: string, id: string) {
    const cur = await this.prisma.machine.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    await this.prisma.machine.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), status: 'inativa', updatedById: userId, version: { increment: 1 } },
    });
    return { ok: true };
  }

  // ---------- Implements ----------
  async listImplements(userId: string, companyId: string, farmId?: string) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.implement.findMany({
      where: { companyId, isDeleted: false, ...(farmId ? { farmId } : {}) },
      orderBy: { name: 'asc' },
    });
  }

  async createImplement(userId: string, dto: CreateImplementDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    return this.prisma.implement.create({
      data: { ...dto, createdById: userId, updatedById: userId } as any,
    });
  }

  async updateImplement(userId: string, id: string, dto: Partial<CreateImplementDto>) {
    const cur = await this.prisma.implement.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    const patch: any = { ...dto }; delete patch.companyId;
    return this.prisma.implement.update({
      where: { id },
      data: { ...patch, updatedById: userId, version: { increment: 1 } },
    });
  }

  async deleteImplement(userId: string, id: string) {
    const cur = await this.prisma.implement.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    await this.prisma.implement.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), status: 'inativo', updatedById: userId, version: { increment: 1 } },
    });
    return { ok: true };
  }

  // ---------- Operators ----------
  async listOperators(userId: string, companyId: string, farmId?: string) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.operator.findMany({
      where: { companyId, isDeleted: false, ...(farmId ? { farmId } : {}) },
      orderBy: { name: 'asc' },
    });
  }

  async createOperator(userId: string, dto: CreateOperatorDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    return this.prisma.operator.create({
      data: {
        ...dto,
        authorizedCategories: dto.authorizedCategories as any,
        createdById: userId, updatedById: userId,
      } as any,
    });
  }

  async updateOperator(userId: string, id: string, dto: Partial<CreateOperatorDto>) {
    const cur = await this.prisma.operator.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    const patch: any = { ...dto }; delete patch.companyId;
    if (dto.authorizedCategories) patch.authorizedCategories = dto.authorizedCategories;
    return this.prisma.operator.update({
      where: { id },
      data: { ...patch, updatedById: userId, version: { increment: 1 } },
    });
  }

  async deleteOperator(userId: string, id: string) {
    const cur = await this.prisma.operator.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    await this.prisma.operator.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), status: 'inativo', updatedById: userId, version: { increment: 1 } },
    });
    return { ok: true };
  }

  // ---------- OperationTypes ----------
  async listOperationTypes(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    await seedFleetOperations(this.prisma, companyId);
    return this.prisma.operationType.findMany({
      where: { companyId, isDeleted: false },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
  }

  async createOperationType(userId: string, dto: CreateOperationTypeDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    return this.prisma.operationType.create({
      data: { ...dto, createdById: userId, updatedById: userId } as any,
    });
  }

  async updateOperationType(userId: string, id: string, dto: Partial<CreateOperationTypeDto>) {
    const cur = await this.prisma.operationType.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    const patch: any = { ...dto }; delete patch.companyId;
    return this.prisma.operationType.update({
      where: { id },
      data: { ...patch, updatedById: userId, version: { increment: 1 } },
    });
  }

  async deleteOperationType(userId: string, id: string) {
    const cur = await this.prisma.operationType.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    await this.prisma.operationType.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), active: false, updatedById: userId, version: { increment: 1 } },
    });
    return { ok: true };
  }

  // ---------- Dashboard ----------
  async fleetOverview(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    const rows = await this.prisma.machine.groupBy({
      by: ['status'],
      where: { companyId, isDeleted: false },
      _count: { _all: true },
    });
    const byStatus: Record<string, number> = {};
    for (const r of rows) byStatus[r.status] = r._count._all;
    const [totalMachines, totalImplements, totalOperators, totalOperations] = await Promise.all([
      this.prisma.machine.count({ where: { companyId, isDeleted: false } }),
      this.prisma.implement.count({ where: { companyId, isDeleted: false } }),
      this.prisma.operator.count({ where: { companyId, isDeleted: false, status: 'ativo' } }),
      this.prisma.operationType.count({ where: { companyId, isDeleted: false, active: true } }),
    ]);
    return { byStatus, totals: { machines: totalMachines, implements: totalImplements, operators: totalOperators, operations: totalOperations } };
  }
}
