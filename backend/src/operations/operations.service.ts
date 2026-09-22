import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';
import { TappersService } from '../tappers/tappers.service';
import { computeLinkStamp, nextTableInRotation } from '../tappers/rotation.util';
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
    private readonly tappers: TappersService,
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
                ...(opts.from ? { gte: new Date(`${opts.from}T00:00:00-03:00`) } : {}),
                ...(opts.to ? { lte: new Date(`${opts.to}T23:59:59.999-03:00`) } : {}),
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
    if (dto.plotId && !dto.farmId) throw new NotFoundException('Fazenda obrigatória para o talhão');
    if (dto.plotId) {
      const plot = await this.prisma.plot.findFirst({ where: { id: dto.plotId, companyId: dto.companyId, farmId: dto.farmId, isDeleted: false }, select: { id: true } });
      if (!plot) throw new NotFoundException('Talhão não encontrado nesta fazenda');
    }
    // Campos de controle da API não pertencem ao registro persistido.
    const { date, allowDuplicate: _allowDuplicate, ...rest } = dto;
    if (dto.farmId && dto.plotId && dto.tappingTableId && dto.taskExtent) {
      const duplicate = await this.prisma.tappingRecord.findFirst({ where: { companyId: dto.companyId, farmId: dto.farmId, plotId: dto.plotId, tappingTableId: dto.tappingTableId, tapperId: dto.tapperId ?? null, taskExtent: dto.taskExtent.trim(), date: new Date(date), isDeleted: false }, select: { id: true, createdAt: true } });
      if (duplicate && !dto.allowDuplicate) throw new ConflictException('Esta sangria já foi registrada para este contexto e data');
    }

    // Rotação: identifica a tabela esperada pra este sangrador hoje e detecta
    // divergência. Só se o registro tem tabela E sangrador identificável —
    // registro sem tabela não avança a sequência nem alerta.
    let expectedTableId: string | null = null;
    let divergent = false;
    let rotationKey: { tapperId?: string; userId?: string } | null = null;
    if (dto.tappingTableId && (dto.tapperId || dto.sangradorName)) {
      try {
        const tapperKey = dto.tapperId
          ? { tapperId: dto.tapperId }
          : await this.resolveTapperKeyByName(dto.companyId, dto.sangradorName);
        if (tapperKey) {
          const { rotation, links } = await this.loadRotationState(dto.companyId, tapperKey);
          const next = rotation ? nextTableInRotation(rotation, links) : { needsReset: true as const, reason: 'missing_last' as const };
          if ('tableId' in next) {
            expectedTableId = next.tableId;
            divergent = next.tableId !== dto.tappingTableId;
          }
          rotationKey = tapperKey;
        }
      } catch {
        // Rotação é uma sugestão — falha ao calcular não pode bloquear o
        // registro de sangria.
      }
    }

    const record = await this.prisma.tappingRecord.create({
      data: {
        ...rest,
        expectedTableId,
        divergent,
        date: new Date(date),
        createdById: userId,
        updatedById: userId,
      } as any,
    });

    // Avança a rotação a partir do que foi de fato registrado (mesmo que
    // divergente) — a sequência de amanhã parte da tabela real de hoje.
    if (rotationKey) {
      await this.advanceRotation(dto.companyId, rotationKey, dto.tappingTableId!, record.id).catch(() => undefined);
      if (divergent) {
        await this.createDivergenceAlert(dto.companyId, record, expectedTableId!, dto).catch(() => undefined);
      }
    }

    return record;
  }

  private async resolveTapperKeyByName(companyId: string, sangradorName: string): Promise<{ userId: string } | null> {
    const name = (sangradorName ?? '').trim().toLowerCase();
    if (!name) return null;
    const assignment = await this.prisma.farmAssignment.findFirst({
      where: {
        companyId,
        role: 'sangrador',
        user: { fullName: { equals: sangradorName.trim(), mode: 'insensitive' } },
      },
      select: { userId: true },
    });
    return assignment ? { userId: assignment.userId } : null;
  }

  private async loadRotationState(companyId: string, key: { tapperId?: string; userId?: string }) {
    const sibling = await (this.tappers as any).resolveSiblingKey(companyId, key);
    const links = await this.prisma.tapperTableLink.findMany({
      where: { companyId, active: true, OR: sibling ? [key, sibling] : [key] },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
    const rotation = await this.prisma.tapperRotation.findFirst({
      where: { companyId, OR: sibling ? [key, sibling] : [key] },
    });
    const linkStamp = computeLinkStamp(links);
    return { links, rotation, linkStamp };
  }

  private async advanceRotation(companyId: string, key: { tapperId?: string; userId?: string }, tableId: string, recordId: string) {
    const sibling = await (this.tappers as any).resolveSiblingKey(companyId, key);
    // Pode existir rotação na chave irmã (admin cadastrou pelo outro lado) —
    // atualiza a que existir.
    const rotation = await this.prisma.tapperRotation.findFirst({
      where: { companyId, OR: sibling ? [key, sibling] : [key] },
    });
    if (!rotation) return;
    await this.prisma.tapperRotation.update({
      where: { id: rotation.id },
      data: { lastTableId: tableId, lastRecordId: recordId },
    });
  }

  private async createDivergenceAlert(
    companyId: string,
    record: { id: string; farmId?: string | null; sangradorName: string; date: Date },
    expectedTableId: string,
    dto: { tappingTableId?: string; farmId?: string },
  ) {
    const [expected, actual] = await Promise.all([
      this.prisma.tappingTable.findUnique({ where: { id: expectedTableId }, select: { name: true } }),
      dto.tappingTableId
        ? this.prisma.tappingTable.findUnique({ where: { id: dto.tappingTableId }, select: { name: true } })
        : Promise.resolve(null),
    ]);
    await this.prisma.alertEvent.create({
      data: {
        companyId,
        farmId: dto.farmId ?? record.farmId ?? undefined,
        level: 'warning',
        title: 'Sangrador na tabela divergente do dia',
        message: `${record.sangradorName}: esperada ${expected?.name ?? '—'}, registrada ${actual?.name ?? '—'}.`,
        meta: {
          kind: 'tapper_table_divergence',
          tappingRecordId: record.id,
          expectedTableId,
          actualTableId: dto.tappingTableId ?? null,
        },
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
      } as any,
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
