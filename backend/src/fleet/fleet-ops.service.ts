import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';
import {
  AddMaintenanceItemDto, CreateChecklistDto, CreateFuelMovementDto,
  CreateFuelTankDto, CreateInventoryItemDto, CreateInventoryMovementDto,
  CreateMaintenanceOrderDto, CreateOperationLogDto,
} from './ops-dto';

@Injectable()
export class FleetOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CompanyAccess,
  ) {}

  // ============ FUEL TANKS ============
  async listTanks(userId: string, companyId: string, farmId?: string) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.fuelTank.findMany({
      where: { companyId, isDeleted: false, ...(farmId ? { farmId } : {}) },
      orderBy: { name: 'asc' },
    });
  }
  async createTank(userId: string, dto: CreateFuelTankDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    return this.prisma.fuelTank.create({
      data: { ...dto, createdById: userId, updatedById: userId } as any,
    });
  }
  async updateTank(userId: string, id: string, dto: Partial<CreateFuelTankDto>) {
    const cur = await this.prisma.fuelTank.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    const patch: any = { ...dto }; delete patch.companyId;
    return this.prisma.fuelTank.update({
      where: { id }, data: { ...patch, updatedById: userId, version: { increment: 1 } },
    });
  }
  async deleteTank(userId: string, id: string) {
    const cur = await this.prisma.fuelTank.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    await this.prisma.fuelTank.update({
      where: { id }, data: { isDeleted: true, deletedAt: new Date(), active: false, updatedById: userId, version: { increment: 1 } },
    });
    return { ok: true };
  }

  // ============ FUEL MOVEMENTS ============
  async listFuelMovements(userId: string, companyId: string, opts: { tankId?: string; machineId?: string; kind?: string; from?: string; to?: string } = {}) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.fuelMovement.findMany({
      where: {
        companyId, isDeleted: false,
        ...(opts.tankId ? { tankId: opts.tankId } : {}),
        ...(opts.machineId ? { machineId: opts.machineId } : {}),
        ...(opts.kind ? { kind: opts.kind } : {}),
        ...(opts.from || opts.to ? { occurredAt: { ...(opts.from ? { gte: new Date(opts.from) } : {}), ...(opts.to ? { lte: new Date(opts.to) } : {}) } } : {}),
      },
      orderBy: { occurredAt: 'desc' },
      take: 300,
      include: { tank: { select: { name: true, fuelType: true } }, machine: { select: { name: true, plate: true } }, operator: { select: { name: true } } },
    });
  }

  async createFuelMovement(userId: string, dto: CreateFuelMovementDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    const tank = await this.prisma.fuelTank.findUnique({ where: { id: dto.tankId } });
    if (!tank || tank.companyId !== dto.companyId) throw new BadRequestException('Tanque inválido');
    if (dto.kind !== 'entrada' && dto.kind !== 'saida' && dto.kind !== 'ajuste') {
      throw new BadRequestException('kind inválido');
    }
    const delta = dto.kind === 'entrada' ? dto.liters : dto.kind === 'saida' ? -dto.liters : 0;
    const newLevel = dto.kind === 'ajuste' ? dto.liters : (tank.currentLevel + delta);
    if (newLevel < 0) throw new BadRequestException('Saldo insuficiente no tanque');

    return this.prisma.$transaction(async (tx) => {
      const total = dto.totalCost ?? (dto.unitCost != null ? dto.unitCost * dto.liters : undefined);
      const mv = await tx.fuelMovement.create({
        data: {
          ...dto,
          totalCost: total,
          occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
          createdById: userId, updatedById: userId,
        } as any,
      });
      await tx.fuelTank.update({ where: { id: tank.id }, data: { currentLevel: newLevel } });
      if (dto.kind === 'saida' && dto.machineId && dto.hourmeter != null) {
        await tx.machine.update({ where: { id: dto.machineId }, data: { hourmeter: dto.hourmeter } }).catch(() => null);
      }
      return mv;
    });
  }

  async deleteFuelMovement(userId: string, id: string) {
    const cur = await this.prisma.fuelMovement.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    return this.prisma.$transaction(async (tx) => {
      const revert = cur.kind === 'entrada' ? -cur.liters : cur.kind === 'saida' ? cur.liters : 0;
      if (revert !== 0) {
        await tx.fuelTank.update({ where: { id: cur.tankId }, data: { currentLevel: { increment: revert } } });
      }
      await tx.fuelMovement.update({
        where: { id }, data: { isDeleted: true, deletedAt: new Date(), updatedById: userId, version: { increment: 1 } },
      });
      return { ok: true };
    });
  }

  // ============ INVENTORY ITEMS ============
  async listItems(userId: string, companyId: string, opts: { category?: string; lowStock?: boolean } = {}) {
    await this.access.ensureCompany(userId, companyId);
    const rows = await this.prisma.inventoryItem.findMany({
      where: { companyId, isDeleted: false, ...(opts.category ? { category: opts.category } : {}) },
      orderBy: { name: 'asc' },
    });
    return opts.lowStock ? rows.filter(r => r.minStock != null && r.currentStock <= r.minStock) : rows;
  }
  async createItem(userId: string, dto: CreateInventoryItemDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    return this.prisma.inventoryItem.create({
      data: { ...dto, createdById: userId, updatedById: userId } as any,
    });
  }
  async updateItem(userId: string, id: string, dto: Partial<CreateInventoryItemDto>) {
    const cur = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    const patch: any = { ...dto }; delete patch.companyId;
    return this.prisma.inventoryItem.update({
      where: { id }, data: { ...patch, updatedById: userId, version: { increment: 1 } },
    });
  }
  async deleteItem(userId: string, id: string) {
    const cur = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    await this.prisma.inventoryItem.update({
      where: { id }, data: { isDeleted: true, deletedAt: new Date(), active: false, updatedById: userId, version: { increment: 1 } },
    });
    return { ok: true };
  }

  // ============ INVENTORY MOVEMENTS ============
  async listInventoryMovements(userId: string, companyId: string, itemId?: string) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.inventoryMovement.findMany({
      where: { companyId, isDeleted: false, ...(itemId ? { itemId } : {}) },
      orderBy: { occurredAt: 'desc' },
      take: 300,
      include: { item: { select: { name: true, unit: true, sku: true } }, machine: { select: { name: true } } },
    });
  }

  async createInventoryMovement(userId: string, dto: CreateInventoryMovementDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: dto.itemId } });
    if (!item || item.companyId !== dto.companyId) throw new BadRequestException('Item inválido');
    if (!['entrada', 'saida', 'ajuste'].includes(dto.kind)) throw new BadRequestException('kind inválido');

    const delta = dto.kind === 'entrada' ? dto.quantity : dto.kind === 'saida' ? -dto.quantity : 0;
    const newStock = dto.kind === 'ajuste' ? dto.quantity : item.currentStock + delta;
    if (newStock < 0) throw new BadRequestException('Estoque insuficiente');

    return this.prisma.$transaction(async (tx) => {
      const total = dto.totalCost ?? (dto.unitCost != null ? dto.unitCost * dto.quantity : undefined);
      const mv = await tx.inventoryMovement.create({
        data: {
          ...dto, totalCost: total,
          occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
          createdById: userId, updatedById: userId,
        } as any,
      });
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { currentStock: newStock, ...(dto.kind === 'entrada' && dto.unitCost != null ? { unitCost: dto.unitCost } : {}) },
      });
      return mv;
    });
  }

  // ============ MAINTENANCE ORDERS ============
  async listOrders(userId: string, companyId: string, opts: { status?: string; machineId?: string } = {}) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.maintenanceOrder.findMany({
      where: {
        companyId, isDeleted: false,
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.machineId ? { machineId: opts.machineId } : {}),
      },
      orderBy: [{ status: 'asc' }, { openedAt: 'desc' }],
      include: { machine: { select: { name: true, plate: true } }, implement: { select: { name: true } }, items: true },
    });
  }
  async getOrder(userId: string, id: string) {
    const o = await this.prisma.maintenanceOrder.findUnique({
      where: { id },
      include: { machine: true, implement: true, items: { include: { inventoryItem: true } } },
    });
    if (!o || o.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, o.companyId);
    return o;
  }
  async createOrder(userId: string, dto: CreateMaintenanceOrderDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    const o = await this.prisma.maintenanceOrder.create({
      data: {
        ...dto,
        openedAt: dto.openedAt ? new Date(dto.openedAt) : new Date(),
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : null,
        finishedAt: dto.finishedAt ? new Date(dto.finishedAt) : null,
        createdById: userId, updatedById: userId,
      } as any,
    });
    if (dto.machineId && (dto.status === 'em_andamento' || dto.status === 'aberta')) {
      await this.prisma.machine.update({ where: { id: dto.machineId }, data: { status: 'em_manutencao' } }).catch(() => null);
    }
    return o;
  }
  async updateOrder(userId: string, id: string, dto: Partial<CreateMaintenanceOrderDto>) {
    const cur = await this.prisma.maintenanceOrder.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    const patch: any = { ...dto }; delete patch.companyId;
    for (const k of ['openedAt','scheduledFor','startedAt','finishedAt']) {
      if (patch[k]) patch[k] = new Date(patch[k]);
    }
    const upd = await this.prisma.maintenanceOrder.update({
      where: { id }, data: { ...patch, updatedById: userId, version: { increment: 1 } },
    });
    if (dto.status === 'concluida' && cur.machineId) {
      await this.prisma.machine.update({ where: { id: cur.machineId }, data: { status: 'disponivel' } }).catch(() => null);
    }
    return upd;
  }
  async deleteOrder(userId: string, id: string) {
    const cur = await this.prisma.maintenanceOrder.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    await this.prisma.maintenanceOrder.update({
      where: { id }, data: { isDeleted: true, deletedAt: new Date(), status: 'cancelada', updatedById: userId, version: { increment: 1 } },
    });
    return { ok: true };
  }

  async addOrderItem(userId: string, orderId: string, dto: AddMaintenanceItemDto) {
    const order = await this.prisma.maintenanceOrder.findUnique({ where: { id: orderId } });
    if (!order || order.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, order.companyId);
    const total = dto.totalCost ?? (dto.unitCost != null ? dto.unitCost * dto.quantity : undefined);

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.maintenanceOrderItem.create({
        data: {
          orderId, inventoryItemId: dto.inventoryItemId ?? null,
          kind: dto.kind ?? 'peca', description: dto.description,
          quantity: dto.quantity, unitCost: dto.unitCost ?? null, totalCost: total ?? null,
        } as any,
      });
      if (dto.consumeStock && dto.inventoryItemId) {
        const inv = await tx.inventoryItem.findUnique({ where: { id: dto.inventoryItemId } });
        if (inv) {
          const newStock = inv.currentStock - dto.quantity;
          if (newStock < 0) throw new BadRequestException('Estoque insuficiente');
          await tx.inventoryItem.update({ where: { id: inv.id }, data: { currentStock: newStock } });
          await tx.inventoryMovement.create({
            data: {
              companyId: order.companyId, itemId: inv.id, kind: 'saida', quantity: dto.quantity,
              unitCost: dto.unitCost ?? inv.unitCost, totalCost: total,
              maintenanceOrderId: orderId, machineId: order.machineId ?? null,
              reason: `OS ${order.code ?? order.id.slice(0, 8)}`,
              createdById: userId, updatedById: userId,
            } as any,
          });
        }
      }
      // recomputa custo total das peças
      const items = await tx.maintenanceOrderItem.findMany({ where: { orderId } });
      const partsCost = items.reduce((s, i) => s + (i.totalCost ?? 0), 0);
      await tx.maintenanceOrder.update({
        where: { id: orderId },
        data: { partsCost, totalCost: partsCost + (order.laborCost ?? 0) },
      });
      return item;
    });
  }

  async removeOrderItem(userId: string, orderId: string, itemId: string) {
    const order = await this.prisma.maintenanceOrder.findUnique({ where: { id: orderId } });
    if (!order || order.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, order.companyId);
    await this.prisma.maintenanceOrderItem.delete({ where: { id: itemId } });
    const items = await this.prisma.maintenanceOrderItem.findMany({ where: { orderId } });
    const partsCost = items.reduce((s, i) => s + (i.totalCost ?? 0), 0);
    await this.prisma.maintenanceOrder.update({
      where: { id: orderId }, data: { partsCost, totalCost: partsCost + (order.laborCost ?? 0) },
    });
    return { ok: true };
  }

  // ============ OPERATION LOGS ============
  async listOperationLogs(userId: string, companyId: string, opts: { machineId?: string; operatorId?: string; farmId?: string; from?: string; to?: string } = {}) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.operationLog.findMany({
      where: {
        companyId, isDeleted: false,
        ...(opts.machineId ? { machineId: opts.machineId } : {}),
        ...(opts.operatorId ? { operatorId: opts.operatorId } : {}),
        ...(opts.farmId ? { farmId: opts.farmId } : {}),
        ...(opts.from || opts.to ? { startedAt: { ...(opts.from ? { gte: new Date(opts.from) } : {}), ...(opts.to ? { lte: new Date(opts.to) } : {}) } } : {}),
      },
      orderBy: { startedAt: 'desc' },
      take: 300,
      include: {
        machine: { select: { name: true, plate: true } },
        operator: { select: { name: true } },
        operationType: { select: { name: true, unit: true } },
        implement: { select: { name: true } },
      },
    });
  }

  async createOperationLog(userId: string, dto: CreateOperationLogDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    const started = new Date(dto.startedAt);
    const finished = dto.finishedAt ? new Date(dto.finishedAt) : null;
    let durationHours = null as number | null;
    if (finished) durationHours = Math.max(0, (finished.getTime() - started.getTime()) / 3_600_000);
    else if (dto.hourmeterStart != null && dto.hourmeterEnd != null) durationHours = Math.max(0, dto.hourmeterEnd - dto.hourmeterStart);

    const log = await this.prisma.operationLog.create({
      data: {
        ...dto, startedAt: started, finishedAt: finished,
        durationHours: durationHours ?? undefined,
        createdById: userId, updatedById: userId,
      } as any,
    });
    if (dto.hourmeterEnd != null) {
      await this.prisma.machine.update({ where: { id: dto.machineId }, data: { hourmeter: dto.hourmeterEnd } }).catch(() => null);
    }
    return log;
  }

  async updateOperationLog(userId: string, id: string, dto: Partial<CreateOperationLogDto>) {
    const cur = await this.prisma.operationLog.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    const patch: any = { ...dto }; delete patch.companyId;
    if (patch.startedAt) patch.startedAt = new Date(patch.startedAt);
    if (patch.finishedAt) patch.finishedAt = new Date(patch.finishedAt);
    if (patch.hourmeterStart != null && patch.hourmeterEnd != null) {
      patch.durationHours = Math.max(0, patch.hourmeterEnd - patch.hourmeterStart);
    }
    return this.prisma.operationLog.update({
      where: { id }, data: { ...patch, updatedById: userId, version: { increment: 1 } },
    });
  }

  async deleteOperationLog(userId: string, id: string) {
    const cur = await this.prisma.operationLog.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    await this.prisma.operationLog.update({
      where: { id }, data: { isDeleted: true, deletedAt: new Date(), updatedById: userId, version: { increment: 1 } },
    });
    return { ok: true };
  }

  // ============ CHECKLISTS ============
  async listChecklists(userId: string, companyId: string, machineId?: string) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.machineChecklist.findMany({
      where: { companyId, isDeleted: false, ...(machineId ? { machineId } : {}) },
      orderBy: { performedAt: 'desc' },
      take: 200,
      include: { machine: { select: { name: true, plate: true } }, operator: { select: { name: true } } },
    });
  }
  async createChecklist(userId: string, dto: CreateChecklistDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    const overall = dto.overallStatus ?? (dto.items.some(i => i.status === 'nok') ? 'nok' : 'ok');
    return this.prisma.machineChecklist.create({
      data: {
        ...dto,
        overallStatus: overall,
        items: dto.items as any,
        performedAt: dto.performedAt ? new Date(dto.performedAt) : new Date(),
        createdById: userId, updatedById: userId,
      } as any,
    });
  }
  async deleteChecklist(userId: string, id: string) {
    const cur = await this.prisma.machineChecklist.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    await this.prisma.machineChecklist.update({
      where: { id }, data: { isDeleted: true, deletedAt: new Date(), updatedById: userId, version: { increment: 1 } },
    });
    return { ok: true };
  }

  // ============ OVERVIEW ============
  async opsOverview(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    const now = new Date(); const start = new Date(now); start.setDate(start.getDate() - 30);
    const [tanks, itemsLow, ordersOpen, fuel30, ops30] = await Promise.all([
      this.prisma.fuelTank.findMany({ where: { companyId, isDeleted: false, active: true } }),
      this.prisma.inventoryItem.findMany({ where: { companyId, isDeleted: false, active: true } }),
      this.prisma.maintenanceOrder.count({ where: { companyId, isDeleted: false, status: { in: ['aberta', 'em_andamento'] } } }),
      this.prisma.fuelMovement.aggregate({
        where: { companyId, isDeleted: false, kind: 'saida', occurredAt: { gte: start } },
        _sum: { liters: true, totalCost: true },
      }),
      this.prisma.operationLog.aggregate({
        where: { companyId, isDeleted: false, startedAt: { gte: start } },
        _sum: { durationHours: true, fuelConsumed: true },
        _count: true,
      }),
    ]);
    const dieselTotal = tanks.reduce((s, t) => s + t.currentLevel, 0);
    const lowStockCount = itemsLow.filter(i => i.minStock != null && i.currentStock <= i.minStock).length;
    return {
      dieselTotal, tanksCount: tanks.length,
      itemsCount: itemsLow.length, lowStockCount,
      ordersOpen,
      last30d: {
        fuelLiters: fuel30._sum.liters ?? 0,
        fuelCost: fuel30._sum.totalCost ?? 0,
        operations: ops30._count,
        hours: ops30._sum.durationHours ?? 0,
        fuelConsumed: ops30._sum.fuelConsumed ?? 0,
      },
    };
  }
}
