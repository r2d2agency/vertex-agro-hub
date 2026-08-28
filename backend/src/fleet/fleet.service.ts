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

  private cleanReadOnlyFields(patch: any) {
    const readOnly = [
      'id', 'createdAt', 'updatedAt', 'version', 'syncStatus', 'deviceId',
      'isDeleted', 'deletedAt', 'createdById',
    ];
    for (const k of readOnly) delete patch[k];
  }

  private emptyToNull(v: unknown) {
    return typeof v === 'string' && v.trim().length === 0 ? null : v;
  }

  private cleanEmptyUuid(patch: any, keys: string[]) {
    for (const k of keys) {
      if (!(k in patch)) continue;
      const v = patch[k];
      if (v === undefined) continue;
      const cleaned = this.emptyToNull(v);
      if (cleaned != null && (typeof cleaned !== 'string' || cleaned.length < 5)) {
        patch[k] = null;
      } else {
        patch[k] = cleaned;
      }
    }
  }

  private cleanInt(patch: any, keys: string[]) {
    for (const k of keys) {
      if (!(k in patch)) continue;
      const v = patch[k];
      if (v === null || v === undefined) { patch[k] = v ?? null; continue; }
      if (typeof v === 'number') { patch[k] = Number.isFinite(v) ? Math.trunc(v) : null; continue; }
      if (typeof v === 'string') {
        const t = v.trim();
        if (t.length === 0) { patch[k] = null; continue; }
        const n = Number(t);
        patch[k] = Number.isFinite(n) ? Math.trunc(n) : null;
      }
    }
  }

  private cleanEmptyString(patch: any, keys: string[]) {
    for (const k of keys) {
      if (k in patch) patch[k] = this.emptyToNull(patch[k]);
    }
  }

  private normalizeMachinePayload(dto: CreateMachineDto | UpdateMachineDto) {
    const patch: any = { ...dto };

    if (Array.isArray(patch.photoUrls)) {
      patch.photoUrls = patch.photoUrls.filter((value: unknown) => typeof value === 'string' && value.trim().length > 0);
    } else if (typeof patch.photoUrl === 'string' && patch.photoUrl.trim()) {
      patch.photoUrls = [patch.photoUrl.trim()];
    } else {
      patch.photoUrls = [];
    }

    delete patch.photoUrl;
    this.cleanReadOnlyFields(patch);
    this.cleanEmptyUuid(patch, ['regionalId', 'farmId', 'defaultOperatorId', 'monitorUserId']);
    this.cleanInt(patch, ['year', 'tankCapacity']);
    this.cleanEmptyString(patch, ['code', 'patrimony', 'brand', 'model', 'serial', 'plate', 'fuelType', 'hourmeterUnit', 'supplier']);
    if (patch.hourmeter != null) {
      const n = Number(patch.hourmeter);
      patch.hourmeter = Number.isFinite(n) ? n : null;
    }
    return patch;
  }

  private normalizeImplementPayload(dto: Partial<any>) {
    const patch: any = { ...dto };

    if (Array.isArray(patch.photoUrls)) {
      patch.photoUrls = patch.photoUrls.filter((value: unknown) => typeof value === 'string' && value.trim().length > 0);
    } else if (typeof patch.photoUrl === 'string' && patch.photoUrl.trim()) {
      patch.photoUrls = [patch.photoUrl.trim()];
    } else if (!Array.isArray(patch.photoUrls)) {
      patch.photoUrls = [];
    }

    delete patch.photoUrl;
    this.cleanReadOnlyFields(patch);
    this.cleanEmptyUuid(patch, ['farmId', 'machineId', 'responsibleUserId']);
    this.cleanInt(patch, ['year']);
    this.cleanEmptyString(patch, ['code', 'patrimony', 'brand', 'model', 'serial', 'category', 'status', 'notes']);
    return patch;
  }

  private normalizeOperatorPayload(dto: Partial<any>) {
    const patch: any = { ...dto };

    if (Array.isArray(patch.photoUrls)) {
      patch.photoUrls = patch.photoUrls.filter((value: unknown) => typeof value === 'string' && value.trim().length > 0);
    } else if (typeof patch.photoUrl === 'string' && patch.photoUrl.trim()) {
      patch.photoUrls = [patch.photoUrl.trim()];
    } else if (!Array.isArray(patch.photoUrls)) {
      patch.photoUrls = [];
    }

    delete patch.photoUrl;
    this.cleanReadOnlyFields(patch);
    this.cleanEmptyUuid(patch, ['farmId', 'monitorUserId']);
    this.cleanEmptyString(patch, ['cpf', 'phone', 'email', 'cnhCategory', 'name', 'status', 'notes']);
    return patch;
  }

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
    const data = { ...this.normalizeMachinePayload(dto), createdById: userId, updatedById: userId } as any;

    // #region debug-point A:create-machine-payload
    void fetch('http://127.0.0.1:7777/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'machine-save-500',
        runId: 'pre-fix',
        hypothesisId: 'A',
        location: 'backend/src/fleet/fleet.service.ts:createMachine',
        msg: '[DEBUG] createMachine payload prepared',
        data: {
          userId,
          companyId: dto.companyId,
          payload: {
            name: data.name ?? null,
            category: data.category ?? null,
            farmId: data.farmId ?? null,
            defaultOperatorId: data.defaultOperatorId ?? null,
            photoUrls: Array.isArray(data.photoUrls) ? data.photoUrls.length : null,
          },
        },
        ts: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    try {
      return await this.prisma.machine.create({ data });
    } catch (error: any) {
      // #region debug-point A:create-machine-error
      void fetch('http://127.0.0.1:7777/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'machine-save-500',
          runId: 'pre-fix',
          hypothesisId: 'A',
          location: 'backend/src/fleet/fleet.service.ts:createMachine',
          msg: '[DEBUG] createMachine failed',
          data: {
            name: error?.name ?? null,
            code: error?.code ?? null,
            message: error?.message ?? null,
            meta: error?.meta ?? null,
          },
          ts: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      throw error;
    }
  }

  async updateMachine(userId: string, id: string, dto: UpdateMachineDto) {
    const cur = await this.prisma.machine.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    const patch: any = this.normalizeMachinePayload(dto);
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
    const data = { ...this.normalizeImplementPayload(dto), createdById: userId, updatedById: userId } as any;
    return this.prisma.implement.create({ data });
  }

  async updateImplement(userId: string, id: string, dto: Partial<CreateImplementDto>) {
    // #region debug-point C:update-implement-fullscope
    const traceStart = {
      userId: userId ?? null,
      userIdType: typeof userId,
      userIdLen: typeof userId === 'string' ? userId.length : -1,
      id: id ?? null,
      dtoKeys: Object.keys(dto ?? {}),
      dtoEntries: Object.fromEntries(
        Object.entries(dto ?? {}).map(([k, v]) => [
          k,
          { type: typeof v, value: v, isArray: Array.isArray(v) },
        ]),
      ),
    };
    let stage = 'entry';
    let cur: any = null;
    let patch: any = null;
    const writeTraceLog = (level: 'debug' | 'error', message: string, extra: any = {}) => {
      try {
        void this.prisma.systemLog.create({
          data: {
            level,
            source: 'fleet.service.updateImplement',
            message,
            meta: {
              companyId: cur?.companyId ?? null,
              stage,
              ...traceStart,
              ...(extra || {}),
            } as any,
            companyId: cur?.companyId ?? null,
          },
        }).catch(() => {});
      } catch {}
    };
    writeTraceLog('debug', `[DBG implement-patch-500-persist] ENTER id=${id}`);
    try {
      stage = 'findUnique';
      cur = await this.prisma.implement.findUnique({ where: { id } });
      if (!cur || cur.isDeleted) {
        writeTraceLog('debug', `[DBG implement-patch-500-persist] not-found or deleted id=${id} curNull=${!cur} isDeleted=${cur?.isDeleted ?? 'n/a'}`);
        throw new NotFoundException();
      }
      writeTraceLog('debug', `[DBG implement-patch-500-persist] found id=${id} status=${cur.status} version=${cur.version}`);

      stage = 'ensureCompany';
      await this.access.ensureCompany(userId, cur.companyId);

      stage = 'normalize';
      patch = this.normalizeImplementPayload(dto);
      delete patch.companyId;

      stage = 'pre-update';
      writeTraceLog('debug', `[DBG implement-patch-500-persist] payload prepared id=${id}`, {
        normalizedPatch: Object.fromEntries(
          Object.entries(patch ?? {}).map(([k, v]) => [
            k,
            { type: typeof v, value: v, isArray: Array.isArray(v) },
          ]),
        ),
        normalizedKeys: Object.keys(patch ?? {}),
        curSnapshot: {
          id: cur.id, status: cur.status, farmId: cur.farmId, machineId: cur.machineId,
          companyId: cur.companyId, version: cur.version,
          name: cur.name, category: cur.category, notes: cur.notes,
        },
      });

      stage = 'prisma-update';
      const result = await this.prisma.implement.update({
        where: { id },
        data: { ...patch, updatedById: userId, version: { increment: 1 } },
      });
      writeTraceLog('debug', `[DBG implement-patch-500-persist] SUCCESS id=${id} newVersion=${result.version}`);
      return result;
    } catch (error: any) {
      writeTraceLog('error',
        `[DBG implement-patch-500-persist] FAILED id=${id} err=${error?.name ?? 'unknown'} code=${error?.code ?? 'n/a'} stage=${stage}`,
        {
          caughtAt: stage,
          normalizedPatch: patch ? Object.fromEntries(
            Object.entries(patch ?? {}).map(([k, v]) => [
              k,
              { type: typeof v, value: v, isArray: Array.isArray(v) },
            ]),
          ) : null,
          patchKeys: patch ? Object.keys(patch ?? {}) : null,
          patchTypes: patch ? Object.fromEntries(
            Object.entries(patch ?? {}).map(([k, v]) => [k, typeof v + (Array.isArray(v) ? '[]' : '')]),
          ) : null,
          curSnapshot: cur ? {
            id: cur.id, status: cur.status, farmId: cur.farmId, machineId: cur.machineId,
            companyId: cur.companyId, version: cur.version,
          } : null,
          error: {
            name: error?.name ?? null,
            code: error?.code ?? null,
            message: error?.message ?? null,
            stack: typeof error?.stack === 'string' ? error.stack.slice(0, 3000) : null,
            meta: error?.meta ?? null,
            cause: typeof error?.cause === 'string' ? error.cause : (error?.cause?.message ?? error?.cause ?? null),
            response: error?.response ?? null,
            status: error?.status ?? null,
          },
        });
      throw error;
    }
    // #endregion
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
    const data = {
      ...this.normalizeOperatorPayload(dto),
      authorizedCategories: dto.authorizedCategories as any,
      createdById: userId, updatedById: userId,
    } as any;
    return this.prisma.operator.create({ data });
  }

  async updateOperator(userId: string, id: string, dto: Partial<CreateOperatorDto>) {
    const cur = await this.prisma.operator.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    const patch: any = this.normalizeOperatorPayload(dto);
    delete patch.companyId;
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
    const patch: any = { ...dto };
    this.cleanReadOnlyFields(patch);
    this.cleanEmptyString(patch, ['code', 'name', 'category', 'description', 'unit']);
    return this.prisma.operationType.create({
      data: { ...patch, createdById: userId, updatedById: userId } as any,
    });
  }

  async updateOperationType(userId: string, id: string, dto: Partial<CreateOperationTypeDto>) {
    const cur = await this.prisma.operationType.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    const patch: any = { ...dto };
    delete patch.companyId;
    this.cleanReadOnlyFields(patch);
    this.cleanEmptyString(patch, ['code', 'name', 'category', 'description', 'unit']);
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
