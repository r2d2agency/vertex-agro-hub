import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';
import { onlyDigits } from '../common/text.util';
import { computeLinkStamp, nextTableInRotation } from './rotation.util';
import {
  CreateStintDto, CreateTapperDto, EndStintDto, UpdateTapperDto, UpsertTapperDto,
} from './dto';

const d = (v?: string | null) => (v ? new Date(v) : null);

const ROLE_LABELS: Record<string, string> = {
  sangrador: 'sangrador',
  monitor: 'monitor',
  operador: 'operador',
};
const roleLabel = (role: string) => ROLE_LABELS[role] ?? role;

@Injectable()
export class TappersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CompanyAccess,
  ) {}

  private async ensureManager(userId: string, companyId: string) {
    const isGlobal = await this.prisma.userRole.findFirst({
      where: { userId, role: 'admin_global' },
    });
    if (isGlobal) return;

    const isCompanyAdmin = await this.prisma.userRole.findFirst({
      where: { userId, companyId, role: { in: ['admin_empresa', 'gestor'] } },
    });
    if (!isCompanyAdmin) {
      throw new ForbiddenException('Sem permissão para validar pré-cadastros nesta empresa');
    }
  }

  private async isManager(userId: string, companyId: string) {
    const isGlobal = await this.prisma.userRole.findFirst({
      where: { userId, role: 'admin_global' },
    });
    if (isGlobal) return true;
    const isCompanyAdmin = await this.prisma.userRole.findFirst({
      where: { userId, companyId, role: { in: ['admin_empresa', 'gestor'] } },
    });
    return !!isCompanyAdmin;
  }

  // Consultor pode pré-cadastrar monitor, sangrador ou operador; monitor só
  // sangrador/operador da própria fazenda (não outro monitor).
  private async ensureConsultorSubmission(userId: string, companyId: string, farmId: string, targetRole: string) {
    const isGlobal = await this.prisma.userRole.findFirst({
      where: { userId, role: 'admin_global' },
    });
    if (isGlobal) return;

    const isCompanyAdmin = await this.prisma.userRole.findFirst({
      where: { userId, companyId, role: { in: ['admin_empresa', 'gestor'] } },
    });
    if (isCompanyAdmin) return;

    const allowedRoles = targetRole === 'monitor' ? ['consultor'] : ['consultor', 'monitor'];
    const assignment = await this.prisma.farmAssignment.findFirst({
      where: {
        userId, companyId, farmId,
        role: { in: allowedRoles },
        OR: [{ endAt: null }, { endAt: { gte: new Date() } }],
      },
    });
    if (!assignment) {
      throw new ForbiddenException('Sem permissão para enviar este pré-cadastro nesta fazenda');
    }
  }

  async list(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    const tappers = await this.prisma.tapper.findMany({
      where: { companyId, isDeleted: false },
      orderBy: { fullName: 'asc' },
      include: { stints: { orderBy: [{ endAt: 'asc' }, { startAt: 'desc' }] } },
    });

    const farms = await this.prisma.farm.findMany({
      where: { companyId, isDeleted: false },
      select: { id: true, name: true, code: true },
    });
    const farmMap = new Map(farms.map((f) => [f.id, f]));

    const records = await this.prisma.tappingRecord.findMany({
      where: { companyId, isDeleted: false },
      select: { sangradorName: true, date: true, liters: true, dryKg: true, farmId: true },
    });
    const stats = new Map<string, { records: number; liters: number; dryKg: number; lastDate: Date | null }>();
    for (const r of records) {
      const key = (r.sangradorName ?? '').trim().toLowerCase();
      if (!key) continue;
      const cur = stats.get(key) ?? { records: 0, liters: 0, dryKg: 0, lastDate: null };
      cur.records += 1;
      cur.liters += r.liters ?? 0;
      cur.dryKg += r.dryKg ?? 0;
      if (!cur.lastDate || r.date > cur.lastDate) cur.lastDate = r.date;
      stats.set(key, cur);
    }

    return tappers.map((t) => {
      const s =
        stats.get(t.fullName.trim().toLowerCase()) ??
        (t.nickname ? stats.get(t.nickname.trim().toLowerCase()) : undefined) ??
        { records: 0, liters: 0, dryKg: 0, lastDate: null };
      return {
        ...t,
        stints: t.stints.map((st) => ({ ...st, farm: farmMap.get(st.farmId) ?? null })),
        stats: s,
      };
    });
  }

  async get(userId: string, id: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    const t = await this.prisma.tapper.findFirst({ where: { id, companyId, isDeleted: false } });
    if (!t) throw new NotFoundException('Sangrador não encontrado');

    const stints = await this.prisma.tapperStint.findMany({
      where: { tapperId: id },
      orderBy: [{ endAt: 'asc' }, { startAt: 'desc' }],
    });
    const farms = await this.prisma.farm.findMany({
      where: { companyId, isDeleted: false },
      select: { id: true, name: true, code: true },
    });
    const farmMap = new Map(farms.map((f) => [f.id, f]));

    const names = [t.fullName, t.nickname].filter(Boolean) as string[];
    const activity = await this.prisma.tappingRecord.findMany({
      where: {
        companyId,
        isDeleted: false,
        OR: names.map((n) => ({ sangradorName: { equals: n, mode: 'insensitive' as const } })),
      },
      orderBy: { date: 'desc' },
      take: 200,
    });

    const totals = activity.reduce(
      (acc, r) => {
        acc.records += 1;
        acc.liters += r.liters ?? 0;
        acc.dryKg += r.dryKg ?? 0;
        acc.trees += r.treesTapped ?? 0;
        return acc;
      },
      { records: 0, liters: 0, dryKg: 0, trees: 0 },
    );

    return {
      ...t,
      stints: stints.map((st) => ({ ...st, farm: farmMap.get(st.farmId) ?? null })),
      activity: activity.map((r) => ({ ...r, farm: r.farmId ? (farmMap.get(r.farmId) ?? null) : null })),
      totals,
    };
  }

  async create(userId: string, dto: CreateTapperDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    return this.prisma.tapper.create({
      data: {
        companyId: dto.companyId,
        fullName: dto.fullName,
        nickname: dto.nickname ?? null,
        code: dto.code ?? null,
        cpf: dto.cpf ?? null,
        rg: dto.rg ?? null,
        birthDate: d(dto.birthDate),
        phone: dto.phone ?? null,
        photoUrl: (dto as any).photoUrl ?? null,
        addressCity: dto.addressCity ?? null,
        addressState: dto.addressState ?? null,
        contractType: dto.contractType ?? null,
        admissionDate: d(dto.admissionDate),
        terminationDate: d(dto.terminationDate),
        dailyRate: dto.dailyRate ?? null,
        pisNumber: dto.pisNumber ?? null,
        bankPixKey: dto.bankPixKey ?? null,
        emergencyContactName: dto.emergencyContactName ?? null,
        emergencyContactPhone: dto.emergencyContactPhone ?? null,
        status: dto.status ?? 'ativo',
        notes: dto.notes ?? null,
        createdById: userId,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateTapperDto) {
    const current = await this.prisma.tapper.findUnique({ where: { id } });
    if (!current || current.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, current.companyId);
    const { companyId: _c, birthDate, admissionDate, terminationDate, ...rest } = dto;
    return this.prisma.tapper.update({
      where: { id },
      data: {
        ...rest,
        ...(birthDate !== undefined ? { birthDate: d(birthDate) } : {}),
        ...(admissionDate !== undefined ? { admissionDate: d(admissionDate) } : {}),
        ...(terminationDate !== undefined ? { terminationDate: d(terminationDate) } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    const current = await this.prisma.tapper.findUnique({ where: { id } });
    if (!current) throw new NotFoundException();
    await this.access.ensureCompany(userId, current.companyId);
    await this.prisma.tapper.update({ where: { id }, data: { isDeleted: true } });
    return { ok: true };
  }

  // ===== Histórico de fazendas =====
  async addStint(userId: string, tapperId: string, dto: CreateStintDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    const tapper = await this.prisma.tapper.findFirst({
      where: { id: tapperId, companyId: dto.companyId, isDeleted: false },
    });
    if (!tapper) throw new NotFoundException('Sangrador não encontrado');
    const farm = await this.prisma.farm.findFirst({
      where: { id: dto.farmId, companyId: dto.companyId, isDeleted: false },
    });
    if (!farm) throw new BadRequestException('Fazenda inválida');

    await this.prisma.tapperStint.updateMany({
      where: { tapperId, endAt: null },
      data: { endAt: new Date(dto.startAt), endReason: 'Transferência' },
    });

    return this.prisma.tapperStint.create({
      data: {
        tapperId,
        companyId: dto.companyId,
        farmId: dto.farmId,
        plotId: dto.plotId ?? null,
        startAt: new Date(dto.startAt),
        notes: dto.notes ?? null,
      },
    });
  }

  async endStint(userId: string, tapperId: string, stintId: string, dto: EndStintDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    await this.prisma.tapperStint.updateMany({
      where: { id: stintId, tapperId },
      data: { endAt: dto.endAt ? new Date(dto.endAt) : new Date(), endReason: dto.endReason ?? null },
    });
    return { ok: true };
  }

  async deleteStint(userId: string, tapperId: string, stintId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    await this.prisma.tapperStint.deleteMany({ where: { id: stintId, tapperId, companyId } });
    return { ok: true };
  }

  // ===== Fluxo do app de campo: consulta por CPF e confirmação da ficha =====
  async lookupByCpf(userId: string, companyId: string, rawCpf: string) {
    await this.access.ensureCompany(userId, companyId);
    const cpf = onlyDigits(rawCpf);
    if (cpf.length < 11) throw new BadRequestException('Informe um CPF válido');

    const matches = await this.prisma.tapper.findMany({
      where: { cpf: { in: [cpf, formatCpf(cpf)] }, isDeleted: false },
      orderBy: { updatedAt: 'desc' },
    });

    const inCompany = matches.find((m) => m.companyId === companyId) ?? null;
    const elsewhere = matches.find((m) => m.companyId !== companyId) ?? null;
    const source = inCompany ?? elsewhere;

    if (!source) return { found: false as const, sameCompany: false, cpf, tapper: null, currentFarm: null };

    let currentFarm: { id: string; name: string } | null = null;
    if (inCompany) {
      const stint = await this.prisma.tapperStint.findFirst({
        where: { tapperId: inCompany.id, endAt: null },
        orderBy: { startAt: 'desc' },
      });
      if (stint) {
        const farm = await this.prisma.farm.findUnique({
          where: { id: stint.farmId },
          select: { id: true, name: true },
        });
        currentFarm = farm ?? null;
      }
    }

    return {
      found: true as const,
      sameCompany: !!inCompany,
      cpf,
      tapper: { ...source, id: inCompany ? source.id : null },
      currentFarm,
    };
  }

  async upsertByCpf(userId: string, dto: UpsertTapperDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    const cpf = onlyDigits(dto.cpf);
    if (cpf.length < 11) throw new BadRequestException('Informe um CPF válido');

    const existing = await this.prisma.tapper.findFirst({
      where: { companyId: dto.companyId, cpf: { in: [cpf, formatCpf(cpf)] }, isDeleted: false },
    });

    const data = {
      fullName: dto.fullName ?? existing?.fullName,
      nickname: dto.nickname ?? existing?.nickname ?? null,
      code: dto.code ?? existing?.code ?? null,
      cpf,
      rg: dto.rg ?? existing?.rg ?? null,
      birthDate: d(dto.birthDate) ?? existing?.birthDate ?? null,
      phone: dto.phone ?? existing?.phone ?? null,
      photoUrl: (dto as any).photoUrl ?? (existing as any)?.photoUrl ?? null,
      addressCity: dto.addressCity ?? existing?.addressCity ?? null,
      addressState: dto.addressState ?? existing?.addressState ?? null,
      contractType: dto.contractType ?? existing?.contractType ?? null,
      admissionDate: d(dto.admissionDate) ?? existing?.admissionDate ?? null,
      terminationDate: d(dto.terminationDate) ?? existing?.terminationDate ?? null,
      dailyRate: dto.dailyRate ?? existing?.dailyRate ?? null,
      pisNumber: dto.pisNumber ?? existing?.pisNumber ?? null,
      bankPixKey: dto.bankPixKey ?? existing?.bankPixKey ?? null,
      emergencyContactName: dto.emergencyContactName ?? existing?.emergencyContactName ?? null,
      emergencyContactPhone: dto.emergencyContactPhone ?? existing?.emergencyContactPhone ?? null,
      status: dto.status ?? existing?.status ?? 'ativo',
      notes: dto.notes ?? existing?.notes ?? null,
    };

    if (!data.fullName || data.fullName.trim().length < 2) {
      throw new BadRequestException('Informe o nome completo do sangrador');
    }

    const tapper = existing
      ? await this.prisma.tapper.update({ where: { id: existing.id }, data })
      : await this.prisma.tapper.create({
          data: { ...data, fullName: data.fullName, companyId: dto.companyId, createdById: userId },
        });

    let stint: { id: string; farmId: string; startAt: Date } | null = null;
    if (dto.farmId) {
      const open = await this.prisma.tapperStint.findFirst({
        where: { tapperId: tapper.id, farmId: dto.farmId, endAt: null },
      });
      stint = open
        ? open
        : await this.addStint(userId, tapper.id, {
            companyId: dto.companyId,
            farmId: dto.farmId,
            startAt: dto.stintStartAt ?? new Date().toISOString().slice(0, 10),
          });
    }

    return { tapper, stint, created: !existing };
  }

  async listPreRegistrations(
    userId: string,
    companyId: string,
    opts: { status?: string; role?: string } = {},
  ) {
    await this.access.ensureCompany(userId, companyId);
    // Quem não é admin/gestor só vê os pré-cadastros que ele mesmo enviou —
    // isso libera a rota pro consultor conferir o status do que já mandou
    // (evitar reenviar), sem dar acesso à lista inteira da empresa.
    const manager = await this.isManager(userId, companyId);
    return this.prisma.tapperPreRegistration.findMany({
      where: {
        companyId,
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.role ? { role: opts.role } : {}),
        ...(manager ? {} : { requestedById: userId }),
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async createPreRegistration(
    userId: string,
    dto: {
      companyId: string;
      farmId: string;
      role?: string;
      fullName: string;
      cpf: string;
      rg?: string;
      birthDate?: string;
      phone?: string;
      addressCity?: string;
      addressState?: string;
      contractType?: string;
      dailyRate?: number;
      treesAssigned?: number;
      taskPercent?: number;
      tappingTableId?: string;
      rgPhotoUrl: string;
      cpfPhotoUrl: string;
      notes?: string;
    },
  ) {
    await this.access.ensureCompany(userId, dto.companyId);
    const role = dto.role ?? 'sangrador';
    await this.ensureConsultorSubmission(userId, dto.companyId, dto.farmId, role);

    const cpf = onlyDigits(dto.cpf);
    if (cpf.length !== 11) {
      throw new BadRequestException('Informe um CPF válido com 11 dígitos');
    }

    const farm = await this.prisma.farm.findFirst({
      where: { id: dto.farmId, companyId: dto.companyId, isDeleted: false },
      select: { id: true, name: true },
    });
    if (!farm) throw new BadRequestException('Fazenda inválida');

    const existingPending = await this.prisma.tapperPreRegistration.findFirst({
      where: { companyId: dto.companyId, cpf, role, status: 'pending' },
      select: { id: true },
    });
    if (existingPending) {
      throw new BadRequestException(`Já existe um pré-cadastro de ${roleLabel(role)} pendente para este CPF`);
    }

    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, email: true },
    });
    const requestedByName = requester?.fullName?.trim() || requester?.email || 'Consultor';

    const item = await this.prisma.tapperPreRegistration.create({
      data: {
        companyId: dto.companyId,
        role,
        farmId: dto.farmId,
        farmName: farm.name,
        requestedById: userId,
        requestedByName,
        fullName: dto.fullName.trim(),
        cpf,
        rg: dto.rg ?? null,
        birthDate: d(dto.birthDate),
        phone: dto.phone ?? null,
        addressCity: dto.addressCity ?? null,
        addressState: dto.addressState ?? null,
        contractType: dto.contractType ?? null,
        dailyRate: dto.dailyRate ?? null,
        treesAssigned: dto.treesAssigned ?? null,
        taskPercent: dto.taskPercent ?? null,
        tappingTableId: dto.tappingTableId ?? null,
        rgPhotoUrl: dto.rgPhotoUrl,
        cpfPhotoUrl: dto.cpfPhotoUrl,
        notes: dto.notes ?? null,
      },
    });

    await this.prisma.alertEvent.create({
      data: {
        companyId: dto.companyId,
        farmId: dto.farmId,
        level: 'info',
        title: `Novo pré-cadastro provisório de ${roleLabel(role)}`,
        message: `${item.fullName} foi enviado por ${requestedByName} para validação do RH.`,
        meta: {
          type: 'tapper_pre_registration',
          role,
          preRegistrationId: item.id,
          farmId: item.farmId,
          farmName: item.farmName,
          cpf: item.cpf,
          requestedById: item.requestedById,
          requestedByName,
        },
      },
    });

    return item;
  }

  async reviewPreRegistration(
    userId: string,
    id: string,
    dto: {
      companyId: string;
      status: 'approved' | 'rejected';
      personId?: string;
      reviewNotes?: string;
    },
  ) {
    await this.ensureManager(userId, dto.companyId);

    const current = await this.prisma.tapperPreRegistration.findFirst({
      where: { id, companyId: dto.companyId },
    });
    if (!current) throw new NotFoundException('Pré-cadastro não encontrado');

    const reviewer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, email: true },
    });
    const reviewerName = reviewer?.fullName?.trim() || reviewer?.email || 'RH';

    const updated = await this.prisma.tapperPreRegistration.update({
      where: { id },
      data: {
        status: dto.status,
        personId: dto.personId ?? current.personId,
        reviewNotes: dto.reviewNotes ?? null,
        reviewedById: userId,
        reviewedAt: new Date(),
      },
    });

    // Se o sangrador informou o sistema de sangria (tabela) no pré-cadastro,
    // já cria o vínculo com a quantidade de árvores ao aprovar — evita o RH
    // ou o monitor terem que refazer esse passo manualmente depois.
    if (dto.status === 'approved' && dto.personId && current.role === 'sangrador' && current.tappingTableId) {
      await this.prisma.tapperTableLink.upsert({
        where: { userId_tappingTableId: { userId: dto.personId, tappingTableId: current.tappingTableId } },
        update: { active: true, treeCount: current.treesAssigned ?? undefined },
        create: {
          companyId: dto.companyId,
          userId: dto.personId,
          tappingTableId: current.tappingTableId,
          treeCount: current.treesAssigned,
          createdById: userId,
        },
      }).catch(() => undefined);
    }

    await this.prisma.alertEvent.create({
      data: {
        companyId: dto.companyId,
        farmId: current.farmId,
        level: dto.status === 'approved' ? 'info' : 'warning',
        title: dto.status === 'approved'
          ? `Pré-cadastro de ${roleLabel(current.role)} aprovado`
          : `Pré-cadastro de ${roleLabel(current.role)} arquivado`,
        message: `${updated.fullName} foi ${dto.status === 'approved' ? 'validado' : 'arquivado'} por ${reviewerName}.`,
        meta: {
          type: 'tapper_pre_registration_review',
          preRegistrationId: updated.id,
          status: dto.status,
          personId: updated.personId,
        },
      },
    });

    return updated;
  }

  async listPlotTableLinks(userId: string, companyId: string, tapperKey: string, plotId?: string) {
    await this.access.ensureCompany(userId, companyId);
    const key = this.parseTapperKey(tapperKey);
    const links = await this.prisma.tapperPlotTableLink.findMany({ where: { companyId, ...key, ...(plotId ? { plotId } : {}), active: true }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] });
    const tables = await this.prisma.tappingTable.findMany({ where: { id: { in: links.map((link) => link.tappingTableId) } }, select: { id: true, name: true, notation: true } });
    const byId = new Map(tables.map((table) => [table.id, table]));
    return links.map((link) => ({ ...link, tappingTable: byId.get(link.tappingTableId) ?? null }));
  }

  async createPlotTableLink(userId: string, dto: any) {
    const key = this.parseTapperKey(dto.tapperKey);
    await this.ensureManagerOrFarmStaff(userId, dto.companyId, key);
    const [farm, plot, table] = await Promise.all([
      this.prisma.farm.findFirst({ where: { id: dto.farmId, companyId: dto.companyId, isDeleted: false } }),
      this.prisma.plot.findFirst({ where: { id: dto.plotId, farmId: dto.farmId, companyId: dto.companyId, isDeleted: false } }),
      this.prisma.tappingTable.findFirst({ where: { id: dto.tappingTableId, companyId: dto.companyId, isDeleted: false, active: true } }),
    ]);
    if (!farm || !plot || !table) throw new NotFoundException('Fazenda, talhão ou tabela inválido');
    return this.prisma.tapperPlotTableLink.create({ data: { companyId: dto.companyId, farmId: dto.farmId, plotId: dto.plotId, ...key, tappingTableId: dto.tappingTableId, position: dto.position ?? 0, treeCount: dto.treeCount, notes: dto.notes, createdById: userId } });
  }

  async updatePlotTableLink(userId: string, id: string, dto: any) {
    const current = await this.prisma.tapperPlotTableLink.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Vínculo não encontrado');
    await this.access.ensureCompany(userId, current.companyId);
    return this.prisma.tapperPlotTableLink.update({ where: { id }, data: { position: dto.position, treeCount: dto.treeCount, active: dto.active, notes: dto.notes } });
  }

  async deletePlotTableLink(userId: string, id: string, companyId: string) {
    const current = await this.prisma.tapperPlotTableLink.findFirst({ where: { id, companyId } });
    if (!current) throw new NotFoundException('Vínculo não encontrado');
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.tapperPlotTableLink.update({ where: { id }, data: { active: false } });
  }

  // ---------- Tabelas vinculadas ao sangrador ----------
  // tapperKey é o mesmo id "unificado" usado no app de campo: o UUID da
  // ficha legada (Tapper) ou "rh:<userId>" pra um vínculo só de RH.
  private parseTapperKey(tapperKey: string): { tapperId?: string; userId?: string } {
    if (tapperKey.startsWith('rh:')) {
      const userId = tapperKey.slice(3);
      if (!userId) throw new BadRequestException('tapperKey inválido');
      return { userId };
    }
    return { tapperId: tapperKey };
  }

  // TapperTableLink não tem @relation formal com TappingTable (pra não
  // precisar declarar o array de volta em TappingTable/Tapper), então o
  // "include" vira um join manual aqui.
  private async attachTables<T extends {
    tappingTableId: string;
    frequencyDays?: number | null;
    restDays?: number | null;
    workDaysCycle?: number | null;
    cutType?: string | null;
    stimulation?: string | null;
  }>(links: T[]) {
    const tableIds = [...new Set(links.map((l) => l.tappingTableId))];
    const tables = tableIds.length
      ? await this.prisma.tappingTable.findMany({
          where: { id: { in: tableIds } },
          select: { id: true, name: true, notation: true, frequencyDays: true, restDays: true, workDaysCycle: true, cutType: true, stimulation: true },
        })
      : [];
    const byId = new Map(tables.map((t) => [t.id, t]));
    return links.map((l) => {
      const table = byId.get(l.tappingTableId) ?? null;
      return {
        ...l,
        tappingTable: table ? {
          ...table,
          frequencyDays: l.frequencyDays ?? table.frequencyDays,
          restDays: l.restDays ?? table.restDays,
          workDaysCycle: l.workDaysCycle ?? table.workDaysCycle,
          cutType: l.cutType ?? table.cutType,
          stimulation: l.stimulation ?? table.stimulation,
        } : null,
      };
    });
  }

  // Mesma pessoa pode existir como ficha legada (Tapper) e como vínculo só de
  // RH (User/FarmAssignment), e uma tabela pode ter sido vinculada usando
  // qualquer uma das duas chaves — sem isso, o app de campo podia buscar por
  // um lado (tapperId) enquanto o admin tinha vinculado a tabela pelo outro
  // (rh:userId), e o sangrador aparecia "sem tabela vinculada" mesmo com o
  // vínculo certinho no admin. Resolve a chave "irmã" por CPF (preferencial)
  // ou por nome único, do mesmo jeito que a tela de Sangradores casa as duas
  // fichas no admin.
  private async resolveSiblingKey(
    companyId: string,
    key: { tapperId?: string; userId?: string },
  ): Promise<{ tapperId?: string; userId?: string } | null> {
    if (key.tapperId) {
      const tapper = await this.prisma.tapper.findUnique({
        where: { id: key.tapperId },
        select: { cpf: true, fullName: true },
      });
      if (!tapper) return null;
      const assignments = await this.prisma.farmAssignment.findMany({
        where: { companyId, role: 'sangrador' },
        select: { userId: true, user: { select: { cpf: true, fullName: true } } },
        distinct: ['userId'],
      });
      const cpf = onlyDigits(tapper.cpf ?? '');
      if (cpf) {
        const match = assignments.find((a) => onlyDigits(a.user?.cpf ?? '') === cpf);
        if (match) return { userId: match.userId };
      }
      const name = tapper.fullName.trim().toLowerCase();
      if (name) {
        const matches = assignments.filter((a) => (a.user?.fullName ?? '').trim().toLowerCase() === name);
        if (matches.length === 1) return { userId: matches[0].userId };
      }
      return null;
    }
    if (key.userId) {
      const user = await this.prisma.user.findUnique({ where: { id: key.userId }, select: { cpf: true, fullName: true } });
      if (!user) return null;
      const tappers = await this.prisma.tapper.findMany({
        where: { companyId, isDeleted: false },
        select: { id: true, cpf: true, fullName: true },
      });
      const cpf = onlyDigits(user.cpf ?? '');
      if (cpf) {
        const match = tappers.find((t) => onlyDigits(t.cpf ?? '') === cpf);
        if (match) return { tapperId: match.id };
      }
      const name = (user.fullName ?? '').trim().toLowerCase();
      if (name) {
        const matches = tappers.filter((t) => t.fullName.trim().toLowerCase() === name);
        if (matches.length === 1) return { tapperId: matches[0].id };
      }
      return null;
    }
    return null;
  }

  private async resolveTapperFarmIds(companyId: string, key: { tapperId?: string; userId?: string }) {
    if (key.tapperId) {
      const stints = await this.prisma.tapperStint.findMany({
        where: { tapperId: key.tapperId, companyId, endAt: null },
        select: { farmId: true },
      });
      return stints.map((s) => s.farmId);
    }
    if (key.userId) {
      const assignments = await this.prisma.farmAssignment.findMany({
        where: {
          userId: key.userId, companyId, role: 'sangrador',
          OR: [{ endAt: null }, { endAt: { gte: new Date() } }],
        },
        select: { farmId: true },
      });
      return assignments.map((a) => a.farmId);
    }
    return [];
  }

  // Além de admin/gestor, um monitor ou consultor vinculado à mesma fazenda
  // do sangrador também pode vincular/editar tabelas dele — é o mesmo
  // colaborador que registra a sangria no app de campo.
  private async ensureManagerOrFarmStaff(userId: string, companyId: string, key: { tapperId?: string; userId?: string }) {
    if (await this.isManager(userId, companyId)) return;
    const farmIds = await this.resolveTapperFarmIds(companyId, key);
    const staffLink = farmIds.length
      ? await this.prisma.farmAssignment.findFirst({
          where: {
            userId, companyId, farmId: { in: farmIds },
            role: { in: ['monitor', 'consultor'] },
            OR: [{ endAt: null }, { endAt: { gte: new Date() } }],
          },
        })
      : null;
    if (!staffLink) throw new ForbiddenException('Sem permissão para gerenciar tabelas deste sangrador');
  }

  async listTableLinks(userId: string, companyId: string, tapperKey: string) {
    const key = this.parseTapperKey(tapperKey);
    await this.ensureManagerOrFarmStaff(userId, companyId, key);
    const sibling = await this.resolveSiblingKey(companyId, key);
    const links = await this.prisma.tapperTableLink.findMany({
      where: { companyId, active: true, OR: sibling ? [key, sibling] : [key] },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
    return this.attachTables(links);
  }

  async applyTemplate(userId: string, dto: { companyId: string; tapperKey: string; templateId: string }) {
    const key = this.parseTapperKey(dto.tapperKey); await this.ensureManagerOrFarmStaff(userId, dto.companyId, key);
    const sibling = await this.resolveSiblingKey(dto.companyId, key);
    const template = await this.prisma.tappingTableTemplate.findFirst({ where: { id: dto.templateId, companyId: dto.companyId, active: true }, include: { items: { orderBy: { position: 'asc' } } } }); if (!template) throw new NotFoundException('Template não encontrado');
    return this.prisma.$transaction(async tx => { const existing = await tx.tapperTableLink.findMany({ where: { companyId: dto.companyId, OR: sibling ? [key, sibling] : [key] } }); const out = [] as any[]; for (const item of template.items) { const old = existing.find(x => x.tappingTableId === item.tappingTableId); const table = await tx.tappingTable.findFirst({ where: { id: item.tappingTableId, companyId: dto.companyId, active: true, isDeleted: false } }); if (!table) continue; const data = { active: true, position: item.position, treeCount: old?.treeCount, notes: old?.notes, frequencyDays: old?.frequencyDays ?? table.frequencyDays, restDays: old?.restDays ?? table.restDays, workDaysCycle: old?.workDaysCycle ?? table.workDaysCycle, cutType: old?.cutType ?? table.cutType, stimulation: old?.stimulation ?? table.stimulation }; out.push(old ? await tx.tapperTableLink.update({ where: { id: old.id }, data }) : await tx.tapperTableLink.create({ data: { companyId: dto.companyId, tappingTableId: item.tappingTableId, createdById: userId, ...key, ...data } })); } return out; });
  }

  async createTableLink(userId: string, dto: { companyId: string; tapperKey: string; tappingTableId: string; treeCount?: number; frequencyDays?: number; restDays?: number; workDaysCycle?: number; cutType?: string; stimulation?: string; notes?: string }) {
    const key = this.parseTapperKey(dto.tapperKey);
    await this.ensureManagerOrFarmStaff(userId, dto.companyId, key);
    if (key.tapperId) {
      const tapper = await this.prisma.tapper.findFirst({ where: { id: key.tapperId, companyId: dto.companyId, isDeleted: false } });
      if (!tapper) throw new NotFoundException('Sangrador não encontrado');
    }
    const table = await this.prisma.tappingTable.findFirst({ where: { id: dto.tappingTableId, companyId: dto.companyId, isDeleted: false } });
    if (!table) throw new NotFoundException('Tabela de sangria não encontrada');

    const existing = await this.prisma.tapperTableLink.findFirst({
      where: { companyId: dto.companyId, tappingTableId: dto.tappingTableId, ...key },
    });
    const saved = existing
      ? await this.prisma.tapperTableLink.update({
          where: { id: existing.id },
          data: { active: true, treeCount: dto.treeCount ?? existing.treeCount, frequencyDays: dto.frequencyDays ?? existing.frequencyDays, restDays: dto.restDays ?? existing.restDays, workDaysCycle: dto.workDaysCycle ?? existing.workDaysCycle, cutType: dto.cutType ?? existing.cutType, stimulation: dto.stimulation ?? existing.stimulation, notes: dto.notes ?? existing.notes },
        })
      : await this.prisma.tapperTableLink.create({
          data: {
            companyId: dto.companyId,
            tappingTableId: dto.tappingTableId,
            treeCount: dto.treeCount,
            frequencyDays: dto.frequencyDays,
            restDays: dto.restDays,
            workDaysCycle: dto.workDaysCycle,
            cutType: dto.cutType,
            stimulation: dto.stimulation,
            notes: dto.notes,
            createdById: userId,
            ...key,
          },
        });
    const [hydrated] = await this.attachTables([saved]);
    return hydrated;
  }

  async updateTableLink(userId: string, linkId: string, dto: { companyId: string; position?: number; treeCount?: number; frequencyDays?: number; restDays?: number; workDaysCycle?: number; cutType?: string; stimulation?: string; active?: boolean; notes?: string }) {
    const link = await this.prisma.tapperTableLink.findUnique({ where: { id: linkId } });
    if (!link || link.companyId !== dto.companyId) throw new NotFoundException('Vínculo não encontrado');
    await this.ensureManagerOrFarmStaff(userId, dto.companyId, { tapperId: link.tapperId ?? undefined, userId: link.userId ?? undefined });
    const saved = await this.prisma.tapperTableLink.update({
      where: { id: linkId },
      data: {
        position: dto.position === undefined ? undefined : dto.position,
        treeCount: dto.treeCount === undefined ? undefined : dto.treeCount,
        frequencyDays: dto.frequencyDays === undefined ? undefined : dto.frequencyDays,
        restDays: dto.restDays === undefined ? undefined : dto.restDays,
        workDaysCycle: dto.workDaysCycle === undefined ? undefined : dto.workDaysCycle,
        cutType: dto.cutType === undefined ? undefined : dto.cutType,
        stimulation: dto.stimulation === undefined ? undefined : dto.stimulation,
        active: dto.active === undefined ? undefined : dto.active,
        notes: dto.notes === undefined ? undefined : dto.notes,
      },
    });
    const [hydrated] = await this.attachTables([saved]);
    return hydrated;
  }

  async deleteTableLink(userId: string, linkId: string, companyId: string) {
    const link = await this.prisma.tapperTableLink.findUnique({ where: { id: linkId } });
    if (!link || link.companyId !== companyId) throw new NotFoundException('Vínculo não encontrado');
    await this.ensureManagerOrFarmStaff(userId, companyId, { tapperId: link.tapperId ?? undefined, userId: link.userId ?? undefined });
    await this.prisma.tapperTableLink.delete({ where: { id: linkId } });
    return { ok: true };
  }

  // Usado pelo app de campo (field.service.ts) ao registrar sangria: tabelas
  // disponíveis para um sangrador específico, já com a quantidade de árvores
  // prevista pra ele naquela tabela.
  private async orderedRotationLinks(companyId: string, key: { tapperId?: string; userId?: string }) {
    const sibling = await this.resolveSiblingKey(companyId, key);
    const links = await this.prisma.tapperTableLink.findMany({
      where: { companyId, active: true, OR: sibling ? [key, sibling] : [key] },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
    return { links, sibling };
  }

  async getRotation(userId: string, companyId: string, tapperKey: string) {
    await this.access.ensureCompany(userId, companyId);
    const key = this.parseTapperKey(tapperKey);
    const { links } = await this.orderedRotationLinks(companyId, key);
    const rotation = await this.prisma.tapperRotation.findFirst({
      where: { companyId, ...key },
    });
    const stamp = computeLinkStamp(links);
    const next = rotation ? nextTableInRotation(rotation, links) : { needsReset: true as const, reason: 'missing_last' as const };
    const hydrated = await this.attachTables(links);
    return {
      rotation,
      linkStamp: stamp,
      needsReset: 'needsReset' in next,
      suggestedTableId: 'tableId' in next ? next.tableId : null,
      orderedLinks: hydrated,
    };
  }

  async upsertRotation(userId: string, dto: { companyId: string; tapperKey: string; anchorTableId: string; anchorDate: string }) {
    const key = this.parseTapperKey(dto.tapperKey);
    await this.ensureManagerOrFarmStaff(userId, dto.companyId, key);
    const { links } = await this.orderedRotationLinks(dto.companyId, key);
    if (!links.some((l) => l.tappingTableId === dto.anchorTableId)) {
      throw new NotFoundException('A tabela inicial não está vinculada a este sangrador');
    }
    const data = {
      companyId: dto.companyId,
      ...key,
      anchorTableId: dto.anchorTableId,
      anchorDate: new Date(dto.anchorDate),
      lastTableId: dto.anchorTableId,
      lastRecordId: null,
      linkStamp: computeLinkStamp(links),
      createdById: userId,
    };
    const where = key.tapperId ? { tapperId: key.tapperId } : { userId: key.userId };
    return this.prisma.tapperRotation.upsert({
      where,
      create: data,
      update: { ...data, createdById: userId },
    });
  }

  // Usado pelo app de campo ao registrar sangria: tabelas disponíveis para
  // um sangrador, ordenadas para exibir a rotação.
  async listTableLinksForField(userId: string, companyId: string, tapperKey: string) {
    await this.access.ensureCompany(userId, companyId);
    const key = this.parseTapperKey(tapperKey);
    const { links } = await this.orderedRotationLinks(companyId, key);
    return this.attachTables(links);
  }
}

function formatCpf(cpf: string) {
  return cpf.length === 11
    ? `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
    : cpf;
}
