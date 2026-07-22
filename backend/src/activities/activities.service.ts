import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';
import {
  CreateOccurrenceDto, UpdateOccurrenceDto,
  CreateTaskDto, UpdateTaskDto,
} from './dto';

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
            ...(opts.from ? { gte: new Date(opts.from) } : {}),
            ...(opts.to ? { lte: new Date(opts.to) } : {}),
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
        date: new Date(date),
        resolvedAt: dto.status === 'resolvida' ? new Date() : null,
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
        ...(date ? { date: new Date(date) } : {}),
        ...(status === 'resolvida' && !cur.resolvedAt ? { resolvedAt: new Date() } : {}),
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
      data: { isDeleted: true, deletedAt: new Date(), updatedById: userId, version: { increment: 1 } },
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
            ...(opts.from ? { gte: new Date(opts.from) } : {}),
            ...(opts.to ? { lte: new Date(opts.to) } : {}),
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
        scheduledAt: new Date(scheduledAt),
        dueAt: dueAt ? new Date(dueAt) : null,
        completedAt: dto.status === 'concluida' ? new Date() : null,
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
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
        ...(dueAt !== undefined ? { dueAt: dueAt ? new Date(dueAt) : null } : {}),
        ...(status === 'concluida' && !cur.completedAt ? { completedAt: new Date() } : {}),
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
      data: { isDeleted: true, deletedAt: new Date(), updatedById: userId, version: { increment: 1 } },
    });
  }
}
