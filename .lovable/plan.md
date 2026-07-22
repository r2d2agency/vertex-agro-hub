# Vertex Agro — Plano de Execução

Projeto grande demais para uma única entrega. Vou dividir em sprints e executar em sequência, começando pela fundação nesta rodada.

## Stack e decisões

- **Backend**: Lovable Cloud (Postgres + Auth + Storage) — vou habilitar já
- **Frontend**: TanStack Start + React + Tailwind v4 + shadcn
- **Mapas**: Mapbox GL (conector) — habilitar quando chegar em Gestão Territorial
- **Offline-first**: todos os registros operacionais terão `id (uuid)`, `company_id`, `created_at`, `updated_at`, `created_by`, `updated_by`, `version`, `sync_status`, `device_id`, `is_deleted`, `deleted_at`
- **Multiempresa**: RLS por `company_id` em todas as tabelas; papel global vê tudo via `has_role`
- **Papéis**: `admin_global`, `admin_empresa`, `gestor`, `supervisor_regional`, `monitor`, `consultor`, `consulta` — armazenados em tabela `user_roles` separada (nunca em profiles)
- **Identidade visual**: verde escuro institucional, amarelo p/ alertas, tokens semânticos em `src/styles.css`

## Sprint 1 — Fundação (ESTA ENTREGA)

1. Habilitar Lovable Cloud
2. Design system Vertex (tokens verde escuro/institucional, tipografia, sombras)
3. Schema base:
   - `companies`, `profiles`, `user_roles` (enum `app_role`), `company_members` (vínculo user↔company com papel)
   - função `has_role(_user_id, _role)` security definer
   - função `is_member_of_company(_user_id, _company_id)` security definer
   - trigger `handle_new_user` para criar profile
   - todas com colunas offline-first e RLS + GRANTs
4. Auth: `/auth` (login + signup email/senha + Google), reset password em `/reset-password`
5. Gate `_authenticated` já gerido pela integração
6. Shell administrativo:
   - Sidebar recolhível com todos os grupos do menu (rotas placeholder onde ainda não implementado)
   - Topbar com seletor de empresa, filtros regional/fazenda, notificações, perfil
   - Dashboard executivo com cards, gráficos (recharts) e placeholders de mapa
7. CRUD de **Empresas** (funcional, com validação Zod)
8. Estrutura de rotas para todos os módulos do menu (páginas "em breve" onde ainda não implementado — não superficial nas já entregues)
9. Landing pública em `/` com CTA para login
10. SEO por rota, sitemap.xml, robots.txt

## Próximas sprints (rodadas seguintes, sob confirmação)

- **Sprint 2** — Gestão Territorial: Regionais, Fazendas (com Mapbox + perímetros), Talhões, Tabelas de Sangria, Clones
- **Sprint 3** — Pessoas: Monitores, Sangradores, Consultores, Equipes, vínculos territoriais e editor de permissões
- **Sprint 4** — Operação: Agenda, Sangrias, Estimulações, Produção, Ocorrências, Fotografias (Storage), Histórico
- **Sprint 5** — Gestão: Dashboard completo com dados reais, Central de Alertas, Auditoria, Sincronização (endpoints incremental push/pull), Dispositivos, Configurações
- **Sprint 6** — Consultoria + Inteligência (estrutura visual)
- **Sprint 7** — Endpoints REST de sincronização + seeds demonstrativos

## Detalhes técnicos

- Server functions autenticadas com `requireSupabaseAuth` para escritas
- Endpoints públicos de sync futuramente em `/api/public/sync/*` com verificação de device token
- Storage bucket `photos` (privado) para fotografias com metadados de geolocalização
- Auditoria via tabela `audit_log` + triggers nas tabelas principais
- Todos os selects respeitam `is_deleted = false` por padrão

## Confirmação

Após esta rodada você terá: login funcional, cadastro de empresas real, shell admin completo com todas as rotas navegáveis, dashboard com dados demonstrativos, e todo o alicerce (schema + RLS + offline fields) para as próximas sprints plugarem sem retrabalho.

Aprova? Ao aprovar, executo Sprint 1 imediatamente.