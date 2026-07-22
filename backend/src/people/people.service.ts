import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';
import { InvitePersonDto, UpdatePersonRoleDto, CompanyRole } from './dto';

const SUPERADMIN_EMAIL = 'tnicodemos@gmail.com';

@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService, private readonly access: CompanyAccess) {}

  private async ensureManager(userId: string, companyId: string) {
    const isGlobal = await this.prisma.userRole.findFirst({
      where: { userId, role: 'admin_global' },
    });
    if (isGlobal) return;
    const isCompanyAdmin = await this.prisma.userRole.findFirst({
      where: { userId, companyId, role: { in: ['admin_empresa', 'gestor'] } },
    });
    if (!isCompanyAdmin) throw new ForbiddenException('Sem permissão para gerenciar pessoas');
  }

  async list(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    const roles = await this.prisma.userRole.findMany({
      where: { companyId },
      include: {
        user: { select: { id: true, email: true, fullName: true, avatarUrl: true, createdAt: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    // Agrupa por usuário
    const map = new Map<string, any>();
    for (const r of roles) {
      const u = r.user;
      if (!map.has(u.id)) map.set(u.id, { ...u, roles: [] as CompanyRole[], roleIds: {} as Record<string, string> });
      const entry = map.get(u.id);
      entry.roles.push(r.role as CompanyRole);
      entry.roleIds[r.role] = r.id;
    }
    return Array.from(map.values());
  }

  async invite(userId: string, dto: InvitePersonDto) {
    await this.ensureManager(userId, dto.companyId);
    const email = dto.email.toLowerCase().trim();

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      const passwordHash = dto.password
        ? await bcrypt.hash(dto.password, 10)
        : await bcrypt.hash(Math.random().toString(36).slice(2) + 'A1!', 10);
      user = await this.prisma.user.create({
        data: { email, fullName: dto.fullName, passwordHash },
      });
    } else if (dto.password) {
      const passwordHash = await bcrypt.hash(dto.password, 10);
      await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash, fullName: dto.fullName || user.fullName } });
    }

    try {
      await this.prisma.userRole.create({
        data: { userId: user.id, companyId: dto.companyId, role: dto.role },
      });
    } catch (e: any) {
      if (e.code === 'P2002') throw new BadRequestException('Usuário já possui esse papel nesta empresa');
      throw e;
    }
    return { id: user.id, email: user.email, fullName: user.fullName };
  }

  async updateRole(userId: string, targetUserId: string, dto: UpdatePersonRoleDto) {
    await this.ensureManager(userId, dto.companyId);
    // remove todos os papeis desse user na empresa e coloca o novo (papel único por empresa via UI)
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException();
    if (target.email.toLowerCase() === SUPERADMIN_EMAIL) {
      throw new ForbiddenException('Superadmin não pode ter papel alterado');
    }
    await this.prisma.userRole.deleteMany({ where: { userId: targetUserId, companyId: dto.companyId } });
    await this.prisma.userRole.create({
      data: { userId: targetUserId, companyId: dto.companyId, role: dto.role },
    });
    return { ok: true };
  }

  async remove(userId: string, targetUserId: string, companyId: string) {
    await this.ensureManager(userId, companyId);
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException();
    if (target.email.toLowerCase() === SUPERADMIN_EMAIL) {
      throw new ForbiddenException('Superadmin não pode ser removido');
    }
    await this.prisma.userRole.deleteMany({ where: { userId: targetUserId, companyId } });
    return { ok: true };
  }
}
