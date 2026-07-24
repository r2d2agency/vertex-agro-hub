import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccess } from '../common/company-access';

type Provider = 'lovable' | 'openai' | 'gemini';

type AiConfig = {
  provider: Provider;
  apiKey?: string | null;
  model?: string | null;
  useEnvKey?: boolean;
};

const DEFAULT_MODELS: Record<Provider, string> = {
  lovable: 'google/gemini-3.6-flash',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.5-flash',
};

const PROVIDER_ENDPOINTS: Record<Provider, string> = {
  lovable: 'https://ai.gateway.lovable.dev/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
};

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: any };

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  constructor(private readonly prisma: PrismaService, private readonly access: CompanyAccess) {}

  // ---------------- Provider config ----------------
  async getConfig(userId: string, companyId: string): Promise<AiConfig & { hasKey: boolean; envKeyAvailable: boolean }> {
    await this.access.ensureCompany(userId, companyId);
    const s = await this.prisma.companySettings.findUnique({ where: { companyId } });
    const raw = ((s?.extra as any)?.ai ?? {}) as Partial<AiConfig>;
    const provider = (raw.provider as Provider) || 'lovable';
    return {
      provider,
      model: raw.model || DEFAULT_MODELS[provider],
      useEnvKey: raw.useEnvKey ?? (provider === 'lovable' && !raw.apiKey),
      apiKey: null, // nunca devolvemos a chave
      hasKey: !!raw.apiKey,
      envKeyAvailable: !!process.env.LOVABLE_API_KEY,
    };
  }

  async updateConfig(userId: string, companyId: string, dto: AiConfig) {
    await this.access.ensureCompany(userId, companyId);
    const provider = (dto.provider as Provider) || 'lovable';
    if (!['lovable', 'openai', 'gemini'].includes(provider)) {
      throw new BadRequestException('Provedor inválido');
    }
    const cur = await this.prisma.companySettings.findUnique({ where: { companyId } });
    const extra = { ...(cur?.extra as any) };
    const prevAi = (extra.ai ?? {}) as Partial<AiConfig>;
    const useEnvKey = dto.useEnvKey ?? false;
    const nextKey = useEnvKey
      ? null
      : (dto.apiKey && dto.apiKey.trim() ? dto.apiKey.trim() : prevAi.apiKey ?? null);
    extra.ai = {
      provider,
      model: dto.model?.trim() || DEFAULT_MODELS[provider],
      apiKey: nextKey,
      useEnvKey,
    };
    await this.prisma.companySettings.upsert({
      where: { companyId },
      create: { companyId, extra },
      update: { extra },
    });
    return this.getConfig(userId, companyId);
  }

  async testConfig(userId: string, companyId: string, dto?: Partial<AiConfig>) {
    await this.access.ensureCompany(userId, companyId);
    const cfg = await this.resolveConfig(companyId, dto);
    try {
      const content = await this.callProvider(cfg, [
        { role: 'system', content: 'Responda apenas com a palavra: ok' },
        { role: 'user', content: 'teste de conexão' },
      ]);
      return { ok: true, provider: cfg.provider, model: cfg.model, sample: String(content).slice(0, 120) };
    } catch (e: any) {
      return { ok: false, provider: cfg.provider, model: cfg.model, error: e?.message ?? 'erro desconhecido' };
    }
  }

  private async resolveConfig(companyId: string, override?: Partial<AiConfig>): Promise<{ provider: Provider; model: string; apiKey: string; endpoint: string }> {
    const s = await this.prisma.companySettings.findUnique({ where: { companyId } });
    const stored = ((s?.extra as any)?.ai ?? {}) as Partial<AiConfig>;
    const provider = (override?.provider ?? stored.provider ?? 'lovable') as Provider;
    const model = override?.model?.trim() || stored.model || DEFAULT_MODELS[provider];
    const useEnvKey = override?.useEnvKey ?? stored.useEnvKey ?? (provider === 'lovable' && !stored.apiKey);
    let apiKey = (override?.apiKey && override.apiKey.trim()) || (!useEnvKey ? stored.apiKey ?? '' : '');
    if (!apiKey && provider === 'lovable') apiKey = process.env.LOVABLE_API_KEY ?? '';
    if (!apiKey && useEnvKey && provider === 'lovable') apiKey = process.env.LOVABLE_API_KEY ?? '';
    if (!apiKey) {
      throw new BadRequestException(
        provider === 'lovable'
          ? 'Configure a chave da IA em Central IA → Configuração do provedor (ou defina LOVABLE_API_KEY no backend).'
          : `Configure a chave do provedor ${provider} em Central IA → Configuração do provedor.`,
      );
    }
    return { provider, model, apiKey, endpoint: PROVIDER_ENDPOINTS[provider] };
  }

  private async callProvider(
    cfg: { provider: Provider; model: string; apiKey: string; endpoint: string },
    messages: ChatMessage[],
    opts: { json?: boolean } = {},
  ) {
    const body: any = { model: cfg.model, messages };
    if (opts.json) body.response_format = { type: 'json_object' };
    const res = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      if (res.status === 429) throw new BadRequestException('Limite de requisições atingido. Tente novamente em instantes.');
      if (res.status === 402) throw new BadRequestException('Créditos de IA esgotados no provedor.');
      if (res.status === 401) throw new BadRequestException('Chave da IA inválida ou expirada.');
      throw new BadRequestException(`IA (${cfg.provider}): ${res.status} ${text.slice(0, 200)}`);
    }
    const json: any = await res.json();
    return json.choices?.[0]?.message?.content ?? '';
  }

  private async callAi(companyId: string, messages: ChatMessage[], opts: { json?: boolean } = {}) {
    const cfg = await this.resolveConfig(companyId);
    return { content: await this.callProvider(cfg, messages, opts), model: cfg.model };
  }

  // ---------------- Context builder ----------------
  private async buildContext(companyId: string) {
    const now = new Date();
    const from = new Date(now.getTime() - 90 * 86400000);

    const [company, farms, deliveries, taps, occ] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }),
      this.prisma.farm.findMany({
        where: { companyId, isDeleted: false },
        select: { id: true, name: true, totalAreaHa: true, city: true, state: true },
      }),
      this.prisma.productionDelivery.findMany({
        where: { companyId, isDeleted: false, deliveryDate: { gte: from } },
        select: { deliveryDate: true, netWeightKg: true, drcAvgPercent: true, dryKg: true, farmId: true },
      }),
      this.prisma.tappingRecord.findMany({
        where: { companyId, isDeleted: false, date: { gte: from } },
        select: { date: true, liters: true, drcPercent: true, dryKg: true, farmId: true, sangradorName: true, adherencePct: true },
      }),
      this.prisma.occurrence.findMany({
        where: { companyId, isDeleted: false, date: { gte: from } },
        select: { date: true, type: true, severity: true, status: true, farmId: true, description: true },
        orderBy: { date: 'desc' },
        take: 30,
      }),
    ]);

    const totalDry = deliveries.reduce((a, d) => a + (d.dryKg ?? 0), 0);
    const drcAvg = deliveries.length ? deliveries.reduce((a, d) => a + (d.drcAvgPercent ?? 0), 0) / deliveries.length : 0;

    return { company, farms, deliveries, taps, occ, totals: { totalDry, drcAvg, farmCount: farms.length } };
  }

  private summarizeContext(ctx: Awaited<ReturnType<AiService['buildContext']>>) {
    const perFarm = new Map<string, { name: string; dry: number; days: number }>();
    for (const f of ctx.farms) perFarm.set(f.id, { name: f.name, dry: 0, days: 0 });
    for (const d of ctx.deliveries) {
      const r = perFarm.get(d.farmId ?? '');
      if (r) r.dry += d.dryKg ?? 0;
    }
    for (const t of ctx.taps) {
      const r = perFarm.get(t.farmId ?? '');
      if (r) r.days += 1;
    }
    const farms = Array.from(perFarm.values()).sort((a, b) => b.dry - a.dry);
    return {
      empresa: ctx.company?.name,
      periodo_dias: 90,
      total_fazendas: ctx.farms.length,
      total_entregas: ctx.deliveries.length,
      total_dias_sangria: ctx.taps.length,
      total_kg_secos: +ctx.totals.totalDry.toFixed(2),
      drc_medio: +ctx.totals.drcAvg.toFixed(2),
      fazendas: farms.map((f) => ({ nome: f.name, kg_secos: +f.dry.toFixed(1), dias_sangria: f.days })),
      ocorrencias_recentes: ctx.occ.map((o) => ({ data: o.date.toISOString().slice(0, 10), tipo: o.type, severidade: o.severity, status: o.status, descricao: o.description })).slice(0, 15),
    };
  }

  // ---------------- Insights ----------------
  async listInsights(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.aiInsight.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' }, take: 200 });
  }

  async ackInsight(userId: string, id: string) {
    const cur = await this.prisma.aiInsight.findUnique({ where: { id } });
    if (!cur) throw new BadRequestException('Insight não encontrado');
    await this.access.ensureCompany(userId, cur.companyId);
    return this.prisma.aiInsight.update({ where: { id }, data: { acknowledged: true } });
  }

  async generateInsights(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    const ctx = await this.buildContext(companyId);
    const summary = this.summarizeContext(ctx);

    const prompt: ChatMessage[] = [
      {
        role: 'system',
        content:
          'Você é um analista sênior de heveicultura (seringais). Analise os dados operacionais dos últimos 90 dias e identifique anomalias, riscos e oportunidades. ' +
          'Responda SOMENTE em JSON válido com o esquema: {"insights":[{"kind":"producao|drc|ocorrencia|clima|risco|oportunidade","severity":"info|warning|critical","title":"...","summary":"...","farm":"nome da fazenda ou null"}]}. Máximo 6 insights, priorize os mais acionáveis.',
      },
      { role: 'user', content: `Dados:\n${JSON.stringify(summary, null, 2)}` },
    ];

    const { content: raw, model } = await this.callAi(companyId, prompt, { json: true });
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { throw new BadRequestException('Resposta da IA inválida'); }
    const items: any[] = Array.isArray(parsed?.insights) ? parsed.insights : [];

    const farmByName = new Map(ctx.farms.map((f) => [f.name.toLowerCase(), f.id]));
    const created = [] as any[];
    for (const it of items.slice(0, 8)) {
      const farmId = it.farm ? farmByName.get(String(it.farm).toLowerCase()) ?? null : null;
      const row = await this.prisma.aiInsight.create({
        data: {
          companyId,
          farmId,
          kind: String(it.kind ?? 'risco').slice(0, 40),
          severity: ['info', 'warning', 'critical'].includes(it.severity) ? it.severity : 'info',
          title: String(it.title ?? '').slice(0, 200) || 'Insight',
          summary: it.summary ? String(it.summary).slice(0, 2000) : null,
          details: it,
          model,
        },
      });
      created.push(row);
    }
    return { generated: created.length, insights: created };
  }

  // ---------------- Chat (assistente) ----------------
  async chat(userId: string, companyId: string, messages: ChatMessage[]) {
    await this.access.ensureCompany(userId, companyId);
    if (!Array.isArray(messages) || messages.length === 0) throw new BadRequestException('messages obrigatório');
    const ctx = await this.buildContext(companyId);
    const summary = this.summarizeContext(ctx);
    const system: ChatMessage = {
      role: 'system',
      content:
        'Você é o Assistente Gerencial Vertex Agro, especialista em gestão de seringais. Use APENAS os dados fornecidos para responder. ' +
        'Seja objetivo, use números e cite fazendas por nome. Se a informação não estiver disponível, diga claramente. Responda em português.\n\n' +
        `Contexto operacional (últimos 90 dias):\n${JSON.stringify(summary)}`,
    };
    const { content } = await this.callAi(companyId, [system, ...messages.slice(-12)]);
    return { role: 'assistant' as const, content };
  }

  // ---------------- Forecast ----------------
  async forecast(userId: string, companyId: string, horizonDays = 30) {
    await this.access.ensureCompany(userId, companyId);
    const ctx = await this.buildContext(companyId);
    const daily = new Map<string, number>();
    for (const d of ctx.deliveries) {
      const k = d.deliveryDate.toISOString().slice(0, 10);
      daily.set(k, (daily.get(k) ?? 0) + (d.dryKg ?? 0));
    }
    const series = Array.from(daily.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, kg]) => ({ date, kg }));

    const n = series.length;
    const baseline = n > 0 ? series.reduce((a, s) => a + s.kg, 0) / n : 0;
    let slope = 0;
    if (n >= 2) {
      const xs = series.map((_, i) => i);
      const ys = series.map((s) => s.kg);
      const meanX = xs.reduce((a, x) => a + x, 0) / n;
      const meanY = ys.reduce((a, y) => a + y, 0) / n;
      const num = xs.reduce((a, x, i) => a + (x - meanX) * (ys[i] - meanY), 0);
      const den = xs.reduce((a, x) => a + (x - meanX) ** 2, 0) || 1;
      slope = num / den;
    }
    const predictedDaily = Math.max(0, baseline + slope * (n + horizonDays / 2));
    const predicted = predictedDaily * horizonDays;
    const baselineTotal = baseline * horizonDays;
    const confidence = n >= 14 ? 0.75 : n >= 7 ? 0.5 : 0.3;

    const row = await this.prisma.aiForecast.create({
      data: {
        companyId,
        horizonDays,
        predictedDryKg: +predicted.toFixed(2),
        baselineDryKg: +baselineTotal.toFixed(2),
        confidence,
        method: 'linear_trend',
        series: series.slice(-90),
        notes: n < 7 ? 'Poucos dados históricos — previsão de baixa confiança.' : null,
      },
    });
    return row;
  }

  async listForecasts(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.aiForecast.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' }, take: 20 });
  }

  // ---------------- Action Plans ----------------
  async listPlans(userId: string, companyId: string) {
    await this.access.ensureCompany(userId, companyId);
    return this.prisma.actionPlan.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } });
  }

  async createPlan(userId: string, dto: any) {
    await this.access.ensureCompany(userId, dto.companyId);
    return this.prisma.actionPlan.create({
      data: {
        companyId: dto.companyId,
        farmId: dto.farmId ?? null,
        insightId: dto.insightId ?? null,
        title: String(dto.title ?? '').slice(0, 200),
        description: dto.description ?? null,
        priority: dto.priority ?? 'media',
        status: dto.status ?? 'aberto',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assignee: dto.assignee ?? null,
        steps: dto.steps ?? undefined,
      },
    });
  }

  async updatePlan(userId: string, id: string, dto: any) {
    const cur = await this.prisma.actionPlan.findUnique({ where: { id } });
    if (!cur) throw new BadRequestException('Plano não encontrado');
    await this.access.ensureCompany(userId, cur.companyId);
    return this.prisma.actionPlan.update({
      where: { id },
      data: { ...dto, companyId: undefined, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined },
    });
  }

  async deletePlan(userId: string, id: string) {
    const cur = await this.prisma.actionPlan.findUnique({ where: { id } });
    if (!cur) throw new BadRequestException('Plano não encontrado');
    await this.access.ensureCompany(userId, cur.companyId);
    await this.prisma.actionPlan.delete({ where: { id } });
    return { ok: true };
  }

  async generatePlansFromInsight(userId: string, insightId: string) {
    const insight = await this.prisma.aiInsight.findUnique({ where: { id: insightId } });
    if (!insight) throw new BadRequestException('Insight não encontrado');
    await this.access.ensureCompany(userId, insight.companyId);

    const prompt: ChatMessage[] = [
      {
        role: 'system',
        content:
          'Você é consultor de heveicultura. Gere um plano de ação prático a partir do insight. Responda em JSON: {"title":"...","description":"...","priority":"baixa|media|alta","steps":["passo 1","passo 2","..."]}. Máximo 6 passos, objetivos e mensuráveis.',
      },
      { role: 'user', content: JSON.stringify({ title: insight.title, summary: insight.summary, details: insight.details }) },
    ];
    const { content: raw } = await this.callAi(insight.companyId, prompt, { json: true });
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { /* fallback */ }
    return this.prisma.actionPlan.create({
      data: {
        companyId: insight.companyId,
        farmId: insight.farmId,
        insightId: insight.id,
        title: String(parsed.title ?? insight.title).slice(0, 200),
        description: parsed.description ?? insight.summary ?? null,
        priority: ['baixa', 'media', 'alta'].includes(parsed.priority) ? parsed.priority : 'media',
        steps: Array.isArray(parsed.steps) ? parsed.steps : undefined,
      },
    });
  }

  // ---------------- Vision ----------------
  async analyzePhoto(userId: string, photoId: string) {
    const photo = await this.prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo) throw new BadRequestException('Fotografia não encontrada');
    await this.access.ensureCompany(userId, photo.companyId);

    const cfg = await this.resolveConfig(photo.companyId);
    const res = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: cfg.model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Você é especialista em sangria de seringueiras. Analise a foto e responda em JSON: {"tags":["..."],"summary":"...","issues":["..."]}. Foco em qualidade do corte, profundidade, alinhamento, presença de doenças ou irregularidades.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Categoria: ${photo.category ?? 'campo'}. Legenda: ${photo.caption ?? '—'}` },
              { type: 'image_url', image_url: { url: photo.url } },
            ] as any,
          },
        ],
      }),
    });
    if (!res.ok) throw new BadRequestException(`IA (${cfg.provider}): ${res.status}`);
    const json: any = await res.json();
    const content = json.choices?.[0]?.message?.content ?? '{}';
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { /* ignore */ }

    return this.prisma.photo.update({
      where: { id: photoId },
      data: {
        aiTags: Array.isArray(parsed.tags) ? parsed.tags : undefined,
        aiSummary: parsed.summary ? String(parsed.summary).slice(0, 2000) : null,
        aiAnalyzedAt: new Date(),
      },
    });
  }
}
