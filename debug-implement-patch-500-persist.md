# Debug Session: implement-patch-500-persist [OPEN]

- Session ID: `implement-patch-500-persist`
- Start date: 2026-08-28
- Symptom: PATCH `/api/implements/:id` (editar implemento) sempre retorna HTTP 500. Ocorre mesmo após 3 commits de correções. O usuário cadastra implemento OK, mas ao editar (qualquer mudança de status ou não) dá erro 500 no clique de salvar.
- Environment: Produção EasyPanel, TanStack Start (frontend) + NestJS + Prisma + Postgres.
- Affected: `FleetService.updateImplement` → `PATCH /fleet/implements/:id` (rota prefixada) via `FleetController.updateImpl`.
- Related commits: 78c49ee → 8e39765 → 920ef83.

## Evidências coletadas

Até o momento:
- Erro reproduzido várias vezes pelo usuário (3+ tentativas de salvar em sequência).
- Frontend stack do console: `PATCH implements/:id 500 Internal server error`; 401 em auth/me subsequente é cascata provavelmente pós-erro.
- Nenhum log de `system_log` ainda foi fornecido pelo usuário.

## Hipóteses

| # | Hipótese | Status | Prova esperada |
|---|---|---|---|
| H1 | Deploy não atualizado — EasyPanel ainda roda pré-78c49ee. | Não confirmada | Log "DBG implement-patch-500-persist" não existe no system_log. |
| H2 | Valor de `status`/`category` é enum inválido no Postgres. | Rejeitada (análise estática) | Prisma schema não define enum ImplementStatus; é só `String`. |
| H3 | `updatedById: userId` é null/UUID inválido → FK falha. | Aberta | Log error `fieldNames: [updated_by_id]` em meta; erro P2003. |
| H4 | `companyId` enviado no patch (ordem errada delete/normaliza). | Aberta | `normalizedKeys` contém `companyId`. |
| H5 | Campo string longo excede tamanho (name 200 chars etc.). | Aberta | Prisma `P2000` "Value for column X is too long". |
| H6 | Erro fora do try (H7): em `findUnique` ou `ensureCompany`. | Aberta | Nenhum log aparece de debug ou error; só capturável com try-catch global. |
| H7 | Validation Pipe do Nest rejeita `null` em `@IsUUID() `farmId` etc. | Aberta | Controller não chama o service; log de entrada do controller grava mas service não. |
| H8 | `isAdminGlobal`/userCompany throws (H7) Forbidden vira 500 por filter. | Aberta | Error.meta `ForbiddenException`. |
| H9 | `name`, `category` ou `status` chegando como null no patch (required not null). | Aberta | Patch contem name:null/category:null/status:null + Prisma error null constraint. |
| H10 | Array `photoUrls` contendo valor null/undefined dentro. | Aberta | Prisma error array null item ou campo photo_url. |

## Instrumentação aplicada

- 8e39765: Logs level=debug antes do update e level=error no catch do `prisma.implement.update`.
- Ponto cego: não cobre `findUnique`, `ensureCompany`, `normalizeImplementPayload`.
- Próximo passo (a fazer): try-catch GLOBAL na função inteira + logs de entrada no controller para interceptar qualquer exceção.

## Próximos passos

1. Ampliar instrumentação updateImplement (try-catch total) + controller logs (feito).
2. Commit & push (feito).
3. Reproduzir erro no ambiente deployado.
4. Extrair `SELECT id, level, source, message, meta FROM system_log WHERE source IN ('fleet.service.updateImplement','fleet.controller.updateImpl') ORDER BY created_at DESC LIMIT 10;`
5. Identificar a hipótese confirmada → aplicar fix mínimo.
