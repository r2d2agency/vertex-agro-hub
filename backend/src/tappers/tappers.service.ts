import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';
import { CreateStintDto, CreateTapperDto, EndStintDto, UpdateTapperDto } from './dto';

const d = (v?: string | null) => (v ? new Date(v) : null);

@Injectable()
export class TappersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CompanyAccess,
  ) {}

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
        photoUrl: dto.photoUrl ?? null,
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
}
