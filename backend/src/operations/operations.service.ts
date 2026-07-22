import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';
import {
  CreateDeliveryDto,
  CreateTappingRecordDto,
  UpdateDeliveryDto,
  UpdateTappingRecordDto,
} from './dto';

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CompanyAccess,
  ) {}

  // ---------- Tapping Records ----------
  async listTappingRecords(
    userId: string,
    companyId: string,
    opts: { farmId?: string; plotId?: string; from?: string; to?: string } = {},
  ) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.tappingRecord.findMany({
      where: {
        companyId,
        isDeleted: false,
        ...(opts.farmId ? { farmId: opts.farmId } : {}),
        ...(opts.plotId ? { plotId: opts.plotId } : {}),
        ...(opts.from || opts.to
          ? {
              date: {
                ...(opts.from ? { gte: new Date(opts.from) } : {}),
                ...(opts.to ? { lte: new Date(opts.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
  }

  async createTappingRecord(userId: string, dto: CreateTappingRecordDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    const { date, ...rest } = dto;
    return this.prisma.tappingRecord.create({
      data: {
        ...rest,
        date: new Date(date),
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async updateTappingRecord(userId: string, id: string, dto: UpdateTappingRecordDto) {
    const current = await this.prisma.tappingRecord.findUnique({ where: { id } });
    if (!current || current.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, current.companyId);
    const { date, ...rest } = dto;
    return this.prisma.tappingRecord.update({
      where: { id },
      data: {
        ...rest,
        ...(date ? { date: new Date(date) } : {}),
        updatedById: userId,
        version: { increment: 1 },
      },
    });
  }

  async deleteTappingRecord(userId: string, id: string) {
    const current = await this.prisma.tappingRecord.findUnique({ where: { id } });
    if (!current || current.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, current.companyId);
    return this.prisma.tappingRecord.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedById: userId,
        version: { increment: 1 },
      },
    });
  }

  // ---------- Deliveries ----------
  async listDeliveries(
    userId: string,
    companyId: string,
    opts: { farmId?: string; season?: string; from?: string; to?: string } = {},
  ) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.productionDelivery.findMany({
      where: {
        companyId,
        isDeleted: false,
        ...(opts.farmId ? { farmId: opts.farmId } : {}),
        ...(opts.season ? { season: opts.season } : {}),
        ...(opts.from || opts.to
          ? {
              deliveryDate: {
                ...(opts.from ? { gte: new Date(opts.from) } : {}),
                ...(opts.to ? { lte: new Date(opts.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ deliveryDate: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
  }

  async createDelivery(userId: string, dto: CreateDeliveryDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    const { deliveryDate, ...rest } = dto;
    const dryKg =
      dto.dryKg ??
      (dto.netWeightKg != null && dto.drcAvgPercent != null
        ? +(dto.netWeightKg * (dto.drcAvgPercent / 100)).toFixed(2)
        : undefined);
    return this.prisma.productionDelivery.create({
      data: {
        ...rest,
        dryKg,
        deliveryDate: new Date(deliveryDate),
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async updateDelivery(userId: string, id: string, dto: UpdateDeliveryDto) {
    const current = await this.prisma.productionDelivery.findUnique({ where: { id } });
    if (!current || current.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, current.companyId);
    const { deliveryDate, ...rest } = dto;
    const net = dto.netWeightKg ?? current.netWeightKg;
    const drc = dto.drcAvgPercent ?? current.drcAvgPercent;
    const dryKg =
      dto.dryKg ??
      (net != null && drc != null ? +(net * (drc / 100)).toFixed(2) : undefined);
    return this.prisma.productionDelivery.update({
      where: { id },
      data: {
        ...rest,
        ...(deliveryDate ? { deliveryDate: new Date(deliveryDate) } : {}),
        ...(dryKg != null ? { dryKg } : {}),
        updatedById: userId,
        version: { increment: 1 },
      },
    });
  }

  async deleteDelivery(userId: string, id: string) {
    const current = await this.prisma.productionDelivery.findUnique({ where: { id } });
    if (!current || current.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, current.companyId);
    return this.prisma.productionDelivery.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedById: userId,
        version: { increment: 1 },
      },
    });
  }

  // ---------- KPIs ----------
  async kpis(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [deliveries, taps, farms] = await Promise.all([
      this.prisma.productionDelivery.findMany({
        where: { companyId, isDeleted: false, deliveryDate: { gte: from } },
        select: {
          deliveryDate: true,
          netWeightKg: true,
          drcAvgPercent: true,
          dryKg: true,
          farmId: true,
        },
      }),
      this.prisma.tappingRecord.findMany({
        where: { companyId, isDeleted: false, date: { gte: from } },
        select: {
          date: true,
          liters: true,
          drcPercent: true,
          dryKg: true,
          sangradorName: true,
          adherencePct: true,
        },
      }),
      this.prisma.farm.findMany({
        where: { companyId, isDeleted: false },
        select: { id: true, name: true, totalAreaHa: true },
      }),
    ]);

    const monthly: Record<string, { mes: string; kgSecos: number; entregas: number }> = {};
    for (const d of deliveries) {
      const key = `${d.deliveryDate.getFullYear()}-${String(d.deliveryDate.getMonth() + 1).padStart(2, '0')}`;
      const dry = d.dryKg ?? (d.netWeightKg && d.drcAvgPercent ? d.netWeightKg * (d.drcAvgPercent / 100) : 0);
      const rec = monthly[key] ?? { mes: key, kgSecos: 0, entregas: 0 };
      rec.kgSecos += dry ?? 0;
      rec.entregas += 1;
      monthly[key] = rec;
    }

    const totalDry = deliveries.reduce(
      (acc, d) => acc + (d.dryKg ?? (d.netWeightKg && d.drcAvgPercent ? d.netWeightKg * (d.drcAvgPercent / 100) : 0)),
      0,
    );
    const drcAvg = deliveries.length
      ? deliveries.reduce((a, d) => a + (d.drcAvgPercent ?? 0), 0) / deliveries.length
      : 0;

    const bySangrador: Record<string, { name: string; liters: number; days: number; adherence: number; adherenceCount: number }> = {};
    for (const t of taps) {
      const key = t.sangradorName;
      const rec = bySangrador[key] ?? { name: key, liters: 0, days: 0, adherence: 0, adherenceCount: 0 };
      rec.liters += t.liters ?? 0;
      rec.days += 1;
      if (t.adherencePct != null) {
        rec.adherence += t.adherencePct;
        rec.adherenceCount += 1;
      }
      bySangrador[key] = rec;
    }

    const totalArea = farms.reduce((a, f) => a + (f.totalAreaHa ?? 0), 0);

    return {
      totals: {
        totalDryKg: +totalDry.toFixed(2),
        totalDeliveries: deliveries.length,
        totalTappingDays: taps.length,
        drcAvgPercent: +drcAvg.toFixed(2),
        totalAreaHa: +totalArea.toFixed(2),
        productivityKgHa: totalArea > 0 ? +(totalDry / totalArea).toFixed(2) : 0,
      },
      monthly: Object.values(monthly).sort((a, b) => a.mes.localeCompare(b.mes)),
      sangradores: Object.values(bySangrador)
        .map((s) => ({
          ...s,
          liters: +s.liters.toFixed(2),
          adherenceAvg: s.adherenceCount ? +(s.adherence / s.adherenceCount).toFixed(1) : null,
        }))
        .sort((a, b) => b.liters - a.liters)
        .slice(0, 10),
    };
  }
}
