import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';
import {
  CreateAssignmentDto, CreateEvaluationDto, DocumentDto, EmploymentDto,
  EndAssignmentDto, InvitePersonDto, PersonalDataDto, ToggleActiveDto,
  UpdatePersonRoleDto, CompanyRole,
} from './dto';

const SUPERADMIN_EMAIL = 'tnicodemos@gmail.com';

const PERSONAL_FIELDS: (keyof PersonalDataDto)[] = [
  'fullName', 'cpf', 'rg', 'birthDate', 'gender', 'maritalStatus', 'nationality',
  'avatarUrl', 'notes', 'phone', 'phoneAlt', 'addressCep', 'addressStreet',
  'addressNumber', 'addressComplement', 'addressDistrict', 'addressCity',
  'addressState', 'emergencyContactName', 'emergencyContactPhone',
];

function pickPersonal(dto: PersonalDataDto): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of PERSONAL_FIELDS) {
    const v = (dto as any)[k];
    if (v === undefined) continue;
    if (k === 'birthDate') out[k] = v ? new Date(v as string) : null;
    else out[k] = v === '' ? null : v;
  }
  return out;
}

@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService, private readonly access: CompanyAccess) {}

  private async ensureManager(userId: string, companyId: string) {
    if (!companyId) throw new BadRequestException('ID da empresa é obrigatório');
    
    const isGlobal = await this.prisma.userRole.findFirst({
      where: { userId, role: 'admin_global' },
    });
    if (isGlobal) return;
    
    const isCompanyAdmin = await this.prisma.userRole.findFirst({
      where: { userId, companyId, role: { in: ['admin_empresa', 'gestor'] } },
    });
    if (!isCompanyAdmin) throw new ForbiddenException('Sem permissão para gerenciar recursos nesta empresa');
  }

  private async ensureMember(targetUserId: string, companyId: string) {
    if (!targetUserId || targetUserId === 'null' || targetUserId === 'undefined') {
      throw new BadRequestException('ID de usuário inválido');
    }
    const link = await this.prisma.userRole.findFirst({ where: { userId: targetUserId, companyId } });
    if (!link) throw new ForbiddenException('Pessoa não pertence a esta empresa');
  }

  async list(userId: string, companyId: string) {
    if (!companyId || companyId === 'undefined' || companyId === 'null') throw new BadRequestException('companyId é obrigatório');
    await this.access.ensureCompany(userId, companyId);
    const roles = await this.prisma.userRole.findMany({
      where: { companyId },
      include: {
        user: {
          select: {
            id: true, email: true, fullName: true, avatarUrl: true, createdAt: true,
            cpf: true, phone: true, active: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const map = new Map<string, any>();
    for (const r of roles) {
      const u = r.user;
      if (!map.has(u.id)) map.set(u.id, { ...u, roles: [] as CompanyRole[] });
      map.get(u.id).roles.push(r.role as CompanyRole);
    }
    return Array.from(map.values());
  }

  async get(userId: string, targetUserId: string, companyId: string) {
    if (!companyId || companyId === 'undefined' || companyId === 'null') throw new BadRequestException('companyId é obrigatório');
    await this.access.ensureCompany(userId, companyId);
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        employments: { where: { companyId } },
        documents: { where: { OR: [{ companyId }, { companyId: null }] }, orderBy: { createdAt: 'desc' } },
        roles: { where: { companyId }, select: { role: true } },
      },
    });
    if (!user) throw new NotFoundException();
    const { passwordHash: _pw, ...safe } = user as any;
    return {
      ...safe,
      employment: user.employments[0] ?? null,
      roles: user.roles.map((r) => r.role),
    };
  }

  private generateTempPassword() {
    // Formato: vtex + 4 dígitos (ex: vtex7392)
    const n = Math.floor(1000 + Math.random() * 9000);
    return `vtex${n}`;
  }

  async invite(userId: string, dto: InvitePersonDto) {
    const activeCompanyId = dto.companyId;
    await this.ensureManager(userId, activeCompanyId);
    const email = dto.email.toLowerCase().trim();
    const personal = pickPersonal(dto);

    const generatedPassword = dto.password ? null : this.generateTempPassword();
    const effectivePassword = dto.password ?? generatedPassword!;

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      const passwordHash = await bcrypt.hash(effectivePassword, 10);
      user = await this.prisma.user.create({
        data: { email, fullName: dto.fullName, passwordHash, ...personal },
      });
    } else {
      const data: any = { ...personal, fullName: personal.fullName ?? dto.fullName ?? user.fullName };
      if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);
      user = await this.prisma.user.update({ where: { id: user.id }, data });
    }

    try {
      await this.prisma.userRole.create({
        data: { userId: user.id, companyId: activeCompanyId, role: dto.role },
      });
    } catch (e: any) {
      if (e.code !== 'P2002') throw e;
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      generatedPassword: generatedPassword ?? undefined,
    };
  }

  async resetPassword(userId: string, targetUserId: string, companyId: string) {
    await this.ensureManager(userId, companyId);
    await this.ensureMember(targetUserId, companyId);
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException();
    if (target.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()) {
      throw new ForbiddenException('Não é possível redefinir a senha do superadmin');
    }
    const password = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({ where: { id: targetUserId }, data: { passwordHash } });
    // Invalida sessões existentes
    await this.prisma.refreshToken.deleteMany({ where: { userId: targetUserId } }).catch(() => undefined);
    return { email: target.email, fullName: target.fullName, password };
  }

  async updatePersonal(userId: string, targetUserId: string, companyId: string, dto: PersonalDataDto) {
    if (!companyId || companyId === 'undefined' || companyId === 'null') throw new BadRequestException('companyId é obrigatório');
    const activeCompanyId = companyId;
    await this.ensureManager(userId, activeCompanyId);
    await this.ensureMember(targetUserId, activeCompanyId);
    
    // Converte datas vazias ou nulas para null e limpa strings
    const data = pickPersonal(dto);
    
    if (Object.keys(data).length === 0) return { ok: true };
    try {
      await this.prisma.user.update({ where: { id: targetUserId }, data });
    } catch (e: any) {
      if (e.code === 'P2002') throw new BadRequestException('CPF ou email já cadastrado');
      throw e;
    }
    return { ok: true };
  }

  async upsertEmployment(userId: string, targetUserId: string, dto: EmploymentDto) {
    await this.ensureManager(userId, dto.companyId);
    await this.ensureMember(targetUserId, dto.companyId);
    const data: any = {
      position: dto.position ?? null,
      employeeCode: dto.employeeCode ?? null,
      admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : null,
      terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : null,
      contractType: dto.contractType ?? null,
      salary: dto.salary ?? null,
      pisNumber: dto.pisNumber ?? null,
      ctpsNumber: dto.ctpsNumber ?? null,
      bankName: dto.bankName ?? null,
      bankAgency: dto.bankAgency ?? null,
      bankAccount: dto.bankAccount ?? null,
      bankPixKey: dto.bankPixKey ?? null,
      notes: dto.notes ?? null,
    };
    return this.prisma.personEmployment.upsert({
      where: { userId_companyId: { userId: targetUserId, companyId: dto.companyId } },
      create: { userId: targetUserId, companyId: dto.companyId, ...data },
      update: data,
    });
  }

  async listDocuments(userId: string, targetUserId: string, companyId: string) {
    if (!companyId || companyId === 'undefined' || companyId === 'null') throw new BadRequestException('companyId é obrigatório');
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.personDocument.findMany({
      where: { userId: targetUserId, OR: [{ companyId }, { companyId: null }] },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDocument(userId: string, targetUserId: string, dto: DocumentDto) {
    const companyId = dto.companyId;
    if (!companyId) throw new BadRequestException('companyId obrigatório');
    await this.ensureManager(userId, companyId);
    return this.prisma.personDocument.create({
      data: {
        userId: targetUserId,
        companyId,
        kind: dto.kind,
        name: dto.name,
        number: dto.number ?? null,
        fileUrl: dto.fileUrl ?? null,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        notes: dto.notes ?? null,
      },
    });
  }

  async deleteDocument(userId: string, targetUserId: string, docId: string, companyId: string) {
    await this.ensureManager(userId, companyId);
    await this.prisma.personDocument.deleteMany({ where: { id: docId, userId: targetUserId } });
    return { ok: true };
  }

  async updateRole(userId: string, targetUserId: string, dto: UpdatePersonRoleDto) {
    const activeCompanyId = dto.companyId;
    await this.ensureManager(userId, activeCompanyId);
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException();
    if (target.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()) {
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
    if (target.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()) {
      throw new ForbiddenException('Superadmin não pode ser removido');
    }

    // Deleta os vínculos de fazenda nesta empresa
    await this.prisma.farmAssignment.deleteMany({
      where: { userId: targetUserId, companyId },
    });

    // Deleta os documentos vinculados a esta empresa
    await this.prisma.personDocument.deleteMany({
      where: { userId: targetUserId, companyId },
    });

    // Deleta o emprego nesta empresa
    await this.prisma.personEmployment.deleteMany({
      where: { userId: targetUserId, companyId },
    });

    // Remove a role da empresa
    await this.prisma.userRole.deleteMany({ where: { userId: targetUserId, companyId } });
    
    return { ok: true };
  }

  // ===== Ativar/Desativar acesso ao sistema =====
  async setActive(userId: string, targetUserId: string, companyId: string, dto: ToggleActiveDto) {
    await this.ensureManager(userId, companyId);
    await this.ensureMember(targetUserId, companyId);
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException();
    if (target.email.toLowerCase() === SUPERADMIN_EMAIL && !dto.active) {
      throw new ForbiddenException('Superadmin não pode ser desativado');
    }
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        active: dto.active,
        deactivatedAt: dto.active ? null : new Date(),
        deactivationReason: dto.active ? null : (dto.reason ?? null),
      },
    });
    if (!dto.active) {
      // encerra sessões
      await this.prisma.refreshToken.updateMany({
        where: { userId: targetUserId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { ok: true };
  }

  // ===== Vínculos com fazendas (histórico) =====
  async listAssignments(userId: string, targetUserId: string, companyId: string) {
    if (!companyId || companyId === 'undefined' || companyId === 'null') throw new BadRequestException('companyId é obrigatório');
    await this.access.ensureCompany(userId, companyId);
    const items = await this.prisma.farmAssignment.findMany({
      where: { userId: targetUserId, companyId },
      include: {
        farm: { select: { id: true, name: true, code: true } },
        consultor: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: [{ endAt: 'asc' }, { startAt: 'desc' }],
    });
    return items;
  }

  async listFarmTeam(userId: string, farmId: string, companyId: string, includeHistory = false) {
    if (!companyId || companyId === 'undefined' || companyId === 'null') throw new BadRequestException('companyId é obrigatório');
    await this.access.ensureCompany(userId, companyId);
    const farm = await this.prisma.farm.findFirst({ where: { id: farmId, companyId } });
    if (!farm) throw new NotFoundException('Fazenda não encontrada');
    return this.prisma.farmAssignment.findMany({
      where: { farmId, companyId, ...(includeHistory ? {} : { endAt: null }) },
      include: {
        user: { select: { id: true, fullName: true, email: true, avatarUrl: true, active: true } },
        consultor: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: [{ endAt: 'asc' }, { role: 'asc' }, { startAt: 'desc' }],
    });
  }

  async createAssignment(userId: string, targetUserId: string, dto: CreateAssignmentDto) {
    const activeCompanyId = dto.companyId;
    await this.ensureManager(userId, activeCompanyId);
    await this.ensureMember(targetUserId, activeCompanyId);
    
    if (!dto.farmId || dto.farmId === 'null' || dto.farmId === 'undefined') {
      throw new BadRequestException('ID da fazenda é obrigatório');
    }

    const farm = await this.prisma.farm.findFirst({ 
      where: { id: dto.farmId, companyId: activeCompanyId } 
    });
    if (!farm) throw new BadRequestException('Fazenda inválida ou pertence a outra empresa');

    if (dto.consultorUserId) {
      const ok = await this.prisma.userRole.findFirst({
        where: { userId: dto.consultorUserId, companyId: activeCompanyId },
      });
      if (!ok) throw new BadRequestException('Consultor não pertence à empresa ativa');
    }

    // Encerra vínculo aberto anterior da mesma pessoa/fazenda/role
    await this.prisma.farmAssignment.updateMany({
      where: {
        userId: targetUserId, farmId: dto.farmId, role: dto.role, endAt: null,
      },
      data: { endAt: new Date(dto.startAt), endReason: 'Substituído por novo vínculo' },
    });

    return this.prisma.farmAssignment.create({
      data: {
        userId: targetUserId,
        farmId: dto.farmId,
        companyId: activeCompanyId,
        role: dto.role,
        consultorUserId: dto.consultorUserId ?? null,
        startAt: new Date(dto.startAt),
        notes: dto.notes ?? null,
        createdById: userId,
      },
    });
  }

  async endAssignment(userId: string, targetUserId: string, assignmentId: string, dto: EndAssignmentDto) {
    const activeCompanyId = dto.companyId;
    await this.ensureManager(userId, activeCompanyId);
    const a = await this.prisma.farmAssignment.findUnique({ where: { id: assignmentId } });
    if (!a || a.userId !== targetUserId || a.companyId !== activeCompanyId) {
      throw new NotFoundException('Vínculo não encontrado ou pertence a outra empresa');
    }
    return this.prisma.farmAssignment.update({
      where: { id: assignmentId },
      data: {
        endAt: dto.endAt ? new Date(dto.endAt) : new Date(),
        endReason: dto.endReason ?? null,
      },
    });
  }

  async deleteAssignment(userId: string, targetUserId: string, assignmentId: string, companyId: string) {
    const activeCompanyId = companyId;
    await this.ensureManager(userId, activeCompanyId);
    await this.prisma.farmAssignment.deleteMany({
      where: { id: assignmentId, userId: targetUserId, companyId: activeCompanyId },
    });
    return { ok: true };
  }

  // ===== Avaliações =====
  async listEvaluations(userId: string, targetUserId: string, companyId: string) {
    if (!companyId || companyId === 'undefined' || companyId === 'null') throw new BadRequestException('companyId é obrigatório');
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.personEvaluation.findMany({
      where: { userId: targetUserId, companyId },
      include: { evaluator: { select: { id: true, fullName: true, email: true } } },
      orderBy: { ratedAt: 'desc' },
    });
  }

  async createEvaluation(userId: string, targetUserId: string, dto: CreateEvaluationDto) {
    const activeCompanyId = dto.companyId;
    await this.ensureManager(userId, activeCompanyId);
    await this.ensureMember(targetUserId, activeCompanyId);
    return this.prisma.personEvaluation.create({
      data: {
        userId: targetUserId,
        companyId: activeCompanyId,
        companyId: dto.companyId,
        evaluatorUserId: userId,
        ratedAt: new Date(dto.ratedAt),
        rating: dto.rating,
        category: dto.category ?? null,
        title: dto.title ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  async deleteEvaluation(userId: string, targetUserId: string, evaluationId: string, companyId: string) {
    await this.ensureManager(userId, companyId);
    await this.prisma.personEvaluation.deleteMany({
      where: { id: evaluationId, userId: targetUserId, companyId },
    });
    return { ok: true };
  }
}
