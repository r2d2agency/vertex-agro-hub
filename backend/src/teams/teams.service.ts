import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';
import { AddMemberDto, CreateTeamDto, UpdateTeamDto } from './dto';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService, private readonly access: CompanyAccess) {}

  async list(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.team.findMany({
      where: { companyId, isDeleted: false },
      orderBy: { name: 'asc' },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, fullName: true } },
          },
        },
      },
    });
  }

  async create(userId: string, dto: CreateTeamDto) {
    await this.access.ensureCompany(userId, dto.companyId);
    return this.prisma.team.create({
      data: {
        companyId: dto.companyId,
        name: dto.name,
        description: dto.description,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  private async loadOwned(userId: string, id: string) {
    const t = await this.prisma.team.findUnique({ where: { id } });
    if (!t || t.isDeleted) throw new NotFoundException();
    await this.access.ensureCompany(userId, t.companyId);
    return t;
  }

  async update(userId: string, id: string, dto: UpdateTeamDto) {
    await this.loadOwned(userId, id);
    return this.prisma.team.update({
      where: { id },
      data: { ...dto, updatedById: userId, version: { increment: 1 } },
    });
  }

  async remove(userId: string, id: string) {
    await this.loadOwned(userId, id);
    return this.prisma.team.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), updatedById: userId, version: { increment: 1 } },
    });
  }

  async addMember(userId: string, teamId: string, dto: AddMemberDto) {
    const t = await this.loadOwned(userId, teamId);
    // Garante que o usuário faz parte da empresa (tem algum papel)
    const belongs = await this.prisma.userRole.findFirst({
      where: { userId: dto.userId, companyId: t.companyId },
    });
    if (!belongs) throw new ForbiddenException('Usuário não pertence à empresa');
    return this.prisma.teamMember.upsert({
      where: { teamId_userId: { teamId, userId: dto.userId } },
      create: { teamId, userId: dto.userId, roleLabel: dto.roleLabel },
      update: { roleLabel: dto.roleLabel },
    });
  }

  async removeMember(userId: string, teamId: string, memberUserId: string) {
    await this.loadOwned(userId, teamId);
    await this.prisma.teamMember.deleteMany({ where: { teamId, userId: memberUserId } });
    return { ok: true };
  }
}
