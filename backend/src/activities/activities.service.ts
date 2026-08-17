import { Injectable, NotFoundException } from '@nestjs/common';
import { toZonedTime } from 'date-fns-tz';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';
import {
  CreateOccurrenceDto, UpdateOccurrenceDto,
  CreateTaskDto, UpdateTaskDto,
} from './dto';

const TIMEZONE = 'America/Sao_Paulo';
const getNow = () => toZonedTime(new Date(), TIMEZONE);
const parseDate = (d: string | Date) => toZonedTime(new Date(d), TIMEZONE);

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService, private readonly access: CompanyAccess) {}

  // ---- Occurrences ----
  async listOccurrences(userId: string, companyId: string, opts: { farmId?: string; status?: string; from?: string; to?: string } = {}) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.occurrence.findMany({
      where: {
        companyId, isDeleted: false,
        ...(opts.farmId ? { farmId: opts.farmId } : {}),
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.from || opts.to ? {
          date: {
            ...(opts.from ? { gte: parseDate(opts.from) } : {}),
            ...(opts.to ? { lte: parseDate(opts.to) } : {}),
          },
        } : {}),
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
  }

  async createOccurrence(userId: string, dto: CreateOccurrenceDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    const { date, ...rest } = dto;
    return this.prisma.occurrence.create({
      data: {
        ...rest,
        date: parseDate(date),
        resolvedAt: dto.status === 'resolvida' ? getNow() : null,
        createdById: userId, updatedById: userId,
      },
    });
  }

  async updateOccurrence(userId: string, id: string, dto: UpdateOccurrenceDto) {
    const cur = await this.prisma.occurrence.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    const { date, status, ...rest } = dto;
    return this.prisma.occurrence.update({
      where: { id },
      data: {
        ...rest,
        ...(status ? { status } : {}),
        ...(date ? { date: parseDate(date) } : {}),
        ...(status === 'resolvida' && !cur.resolvedAt ? { resolvedAt: getNow() } : {}),
        ...(status && status !== 'resolvida' ? { resolvedAt: null } : {}),
        updatedById: userId, version: { increment: 1 },
      },
    });
  }

  async deleteOccurrence(userId: string, id: string) {
    const cur = await this.prisma.occurrence.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    return this.prisma.occurrence.update({
      where: { id },
      data: { isDeleted: true, deletedAt: getNow(), updatedById: userId, version: { increment: 1 } },
    });
  }

  // ---- Tasks ----
  async listTasks(userId: string, companyId: string, opts: { farmId?: string; teamId?: string; status?: string; from?: string; to?: string } = {}) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.scheduledTask.findMany({
      where: {
        companyId, isDeleted: false,
        ...(opts.farmId ? { farmId: opts.farmId } : {}),
        ...(opts.teamId ? { teamId: opts.teamId } : {}),
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.from || opts.to ? {
          scheduledAt: {
            ...(opts.from ? { gte: parseDate(opts.from) } : {}),
            ...(opts.to ? { lte: parseDate(opts.to) } : {}),
          },
        } : {}),
      },
      orderBy: [{ scheduledAt: 'asc' }],
      take: 500,
    });
  }

  async createTask(userId: string, dto: CreateTaskDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    const { scheduledAt, dueAt, ...rest } = dto;
    return this.prisma.scheduledTask.create({
      data: {
        ...rest,
        scheduledAt: parseDate(scheduledAt),
        dueAt: dueAt ? parseDate(dueAt) : null,
        completedAt: dto.status === 'concluida' ? getNow() : null,
        createdById: userId, updatedById: userId,
      },
    });
  }

  async updateTask(userId: string, id: string, dto: UpdateTaskDto) {
    const cur = await this.prisma.scheduledTask.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    const { scheduledAt, dueAt, status, ...rest } = dto;
    return this.prisma.scheduledTask.update({
      where: { id },
      data: {
        ...rest,
        ...(status ? { status } : {}),
        ...(scheduledAt ? { scheduledAt: parseDate(scheduledAt) } : {}),
        ...(dueAt !== undefined ? { dueAt: dueAt ? parseDate(dueAt) : null } : {}),
        ...(status === 'concluida' && !cur.completedAt ? { completedAt: getNow() } : {}),
        ...(status && status !== 'concluida' ? { completedAt: null } : {}),
        updatedById: userId, version: { increment: 1 },
      },
    });
  }

  async deleteTask(userId: string, id: string) {
    const cur = await this.prisma.scheduledTask.findUnique({ where: { id } });
    if (!cur || cur.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    return this.prisma.scheduledTask.update({
      where: { id },
      data: { isDeleted: true, deletedAt: getNow(), updatedById: userId, version: { increment: 1 } },
    });
  }
}
