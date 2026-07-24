# Sprint 7 — Frota, Combustível, Estoques e Manutenção

Adiciona ao Vertex Agro toda a camada operacional de **máquinas, implementos, operadores, operações, abastecimento, estoque de diesel, produtos/insumos e manutenção**, integrada à arquitetura multiempresa, RLS por fazenda, auditoria, sync offline e permissões já existentes. Nenhum app novo — o App do Monitor (futuro) consumirá os mesmos endpoints.

Dada a extensão do escopo (27 seções do briefing), a entrega será feita em **5 sub-sprints sequenciais**, cada uma compilável e navegável no EasyPanel ao final. Só sigo para a próxima após validação sua.

---

## Sub-sprint 7.1 — Cadastros base (esta entrega)

Escopo mínimo para destravar o restante:

### Backend (NestJS + Prisma)
- Migration `20260806090000_fleet_core`:
  - `machine` (categoria, marca, modelo, ano, série, placa, tanque, combustível, horímetro, status, operador padrão, monitor responsável, fazenda, fotos, aquisição, fornecedor).
  - `implement` (implementos sem motor: categoria, série, máquina vinculada, responsável, status).
  - `operator` (pessoa vinculada à fazenda; CPF, habilitação, validade, máquinas/categorias autorizadas, monitor responsável, status).
  - `operation_type` (operações pré-cadastradas: código, categoria, flags exige horímetro/operador/foto/GPS/combustível, máquinas e implementos permitidos, unidade).
  - `machine_photo`, `machine_document`, `machine_status_log` (histórico de status/horímetro).
  - Tabelas de junção `machine_authorized_operator`, `monitor_machine_access`, `monitor_temp_farm_access` (autorização temporária com validade e motivo).
  - Campos padrão de sync: `id UUID`, `version`, `syncStatus`, `deviceId`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `deletedAt`.
- Novo módulo `FleetModule` (`machines`, `implements`, `operators`, `operation-types`) com CRUDs, filtros por empresa/fazenda/status e enforcement de acesso via `CompanyAccess`.
- Seed de operações iniciais (transporte de produção, roçada, manutenção de estrada, etc.) e categorias, executado on-demand como já feito em `catalog.service`.
- Seed demo opcional (Trator 01/02, Caminhão 01, Gerador 01, Carreta 01/02, Roçadeira 01, operadores Carlos/Marcos/Pedro) somente quando a empresa não tiver nenhuma máquina.

### Frontend (TanStack Start)
- Novo grupo no sidebar **"Máquinas e Equipamentos"** com: Visão Geral, Máquinas, Implementos, Operadores, Operações.
- Rotas em `src/routes/_authenticated/`:
  - `frota.tsx` (dashboard placeholder com contagem por status — evolui em 7.5).
  - `maquinas.tsx` (lista + filtros + botão Nova).
  - `maquinas.$id.tsx` (detalhe com abas Resumo/Fotos/Documentos/Histórico — abas Abastecimentos/Operações/Manutenções ficam vazias até 7.2–7.4).
  - `implementos.tsx`, `operadores.tsx`, `operacoes.tsx` (CRUDs completos).
- Libs cliente: `src/lib/frota.functions.ts` (machines, implements, operators, operationTypes).
- Componentes reaproveitando `PageHeader`, `CompanyPicker`, `FileDropzone`, `FarmPicker`, padrão visual verde Vertex.

### Fora desta sub-sprint (vem depois)
- 7.2: Abastecimento + Estoque de Diesel + tanques + entradas + inventário + alertas.
- 7.3: Produtos/Insumos + depósitos + entradas/saídas + transferências + lotes/validade.
- 7.4: Manutenção (corretiva/preventiva) + peças + planos preventivos + custos.
- 7.5: Dashboards consolidados de máquinas e estoques, relatórios (PDF/Excel/CSV), auditoria específica, endpoints e regras de conflito para o App do Monitor.

---

## Detalhes técnicos

- **Multiempresa/RLS**: toda tabela nova carrega `companyId` + `farmId` (quando aplicável) e passa por `CompanyAccess.assertMember`. Monitor só enxerga fazendas autorizadas (`monitor_machine_access` + `monitor_temp_farm_access` com validade).
- **Sync offline**: colunas `version` / `syncStatus` / `deviceId` já no schema para 7.5 plugar no `SyncService` existente sem migration adicional.
- **Auditoria**: mutations críticas (mudança de status, horímetro, autorização) escrevem em `audit_log` via `AuditService` já disponível.
- **Sem exclusão física**: máquinas/implementos/operadores usam `status='inativa'` e `deletedAt`; operações usam flag `status`.
- **Horímetro**: coluna `hourmeter` decimal + `hourmeterUnit` (`h`/`km`), com histórico em `machine_status_log` para auditoria de ajustes.
- **Fotos e documentos**: reusa `UploadsModule` e `FileDropzone` já implementados na Sprint 3.
- **Categorias/status**: enums Postgres (`machine_category`, `machine_status`, `implement_category`, `operation_category`) para consistência.
- **Compatibilidade**: nada em `pessoas` é alterado — `operator` é entidade separada por ora, e vinculação futura ao `Person` fica prevista via `personId?` nullable.

---

## Deploy

1. Aplicar migration `20260806090000_fleet_core` no EasyPanel.
2. Rebuild backend + frontend.
3. Seed automático popula operações e (se vazio) demo de máquinas na primeira listagem.

Confirma que sigo com a sub-sprint 7.1 nesses termos?
