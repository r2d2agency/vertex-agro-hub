import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';

type SyncEntity =
  | 'farms' | 'plots' | 'clones' | 'tappingTables'
  | 'tappingRecords' | 'productionDeliveries'
  | 'occurrences' | 'scheduledTasks'
  | 'stimulations' | 'photos';

const MAP: Record<SyncEntity, string> = {
  farms: 'farm',
  plots: 'plot',
  clones: 'clone',
  tappingTables: 'tappingTable',
  tappingRecords: 'tappingRecord',
  productionDeliveries: 'productionDelivery',
  occurrences: 'occurrence',
  scheduledTasks: 'scheduledTask',
  stimulations: 'stimulation',
  photos: 'photo',
};

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService, private readonly access: CompanyAccess) {}

  private client(entity: SyncEntity): any {
    const name = MAP[entity];
    if (!name) throw new BadRequestException(`Entidade não suportada: ${entity}`);
    // @ts-ignore
    return (this.prisma as any)[name];
  }

  async pull(userId: string, companyId: string, since?: string, entities?: string) {
    await this.access.ensureCompany(userId, companyId);
    const sinceDate = since ? new Date(since) : new Date(0);
    const list = (entities?.split(',').filter(Boolean) as SyncEntity[]) ??
      (Object.keys(MAP) as SyncEntity[]);

    const out: Record<string, any[]> = {};
    for (const e of list) {
      try {
        out[e] = await this.client(e).findMany({
          where: { companyId, updatedAt: { gt: sinceDate } },
          orderBy: { updatedAt: 'asc' },
          take: 1000,
        });
      } catch {
        out[e] = [];
      }
    }
    return { serverTime: new Date().toISOString(), entities: out };
  }

  async push(userId: string, companyId: string, deviceId: string, batch: Array<{
    entity: SyncEntity; op: 'create' | 'update' | 'delete';
    payload: any; clientVersion?: number;
  }>) {
    await this.access.ensureCompany(userId, companyId);
    if (!deviceId) throw new BadRequestException('deviceId obrigatório');
    if (!Array.isArray(batch)) throw new BadRequestException('batch inválido');

    const session = await this.prisma.syncSession.create({
      data: { companyId, userId, deviceId, pushed: batch.length },
    });

    const results: any[] = [];
    let conflicts = 0;

    for (const item of batch) {
      try {
        const client = this.client(item.entity);
        if (item.op === 'create') {
          const created = await client.create({
            data: { ...item.payload, companyId, deviceId, createdById: userId, updatedById: userId, syncStatus: 'synced' },
          });
          results.push({ ok: true, id: created.id, version: created.version });
        } else if (item.op === 'update') {
          const cur = await client.findUnique({ where: { id: item.payload.id } });
          if (!cur) { results.push({ ok: false, error: 'not_found' }); continue; }
          if (cur.companyId !== companyId) { results.push({ ok: false, error: 'forbidden' }); continue; }
          if (item.clientVersion != null && item.clientVersion < cur.version) {
            conflicts += 1;
            results.push({ ok: false, error: 'conflict', server: cur });
            continue;
          }
          const updated = await client.update({
            where: { id: item.payload.id },
            data: { ...item.payload, updatedById: userId, deviceId, syncStatus: 'synced', version: { increment: 1 } },
          });
          results.push({ ok: true, id: updated.id, version: updated.version });
        } else if (item.op === 'delete') {
          const updated = await client.update({
            where: { id: item.payload.id },
            data: { isDeleted: true, deletedAt: new Date(), updatedById: userId, version: { increment: 1 } },
          });
          results.push({ ok: true, id: updated.id, deleted: true });
        }
      } catch (e: any) {
        results.push({ ok: false, error: e?.message ?? 'error' });
      }
    }

    await this.prisma.syncSession.update({
      where: { id: session.id },
      data: { finishedAt: new Date(), conflicts },
    });

    if (conflicts > 0) throw new ConflictException({ sessionId: session.id, results });
    return { sessionId: session.id, results };
  }

  async sessions(userId: string, companyId: string, opts: { deviceId?: string; limit?: number } = {}) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.syncSession.findMany({
      where: { companyId, ...(opts.deviceId ? { deviceId: opts.deviceId } : {}) },
      orderBy: { startedAt: 'desc' },
      take: Math.min(opts.limit ?? 50, 200),
    });
  }

  async health(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [sessions24, conflicts24, devices] = await Promise.all([
      this.prisma.syncSession.count({ where: { companyId, startedAt: { gte: since24 } } }),
      this.prisma.syncSession.aggregate({ where: { companyId, startedAt: { gte: since24 } }, _sum: { conflicts: true } }),
      this.prisma.syncSession.findMany({
        where: { companyId }, orderBy: { startedAt: 'desc' }, distinct: ['deviceId'], take: 20,
      }),
    ]);
    return {
      last24h: { sessions: sessions24, conflicts: conflicts24._sum.conflicts ?? 0 },
      activeDevices: devices.map((d) => ({ deviceId: d.deviceId, lastSync: d.startedAt, userId: d.userId })),
    };
  }
}
