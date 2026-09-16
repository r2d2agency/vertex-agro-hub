import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';
import { onlyDigits } from '../common/text.util';
import { PeopleService } from '../people/people.service';
import { parseCoordinates } from './coordinates.util';
import { CommitImportDto, ImportFarmRowRawDto, MonitorResolutionDto, PreviewImportDto } from './dto';

type OwnerRecord = { id: string; code: string | null; alternateCode: string | null; name: string };
type BuyerRecord = { id: string; code: string; name: string };
type MonitorCandidate = { id: string; fullName: string | null; email: string | null };

interface ImportContext {
  companyId: string;
  ownersByAlt: Map<string, OwnerRecord>;
  ownersByCode: Map<string, OwnerRecord>;
  buyersByCode: Map<string, BuyerRecord>;
  monitorCandidates: MonitorCandidate[];
}

type Severity = 'error' | 'warning';
interface RowIssue { field: string; message: string; severity: Severity }

interface OwnerResolution {
  status: 'none' | 'matched' | 'create';
  keyType?: 'alt' | 'code';
  keyValue?: string;
  name?: string;
  cpf?: string | null;
  cnpjCpf?: string | null;
  stateRegistration?: string | null;
  ownerId?: string; // preenchido quando status === 'matched' (ou 'create' já materializado na mesma importação)
}

interface BuyerResolution {
  slot: 1 | 2;
  status: 'skipped' | 'matched' | 'create';
  code?: string;
  name?: string;
  buyerId?: string;
}

interface MonitorResolution {
  slot: 1 | 2;
  status: 'none' | 'matched' | 'create' | 'ambiguous';
  name?: string;
  userId?: string;
  candidates?: MonitorCandidate[];
}

export interface RowPlan {
  rowIndex: number;
  farmName?: string;
  supplierCode?: string;
  regime?: 'propria' | 'arrendada' | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  owner: OwnerResolution;
  buyers: BuyerResolution[];
  monitors: MonitorResolution[];
  issues: RowIssue[];
  status: 'ok' | 'warning' | 'error' | 'needs_review';
}

function normalizeName(v?: string | null) {
  return (v ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeState(v?: string | null) {
  const s = (v ?? '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(s) ? s : null;
}

function normalizeRegime(v?: string | null): 'propria' | 'arrendada' | null {
  const s = normalizeName(v);
  if (!s) return null;
  if (s.includes('propri')) return 'propria';
  if (s.includes('parceir') || s.includes('arrend')) return 'arrendada';
  return null;
}

@Injectable()
export class FarmsImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CompanyAccess,
    private readonly people: PeopleService,
  ) {}

  private async buildContext(companyId: string): Promise<ImportContext> {
    const [owners, buyers, monitorUsers] = await Promise.all([
      this.prisma.owner.findMany({ where: { companyId, isDeleted: false }, select: { id: true, code: true, alternateCode: true, name: true } }),
      this.prisma.buyer.findMany({ where: { companyId, isDeleted: false }, select: { id: true, code: true, name: true } }),
      this.prisma.user.findMany({
        where: {
          OR: [
            { roles: { some: { companyId, role: 'monitor' } } },
            { assignments: { some: { companyId, role: 'monitor' } } },
          ],
        },
        select: { id: true, fullName: true, email: true },
      }),
    ]);
    const ownersByAlt = new Map<string, OwnerRecord>();
    const ownersByCode = new Map<string, OwnerRecord>();
    for (const o of owners) {
      if (o.alternateCode) ownersByAlt.set(o.alternateCode, o);
      else if (o.code) ownersByCode.set(o.code, o);
    }
    const buyersByCode = new Map(buyers.map((b) => [b.code, b] as const));
    return { companyId, ownersByAlt, ownersByCode, buyersByCode, monitorCandidates: monitorUsers };
  }

  private resolveOwner(ctx: ImportContext, row: ImportFarmRowRawDto): OwnerResolution {
    const name = (row.ownerLegalName ?? '').trim();
    const altCode = (row.ownerAlternateCode ?? '').trim();
    const code = (row.ownerCode ?? '').trim();
    const cpf = row.cpf ? onlyDigits(row.cpf) : null;
    const cnpjCpf = row.cnpjCpf ? onlyDigits(row.cnpjCpf) : null;
    const stateRegistration = row.stateRegistration?.trim() || null;

    if (altCode) {
      const existing = ctx.ownersByAlt.get(altCode);
      return {
        status: existing ? 'matched' : 'create',
        keyType: 'alt', keyValue: altCode,
        name: name || existing?.name, cpf, cnpjCpf, stateRegistration,
        ownerId: existing?.id,
      };
    }
    if (code) {
      const existing = ctx.ownersByCode.get(code);
      return {
        status: existing ? 'matched' : 'create',
        keyType: 'code', keyValue: code,
        name: name || existing?.name, cpf, cnpjCpf, stateRegistration,
        ownerId: existing?.id,
      };
    }
    return { status: 'none' };
  }

  private resolveBuyerSlot(ctx: ImportContext, slot: 1 | 2, code?: string, name?: string): BuyerResolution {
    const c = (code ?? '').trim();
    const n = (name ?? '').trim();
    if (!c && !n) return { slot, status: 'skipped' };
    if (!c || !n) return { slot, status: 'skipped', code: c || undefined, name: n || undefined };
    const existing = ctx.buyersByCode.get(c);
    return { slot, status: existing ? 'matched' : 'create', code: c, name: n, buyerId: existing?.id };
  }

  private resolveMonitorSlot(ctx: ImportContext, slot: 1 | 2, rawName?: string): MonitorResolution {
    const name = (rawName ?? '').trim();
    if (!name) return { slot, status: 'none' };
    const norm = normalizeName(name);
    const matches = ctx.monitorCandidates.filter((c) => normalizeName(c.fullName) === norm);
    if (matches.length === 1) return { slot, status: 'matched', name, userId: matches[0].id };
    if (matches.length > 1) return { slot, status: 'ambiguous', name, candidates: matches };
    return { slot, status: 'create', name };
  }

  private resolveRow(ctx: ImportContext, row: ImportFarmRowRawDto): RowPlan {
    const issues: RowIssue[] = [];
    const farmName = (row.farmName ?? '').trim();
    if (!farmName) issues.push({ field: 'farmName', message: 'Nome da propriedade é obrigatório.', severity: 'error' });

    const supplierCode = (row.supplierCode ?? '').trim() || undefined;
    if (!supplierCode) {
      issues.push({ field: 'supplierCode', message: 'Sem Código do Fornecedor — esta linha criará uma nova fazenda a cada reimportação, pois não há chave de correspondência.', severity: 'warning' });
    }

    const regime = normalizeRegime(row.regimeRaw);
    if (row.regimeRaw && !regime) {
      issues.push({ field: 'regimeRaw', message: `"Proprietário/Parceiro" não reconhecido (${row.regimeRaw}) — regime ficará em branco.`, severity: 'warning' });
    }

    const state = normalizeState(row.state);
    if (row.state && !state) {
      issues.push({ field: 'state', message: `Estado inválido (${row.state}) — esperado sigla de 2 letras.`, severity: 'warning' });
    }

    let latitude: number | null = null;
    let longitude: number | null = null;
    const coords = parseCoordinates(row.coordinates);
    if (coords && 'error' in coords) {
      issues.push({ field: 'coordinates', message: coords.error, severity: 'error' });
    } else if (coords) {
      latitude = coords.latitude;
      longitude = coords.longitude;
      if (coords.warning) issues.push({ field: 'coordinates', message: coords.warning, severity: 'warning' });
    }

    if (row.cpf && onlyDigits(row.cpf).length !== 11) {
      issues.push({ field: 'cpf', message: 'CPF com formato inválido (esperado 11 dígitos) — será ignorado.', severity: 'warning' });
    }
    if (row.cnpjCpf && ![11, 14].includes(onlyDigits(row.cnpjCpf).length)) {
      issues.push({ field: 'cnpjCpf', message: 'CNPJ/CPF com formato inesperado (esperado 11 ou 14 dígitos).', severity: 'warning' });
    }

    const owner = this.resolveOwner(ctx, row);
    const buyers = [
      this.resolveBuyerSlot(ctx, 1, row.buyer1Code, row.buyer1Name),
      this.resolveBuyerSlot(ctx, 2, row.buyer2Code, row.buyer2Name),
    ];
    for (const b of buyers) {
      if (b.status === 'skipped' && (b.code || b.name)) {
        issues.push({ field: `buyer${b.slot}`, message: `Comprador ${b.slot}: informe código E nome, ou deixe os dois em branco.`, severity: 'warning' });
      }
    }
    const monitors = [
      this.resolveMonitorSlot(ctx, 1, row.monitor1Name),
      this.resolveMonitorSlot(ctx, 2, row.monitor2Name),
    ];
    for (const m of monitors) {
      if (m.status === 'ambiguous') {
        issues.push({ field: `monitor${m.slot}`, message: `Monitor ${m.slot} ("${m.name}") bate com mais de uma pessoa — escolha manualmente.`, severity: 'error' });
      }
    }

    const hasError = issues.some((i) => i.severity === 'error');
    const needsReview = monitors.some((m) => m.status === 'ambiguous');
    const status: RowPlan['status'] = hasError ? 'error' : needsReview ? 'needs_review' : issues.length ? 'warning' : 'ok';

    return {
      rowIndex: row.rowIndex,
      farmName: farmName || undefined,
      supplierCode,
      regime,
      city: row.city?.trim() || null,
      state,
      latitude,
      longitude,
      owner,
      buyers,
      monitors,
      issues,
      status,
    };
  }

  async preview(userId: string, dto: PreviewImportDto): Promise<RowPlan[]> {
    await this.access.ensureCompany(userId, dto.companyId);
    const ctx = await this.buildContext(dto.companyId);
    const plans: RowPlan[] = [];
    for (const row of dto.rows) {
      const plan = this.resolveRow(ctx, row);
      plans.push(plan);
      // Simula, só na memória, a criação de owner/buyer novos pra que outra
      // linha do mesmo arquivo que aponte pro mesmo código não seja reportada
      // como "vai criar" de novo — sem isso o preview mostraria N criações
      // pra um proprietário que aparece em N fazendas na mesma planilha.
      if (plan.owner.status === 'create' && plan.owner.keyType && plan.owner.keyValue) {
        const placeholder: OwnerRecord = { id: '', code: plan.owner.keyType === 'code' ? plan.owner.keyValue : null, alternateCode: plan.owner.keyType === 'alt' ? plan.owner.keyValue : null, name: plan.owner.name ?? '' };
        (plan.owner.keyType === 'alt' ? ctx.ownersByAlt : ctx.ownersByCode).set(plan.owner.keyValue, placeholder);
      }
      for (const b of plan.buyers) {
        if (b.status === 'create' && b.code) {
          ctx.buyersByCode.set(b.code, { id: '', code: b.code, name: b.name ?? '' });
        }
      }
    }
    return plans;
  }

  async commit(userId: string, dto: CommitImportDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    const ctx = await this.buildContext(dto.companyId);
    const resolutionsByRow = new Map<number, MonitorResolutionDto[]>();
    for (const r of dto.resolutions ?? []) {
      resolutionsByRow.set(r.rowIndex, [...(resolutionsByRow.get(r.rowIndex) ?? []), r]);
    }
    const skip = new Set(dto.skipRowIndexes ?? []);

    const rows: Array<{ rowIndex: number; status: 'created' | 'updated' | 'skipped' | 'error'; farmId?: string; errorMessage?: string }> = [];
    let created = 0, updated = 0, skipped = 0, failed = 0;

    for (const row of dto.rows) {
      if (skip.has(row.rowIndex)) {
        rows.push({ rowIndex: row.rowIndex, status: 'skipped' });
        skipped++;
        continue;
      }
      try {
        // Revalida no servidor — nunca confia em resolução já calculada que
        // veio ecoada do preview do cliente.
        const plan = this.resolveRow(ctx, row);
        if (plan.status === 'error') {
          throw new BadRequestException(plan.issues.find((i) => i.severity === 'error')?.message ?? 'Linha inválida.');
        }
        const rowResolutions = resolutionsByRow.get(row.rowIndex) ?? [];
        for (const m of plan.monitors) {
          if (m.status !== 'ambiguous') continue;
          const chosen = rowResolutions.find((r) => r.slot === m.slot);
          if (!chosen || chosen.action === 'skip') { m.status = 'none'; continue; }
          if (chosen.action === 'use' && chosen.userId) { m.status = 'matched'; m.userId = chosen.userId; continue; }
          if (chosen.action === 'create') { m.status = 'create'; continue; }
          throw new BadRequestException(`Monitor ${m.slot} ("${m.name}") ainda precisa de resolução manual.`);
        }

        const { farmId, wasCreated } = await this.materializeRow(userId, dto.companyId, ctx, plan);
        rows.push({ rowIndex: row.rowIndex, status: wasCreated ? 'created' : 'updated', farmId });
        if (wasCreated) created++; else updated++;
      } catch (e) {
        failed++;
        rows.push({ rowIndex: row.rowIndex, status: 'error', errorMessage: e instanceof Error ? e.message : 'Erro desconhecido' });
      }
    }

    return { total: dto.rows.length, created, updated, skipped, failed, rows };
  }

  private async materializeRow(userId: string, companyId: string, ctx: ImportContext, plan: RowPlan) {
    return this.prisma.$transaction(async (tx) => {
      // Owner
      let ownerId: string | undefined = plan.owner.ownerId;
      if (plan.owner.status === 'create' && !ownerId) {
        const created = await tx.owner.create({
          data: {
            companyId,
            code: plan.owner.keyType === 'code' ? plan.owner.keyValue : undefined,
            alternateCode: plan.owner.keyType === 'alt' ? plan.owner.keyValue : undefined,
            name: plan.owner.name || 'Proprietário sem nome',
            cpf: plan.owner.cpf ?? undefined,
            cnpjCpf: plan.owner.cnpjCpf ?? undefined,
            stateRegistration: plan.owner.stateRegistration ?? undefined,
            createdById: userId, updatedById: userId,
          },
        });
        ownerId = created.id;
        (plan.owner.keyType === 'alt' ? ctx.ownersByAlt : ctx.ownersByCode).set(plan.owner.keyValue!, { id: created.id, code: created.code, alternateCode: created.alternateCode, name: created.name });
      } else if (plan.owner.status === 'matched' && ownerId) {
        const patch: Record<string, unknown> = {};
        if (plan.owner.name) patch.name = plan.owner.name;
        if (plan.owner.cpf) patch.cpf = plan.owner.cpf;
        if (plan.owner.cnpjCpf) patch.cnpjCpf = plan.owner.cnpjCpf;
        if (plan.owner.stateRegistration) patch.stateRegistration = plan.owner.stateRegistration;
        if (Object.keys(patch).length) await tx.owner.update({ where: { id: ownerId }, data: { ...patch, updatedById: userId } });
      }

      // Buyers
      const buyerIds: Array<{ buyerId: string; slot: number }> = [];
      for (const b of plan.buyers) {
        if (b.status === 'skipped') continue;
        let buyerId = b.buyerId;
        if (b.status === 'create' && !buyerId) {
          const created = await tx.buyer.create({ data: { companyId, code: b.code!, name: b.name!, createdById: userId, updatedById: userId } });
          buyerId = created.id;
          ctx.buyersByCode.set(b.code!, { id: created.id, code: created.code, name: created.name });
        } else if (b.status === 'matched' && buyerId && b.name) {
          await tx.buyer.update({ where: { id: buyerId }, data: { name: b.name, updatedById: userId } });
        }
        if (buyerId) buyerIds.push({ buyerId, slot: b.slot });
      }

      // Farm (upsert by companyId+code quando há Código do Fornecedor)
      const existingFarm = plan.supplierCode
        ? await tx.farm.findFirst({ where: { companyId, code: plan.supplierCode } })
        : null;
      const farmData = {
        name: plan.farmName!,
        code: plan.supplierCode ?? undefined,
        city: plan.city ?? undefined,
        state: plan.state ?? undefined,
        latitude: plan.latitude ?? undefined,
        longitude: plan.longitude ?? undefined,
        ownerId: ownerId ?? undefined,
        regime: plan.regime ?? undefined,
      };
      const farm = existingFarm
        ? await tx.farm.update({ where: { id: existingFarm.id }, data: { ...farmData, updatedById: userId, version: { increment: 1 } } })
        : await tx.farm.create({ data: { ...farmData, companyId, createdById: userId, updatedById: userId } });

      // FarmBuyer: refaz do zero (cardinalidade pequena, mais simples que mesclar)
      await tx.farmBuyer.deleteMany({ where: { farmId: farm.id } });
      if (buyerIds.length) {
        await tx.farmBuyer.createMany({ data: buyerIds.map((b) => ({ farmId: farm.id, buyerId: b.buyerId, companyId, slot: b.slot })) });
      }

      return { farmId: farm.id, wasCreated: !existingFarm };
    }).then(async (result) => {
      // Monitores: fora da transação principal porque createNameOnlyMonitor/
      // createAssignment fazem suas próprias checagens de permissão e podem
      // envolver múltiplas tabelas — mantém a transação da fazenda enxuta.
      for (const m of plan.monitors) {
        if (m.status === 'none') continue;
        let monitorUserId = m.userId;
        if (m.status === 'create' && !monitorUserId) {
          const created = await this.people.createNameOnlyMonitor(userId, companyId, m.name!);
          monitorUserId = created.id;
          ctx.monitorCandidates.push({ id: created.id, fullName: created.fullName, email: created.email });
        }
        if (!monitorUserId) continue;
        await this.people.createAssignment(userId, monitorUserId, {
          companyId, farmId: result.farmId, role: 'monitor', startAt: new Date().toISOString(),
        });
      }
      return result;
    });
  }
}
