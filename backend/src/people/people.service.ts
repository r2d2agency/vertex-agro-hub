import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';
import {
  CreateAssignmentDto, CreateEvaluationDto, DocumentDto, EmploymentDto,
  EndAssignmentDto, InvitePersonDto, PersonalDataDto, ToggleActiveDto,
  UpdatePersonRoleDto, CompanyRole, AssignmentRole, UpsertPersonAccessDto,
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

function normalizeEmail(email?: string | null) {
  const value = email?.trim().toLowerCase();
  return value ? value : null;
}

function normalizeCpf(cpf?: string | null) {
  const value = cpf?.replace(/\D/g, '') ?? '';
  return value || null;
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

  private async isCompanyManager(userId: string, companyId: string) {
    const isGlobal = await this.prisma.userRole.findFirst({ where: { userId, role: 'admin_global' } });
    if (isGlobal) return true;
    const isCompanyAdmin = await this.prisma.userRole.findFirst({
      where: { userId, companyId, role: { in: ['admin_empresa', 'gestor'] } },
    });
    return !!isCompanyAdmin;
  }

  // Um consultor pode gerenciar vínculos (criar/encerrar) e avaliar apenas
  // monitores/sangradores das fazendas onde ele próprio tem um vínculo ativo
  // de consultor — nunca outros consultores, gestores ou admins.
  private async ensureManagerOrFarmConsultor(
    userId: string,
    companyId: string,
    farmId: string,
    targetRole: string,
  ) {
    if (await this.isCompanyManager(userId, companyId)) return;
    if (!['monitor', 'sangrador'].includes(targetRole)) {
      throw new ForbiddenException('Consultor só pode gerenciar vínculos de monitor ou sangrador');
    }
    const isConsultorHere = await this.prisma.farmAssignment.findFirst({
      where: { userId, companyId, farmId, role: 'consultor', endAt: null },
    });
    if (!isConsultorHere) throw new ForbiddenException('Sem permissão para gerenciar recursos nesta empresa');
  }

  private async ensureManagerOrCanEvaluate(userId: string, companyId: string, targetUserId: string) {
    if (await this.isCompanyManager(userId, companyId)) return;
    const consultorFarms = await this.prisma.farmAssignment.findMany({
      where: { userId, companyId, role: 'consultor', endAt: null },
      select: { farmId: true },
    });
    if (consultorFarms.length === 0) throw new ForbiddenException('Sem permissão para gerenciar recursos nesta empresa');
    const targetLink = await this.prisma.farmAssignment.findFirst({
      where: {
        userId: targetUserId, companyId,
        farmId: { in: consultorFarms.map((f) => f.farmId) },
        role: { in: ['monitor', 'sangrador'] },
        endAt: null,
      },
    });
    if (!targetLink) throw new ForbiddenException('Consultor só pode avaliar monitores/sangradores das fazendas onde atua');
  }

  private async ensureMember(targetUserId: string, companyId: string) {
    if (!targetUserId || targetUserId === 'null' || targetUserId === 'undefined') {
      throw new BadRequestException('ID de usuário inválido');
    }
    const link = await this.prisma.userCompany.findFirst({
      where: { 
        userId: targetUserId,
        companyId: companyId,
        active: true,
      } 
    });
    if (!link) {
      // Se não encontrar o vínculo específico, verifica se é admin_global
      const globalAdmin = await this.prisma.userRole.findFirst({
        where: { userId: targetUserId, role: 'admin_global' }
      });
      if (!globalAdmin) {
        throw new ForbiddenException('Pessoa não pertence a esta empresa');
      }
    }
  }

  async list(userId: string, companyId: string) {
    if (!companyId || companyId === 'undefined' || companyId === 'null') throw new BadRequestException('companyId é obrigatório');
    await this.access.ensureCompany(userId, companyId);
    const links = await this.prisma.userCompany.findMany({
      where: { companyId, active: true },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
            createdAt: true,
            cpf: true,
            phone: true,
            active: true,
            passwordHash: true,
            googleId: true,
            roles: {
              where: { companyId },
              select: { role: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return links.map(({ user }) => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      cpf: user.cpf,
      phone: user.phone,
      active: user.active,
      hasAccess: Boolean((user.email && user.passwordHash) || user.googleId),
      roles: user.roles.map((r) => r.role as CompanyRole),
    }));
  }

  async get(userId: string, targetUserId: string, companyId: string) {
    if (!companyId || companyId === 'undefined' || companyId === 'null') throw new BadRequestException('companyId é obrigatório');
    
    // Admin global pode ver qualquer pessoa
    const isGlobal = await this.access.isAdminGlobal(userId);
    if (!isGlobal) {
      await this.access.ensureCompany(userId, companyId);
      await this.ensureMember(targetUserId, companyId);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        companyLinks: { where: { companyId, active: true } },
        employments: { where: { companyId } },
        documents: { where: { OR: [{ companyId }, { companyId: null }] }, orderBy: { createdAt: 'desc' } },
        roles: { where: { companyId }, select: { role: true } },
      },
    });
    
    if (!user) throw new NotFoundException('Pessoa não encontrada');
    const { passwordHash: _pw, ...safe } = user as any;
    return {
      ...safe,
      employment: user.employments[0] ?? null,
      roles: user.roles.map((r) => r.role),
      hasAccess: Boolean((user.email && user.passwordHash) || user.googleId),
      companyLinked: user.companyLinks.length > 0,
    };
  }

  private generateTempPassword() {
    // Formato: vtex + 4 dígitos (ex: vtex7392)
    const n = Math.floor(1000 + Math.random() * 9000);
    return `vtex${n}`;
  }

  private async ensureCompanyLink(targetUserId: string, companyId: string, createdById: string) {
    await this.prisma.userCompany.upsert({
      where: { userId_companyId: { userId: targetUserId, companyId } },
      create: {
        userId: targetUserId,
        companyId,
        createdById,
        active: true,
      },
      update: {
        active: true,
      },
    });
  }

  private async assignCompanyRole(targetUserId: string, companyId: string, role?: CompanyRole | null) {
    if (!role) return;
    await this.prisma.userRole.deleteMany({ where: { userId: targetUserId, companyId } });
    await this.prisma.userRole.create({
      data: { userId: targetUserId, companyId, role },
    });
  }

  private async resolveExistingPerson(input: { email?: string | null; cpf?: string | null }) {
    const byCpf = input.cpf
      ? await this.prisma.user.findFirst({ where: { cpf: input.cpf } })
      : null;
    const byEmail = input.email
      ? await this.prisma.user.findFirst({ where: { email: input.email } })
      : null;

    if (byCpf && byEmail && byCpf.id !== byEmail.id) {
      throw new BadRequestException('CPF e e-mail já estão vinculados a cadastros diferentes.');
    }
    return byCpf ?? byEmail;
  }

  async invite(userId: string, dto: InvitePersonDto) {
    const activeCompanyId = dto.companyId;
    await this.ensureManager(userId, activeCompanyId);
    const email = normalizeEmail(dto.email);
    const cpf = normalizeCpf(dto.cpf);
    const personal = pickPersonal({ ...dto, cpf: cpf ?? undefined });

    if (!cpf && !email) {
      throw new BadRequestException('Informe ao menos CPF ou e-mail para garantir cadastro único.');
    }

    let user = await this.resolveExistingPerson({ email, cpf });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          fullName: dto.fullName,
          email,
          ...personal,
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          ...personal,
          fullName: personal.fullName ?? dto.fullName ?? user.fullName,
          ...(email ? { email } : {}),
        },
      });
    }

    await this.ensureCompanyLink(user.id, activeCompanyId, userId);
    await this.assignCompanyRole(user.id, activeCompanyId, dto.role ?? null);

    let generatedPassword: string | undefined;
    const shouldGrantAccess = Boolean(dto.grantAccess || dto.role || dto.password);
    if (shouldGrantAccess && email) {
      const result = await this.upsertAccess(userId, user.id, {
        companyId: activeCompanyId,
        email,
        password: dto.password,
        role: dto.role ?? 'consulta',
        active: true,
      });
      generatedPassword = result.generatedPassword;
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      generatedPassword,
      hasAccess: Boolean((shouldGrantAccess && email) || (user.email && user.passwordHash) || user.googleId || generatedPassword),
    };
  }

  async upsertAccess(userId: string, targetUserId: string, dto: UpsertPersonAccessDto) {
    await this.ensureManager(userId, dto.companyId);
    await this.ensureMember(targetUserId, dto.companyId);

    const email = normalizeEmail(dto.email);
    if (!email) throw new BadRequestException('E-mail é obrigatório para conceder acesso.');

    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('Pessoa não encontrada');

    const existingEmailOwner = await this.prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });
    if (existingEmailOwner && existingEmailOwner.id !== targetUserId) {
      throw new BadRequestException('Este e-mail já está em uso por outro cadastro.');
    }

    const generatedPassword = dto.password
      ? undefined
      : !target.passwordHash && !target.googleId
      ? this.generateTempPassword()
      : undefined;
    const effectivePassword = dto.password ?? generatedPassword;

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        email,
        ...(effectivePassword ? { passwordHash: await bcrypt.hash(effectivePassword, 10) } : {}),
        active: dto.active ?? true,
        deactivatedAt: dto.active === false ? new Date() : null,
        deactivationReason: dto.active === false ? 'Acesso desativado manualmente' : null,
      },
    });

    await this.ensureCompanyLink(targetUserId, dto.companyId, userId);

    const roleToAssign = dto.role ?? 'consulta';
    await this.assignCompanyRole(targetUserId, dto.companyId, roleToAssign);

    return {
      id: targetUserId,
      email,
      fullName: target.fullName,
      generatedPassword,
    };
  }

  async resetPassword(userId: string, targetUserId: string, companyId: string) {
    await this.ensureManager(userId, companyId);
    await this.ensureMember(targetUserId, companyId);
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException();
    if (!target.email || !target.passwordHash) {
      throw new BadRequestException('Esta pessoa ainda não possui acesso configurado.');
    }
    if (target.email && target.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()) {
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
    const data = pickPersonal({ ...dto, cpf: normalizeCpf(dto.cpf) ?? undefined });
    
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
      admissionDate: dto.admissionDate ? new Date(dto.admissionDate).toISOString() : null,
      terminationDate: dto.terminationDate ? new Date(dto.terminationDate).toISOString() : null,
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
      create: { 
        userId: targetUserId, 
        companyId: dto.companyId, 
        ...data 
      },
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
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt).toISOString() : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt).toISOString() : null,
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
    if (target.email && target.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()) {
      throw new ForbiddenException('Superadmin não pode ter papel alterado');
    }
    await this.assignCompanyRole(targetUserId, activeCompanyId, dto.role);
    return { ok: true };
  }

  async remove(userId: string, targetUserId: string, companyId: string) {
    await this.ensureManager(userId, companyId);
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException();
    if (target.email && target.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()) {
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
    await this.prisma.userCompany.deleteMany({ where: { userId: targetUserId, companyId } });
    
    return { ok: true };
  }

  // ===== Ativar/Desativar acesso ao sistema =====
  async setActive(userId: string, targetUserId: string, companyId: string, dto: ToggleActiveDto) {
    await this.ensureManager(userId, companyId);
    await this.ensureMember(targetUserId, companyId);
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException();
    if (target.email && target.email.toLowerCase() === SUPERADMIN_EMAIL && !dto.active) {
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

  async listCompanyAssignments(
    userId: string,
    companyId: string,
    filters: {
      role?: CompanyRole | AssignmentRole;
      userId?: string;
      farmId?: string;
      consultorUserId?: string;
      includeHistory?: boolean;
    } = {},
  ) {
    if (!companyId || companyId === 'undefined' || companyId === 'null') {
      throw new BadRequestException('companyId é obrigatório');
    }
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.farmAssignment.findMany({
      where: {
        companyId,
        ...(filters.includeHistory ? {} : { endAt: null }),
        ...(filters.role ? { role: filters.role as AssignmentRole } : {}),
        ...(filters.userId ? { userId: filters.userId } : {}),
        ...(filters.farmId ? { farmId: filters.farmId } : {}),
        ...(filters.consultorUserId ? { consultorUserId: filters.consultorUserId } : {}),
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, avatarUrl: true, active: true } },
        farm: { select: { id: true, name: true, code: true } },
        consultor: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: [{ role: 'asc' }, { startAt: 'desc' }],
    });
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
        farm: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ endAt: 'asc' }, { role: 'asc' }, { startAt: 'desc' }],
    });
  }

  async createAssignment(userId: string, targetUserId: string, dto: CreateAssignmentDto) {
    const activeCompanyId = dto.companyId;
    if (!dto.farmId || dto.farmId === 'null' || dto.farmId === 'undefined') {
      throw new BadRequestException('ID da fazenda é obrigatório');
    }
    await this.ensureManagerOrFarmConsultor(userId, activeCompanyId, dto.farmId, dto.role);
    await this.ensureMember(targetUserId, activeCompanyId);

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
        startAt: new Date(dto.startAt).toISOString(),
        notes: dto.notes ?? null,
        createdById: userId,
      },
    });
  }

  async endAssignment(userId: string, targetUserId: string, assignmentId: string, dto: EndAssignmentDto) {
    const activeCompanyId = dto.companyId;
    const a = await this.prisma.farmAssignment.findUnique({ where: { id: assignmentId } });
    if (!a || a.userId !== targetUserId || a.companyId !== activeCompanyId) {
      throw new NotFoundException('Vínculo não encontrado ou pertence a outra empresa');
    }
    await this.ensureManagerOrFarmConsultor(userId, activeCompanyId, a.farmId, a.role);
    return this.prisma.farmAssignment.update({
      where: { id: assignmentId },
      data: {
        endAt: dto.endAt ? new Date(dto.endAt).toISOString() : new Date().toISOString(),
        endReason: dto.endReason ?? null,
      },
    });
  }

  async deleteAssignment(userId: string, targetUserId: string, assignmentId: string, companyId: string) {
    const activeCompanyId = companyId;
    const a = await this.prisma.farmAssignment.findFirst({
      where: { id: assignmentId, userId: targetUserId, companyId: activeCompanyId },
    });
    if (!a) return { ok: true };
    await this.ensureManagerOrFarmConsultor(userId, activeCompanyId, a.farmId, a.role);
    await this.prisma.farmAssignment.delete({ where: { id: a.id } });
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
    await this.ensureManagerOrCanEvaluate(userId, activeCompanyId, targetUserId);
    await this.ensureMember(targetUserId, activeCompanyId);
    return this.prisma.personEvaluation.create({
      data: {
        userId: targetUserId,
        companyId: activeCompanyId,
        evaluatorUserId: userId,
        ratedAt: new Date(dto.ratedAt).toISOString(),
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
