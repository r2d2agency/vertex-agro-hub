# Sprint 6 — Inteligência Artificial, Assistente e Previsões

Coloca a camada de IA sobre a base operacional que já existe (produção, ocorrências, sangrias, fotos, histórico). Usa o Lovable AI Gateway (`LOVABLE_API_KEY` já cadastrado) — sem depender de chave do usuário.

## Objetivos

1. **Alertas Inteligentes (`/alertas-ia`)** — detecção de anomalias com IA (queda de produção, DRC fora do padrão, ocorrências recorrentes).
2. **Assistente Vertex (`/assistente`)** — chat contextual que responde sobre dados da empresa (KPIs, fazendas, produção, colaboradores) via function-calling.
3. **Previsões (`/previsoes`)** — projeção de produção por fazenda/talhão (próximos 30/60/90 dias) baseada em histórico.
4. **Planos de Ação (`/planos-acao`)** — sugestões automáticas a partir das anomalias detectadas (o que fazer, quem, prazo).
5. **Painel IA (`/ia`)** — visão consolidada: uso, custo estimado, últimos insights.
6. **Análise de fotos** — endpoint que roda visão computacional em fotos de campo (Sprint 4) e extrai observações (sangria irregular, painel danificado).

## Entregas por módulo

### 1. Backend — módulo `ai/`
- `AiService` centraliza chamadas ao Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`), header `Authorization: Bearer ${LOVABLE_API_KEY}`.
- Modelos default: `google/gemini-2.5-flash` para chat/insights (grátis até 06/out/2025), `google/gemini-2.5-flash-image-preview` para visão.
- Rate limiting: trata 429/402 e devolve erro amigável.
- Endpoints:
  - `POST /ai/insights` — recebe `{ companyId, scope }`, monta contexto (KPIs, últimas ocorrências, produção 30d) e devolve JSON `{ anomalies[], suggestions[] }`.
  - `POST /ai/chat` — `{ companyId, messages[] }` com function-calling (`get_kpis`, `list_farms`, `list_occurrences`, `production_by_farm`).
  - `POST /ai/forecast` — `{ companyId, farmId?, horizonDays }` → projeção diária (média móvel + tendência + prompt de ajuste sazonal via IA).
  - `POST /ai/vision/photo/:photoId` — roda o modelo de visão sobre a foto e persiste `photo.aiTags` + `photo.aiSummary`.
  - `POST /ai/action-plans/generate` — cria `ActionPlan` a partir de `AlertEvent` selecionado.

### 2. Backend — persistência
- Migration `20260805090000_ai`:
  - `ai_insight` (companyId, scope, kind, severity, title, summary, data JSON, createdAt).
  - `ai_conversation` + `ai_message` (companyId, userId, role, content, toolCalls).
  - `ai_forecast` (companyId, farmId?, horizonDays, series JSON, generatedAt).
  - `action_plan` (companyId, title, description, priority, dueDate, assigneeUserId?, status, sourceAlertId?, createdBy).
  - Colunas em `photo`: `aiTags` (string[]), `aiSummary` (text), `aiAnalyzedAt`.

### 3. Frontend — telas novas/atualizadas
- `/alertas-ia` — lista de `ai_insight` + botão "Gerar novos insights" (chama `/ai/insights`), cards com severidade e drilldown.
- `/assistente` — chat com histórico persistido, sugestões rápidas ("Qual fazenda produziu menos essa semana?"), streaming SSE.
- `/previsoes` — seleciona fazenda + horizonte, gráfico linha (real vs previsto) usando Recharts (já instalado).
- `/planos-acao` — kanban (Aberto / Em andamento / Concluído), criação manual ou "gerar a partir do alerta".
- `/ia` — painel: total de insights, tokens/custos (estimativa), últimos 5 diálogos, atalhos.
- `/fotografias` — adiciona botão "Analisar com IA" por foto; badges com tags detectadas.

### 4. Integração com Sprint 5
- Alertas do motor de regras (`AlertEvent`) alimentam `/ai/action-plans/generate`.
- Insights gerados pela IA também escrevem em `AlertEvent` (level=`info|warning|critical`) para aparecer no sino do topbar.

## Detalhes técnicos

- **Sem novas chaves**: usa o secret `LOVABLE_API_KEY` já configurado.
- **Contexto do prompt**: `AiContextBuilder` agrega KPIs/últimos 30 dias com queries agregadas já disponíveis em `KpisService` — evita reprocessar.
- **Function-calling**: schema OpenAI-compat, cada tool mapeia para um método existente no backend (reuso puro).
- **Streaming**: `/ai/chat` devolve `text/event-stream` para o assistente; endpoints de insight/forecast retornam JSON síncrono.
- **Sidebar**: os itens `/alertas-ia`, `/assistente`, `/previsoes`, `/planos-acao`, `/ia` já existem como ComingSoon — trocam pelas telas reais.

```text
[Ocorrências] ─┐
[Produção]    ─┼─► AiContextBuilder ─► LovableGateway ─► Insights ─► AlertEvent + ActionPlan
[Sangrias]    ─┘                                     └► Chat (SSE) ─► UI
[Fotos]       ────────────────► Vision ─► photo.aiTags/aiSummary
```

## Fora do escopo (Sprint 7)
- Treino de modelo próprio / fine-tuning.
- Push notifications dos alertas IA.
- Consumo de IA nos apps mobile (backend fica pronto).

## Deploy
1. Aplicar migration `20260805090000_ai`.
2. Rebuild backend e frontend no EasyPanel.
3. `LOVABLE_API_KEY` já está no ambiente — nenhum passo extra.

Confirma que sigo com essa entrega?
