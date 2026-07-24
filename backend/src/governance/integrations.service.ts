import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService, private readonly access: CompanyAccess) {}

  async list(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.integration.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } });
  }
  async create(userId: string, dto: { companyId: string; provider: string; name: string; config?: any; secret?: string; active?: boolean }) {
    await this.access.ensureCompany(userId, dto.companyId);
    return this.prisma.integration.create({ data: {
      companyId: dto.companyId, provider: dto.provider, name: dto.name,
      config: dto.config ?? undefined, secret: dto.secret ?? null,
      active: dto.active ?? true,
    } });
  }
  async update(userId: string, id: string, dto: any) {
    const cur = await this.prisma.integration.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    return this.prisma.integration.update({ where: { id }, data: { ...dto, companyId: undefined } });
  }
  async remove(userId: string, id: string) {
    const cur = await this.prisma.integration.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    await this.prisma.integration.delete({ where: { id } });
    return { ok: true };
  }
  async deliveries(userId: string, integrationId: string) {
    const cur = await this.prisma.integration.findUnique({ where: { id: integrationId } });
    if (!cur) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    return this.prisma.webhookDelivery.findMany({
      where: { integrationId }, orderBy: { attemptedAt: 'desc' }, take: 100,
    });
  }

  async test(userId: string, id: string) {
    const cur = await this.prisma.integration.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException();
    await this.access.ensureCompany(userId, cur.companyId);
    const url = (cur.config as any)?.url;
    if (!url) return this.recordDelivery(cur.id, 'test', { ok: false }, 'error', 0, 'URL não configurada');
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(cur.secret ? { 'X-Vertex-Signature': cur.secret } : {}) },
        body: JSON.stringify({ event: 'test', at: new Date().toISOString() }),
      });
      const body = await res.text().catch(() => '');
      return this.recordDelivery(cur.id, 'test', { ok: res.ok }, res.ok ? 'ok' : 'error', res.status, body.slice(0, 500));
    } catch (e: any) {
      return this.recordDelivery(cur.id, 'test', { ok: false }, 'error', 0, String(e?.message ?? e).slice(0, 500));
    }
  }

  private async recordDelivery(integrationId: string, event: string, payload: any, status: string, statusCode: number, responseBody: string) {
    return this.prisma.webhookDelivery.create({ data: {
      integrationId, event, payload, status, statusCode, responseBody,
    } });
  }
}
