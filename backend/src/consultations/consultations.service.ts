import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CompanyAccess } from "../common/company-access";
import { CreateConsultationDto, UpdateConsultationDto } from "./dto";

@Injectable()
export class ConsultationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CompanyAccess,
  ) {}

  async list(
    userId: string,
    companyId: string,
    opts: { farmId?: string; consultantId?: string; from?: string; to?: string } = {},
  ) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.consultation.findMany({
      where: {
        companyId,
        isDeleted: false,
        ...(opts.farmId ? { farmId: opts.farmId } : {}),
        ...(opts.consultantId ? { consultantId: opts.consultantId } : {}),
        ...(opts.from || opts.to
          ? {
              conductedAt: {
                ...(opts.from ? { gte: new Date(opts.from) } : {}),
                ...(opts.to ? { lte: new Date(opts.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ conductedAt: "desc" }, { createdAt: "desc" }],
      take: 500,
    });
  }

  async create(userId: string, dto: CreateConsultationDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    const { conductedAt, ...rest } = dto;
    return this.prisma.consultation.create({
      data: {
        ...rest,
        consultantId: dto.consultantId ?? userId,
        conductedAt: new Date(conductedAt),
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateConsultationDto) {
    const current = await this.prisma.consultation.findUnique({ where: { id } });
    if (!current || current.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, current.companyId);
    const { conductedAt, ...rest } = dto;
    return this.prisma.consultation.update({
      where: { id },
      data: {
        ...rest,
        ...(conductedAt ? { conductedAt: new Date(conductedAt) } : {}),
        updatedById: userId,
        version: { increment: 1 },
      },
    });
  }

  async remove(userId: string, id: string) {
    const current = await this.prisma.consultation.findUnique({ where: { id } });
    if (!current || current.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, current.companyId);
    return this.prisma.consultation.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedById: userId,
        version: { increment: 1 },
      },
    });
  }
}
