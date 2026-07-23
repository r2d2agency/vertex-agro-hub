import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { seedCompanyCatalog } from '../bootstrap/seed-catalog';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  private async isAdminGlobal(userId: string) {
    const r = await this.prisma.userRole.findFirst({
      where: { userId, role: 'admin_global' },
    });
    return !!r;
  }

  async list(userId: string) {
    if (await this.isAdminGlobal(userId)) {
      return this.prisma.company.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
      });
    }
    return this.prisma.company.findMany({
      where: {
        isDeleted: false,
        members: { some: { userId } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(userId: string, id: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, isDeleted: false },
    });
    if (!company) throw new NotFoundException();
    const admin = await this.isAdminGlobal(userId);
    if (!admin) {
      const member = await this.prisma.userRole.findFirst({
        where: { userId, companyId: id },
      });
      if (!member) throw new ForbiddenException();
    }
    return company;
  }

  async create(userId: string, dto: CreateCompanyDto) {
    if (!(await this.isAdminGlobal(userId))) throw new ForbiddenException();
    return this.prisma.company.create({
      data: { ...dto, createdById: userId, updatedById: userId },
    });
  }

  async update(userId: string, id: string, dto: UpdateCompanyDto) {
    await this.getOne(userId, id);
    return this.prisma.company.update({
      where: { id },
      data: {
        ...dto,
        updatedById: userId,
        version: { increment: 1 },
      },
    });
  }

  async softDelete(userId: string, id: string) {
    if (!(await this.isAdminGlobal(userId))) throw new ForbiddenException();
    return this.prisma.company.update({
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
