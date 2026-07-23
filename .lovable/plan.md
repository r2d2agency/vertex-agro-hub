# Plano — Melhorias de Operação Vertex Agro

## 1. Endereços mais fáceis (CEP → auto-preenche)

- Novo componente `CepInput`: ao digitar 8 dígitos, consulta **ViaCEP** (`https://viacep.com.br/ws/{cep}/json/`) e preenche automaticamente endereço, cidade e UF.
- Aplicar em: cadastro de **Empresa**, **Fazenda** e (futuro) Pessoas.
- Novo componente `UfSelect` com **todos os 27 UFs pré-cadastrados** (dropdown), substituindo o input de texto atual.
- Botão "Usar minha localização" (geolocation API do browser) para preencher lat/lng em Fazendas.
- Botão "Buscar no mapa pelo endereço" (geocoding via Nominatim/OSM — sem chave) que centraliza o mapa nas coordenadas do endereço digitado.

## 2. Multi-polígonos no editor de mapa

Atualização de `MapEditor` com dois modos (toggle):
- **Multi-polígono livre**: usuário desenha vários polígonos, cada um é adicionado à lista. Botão "Concluir" finaliza. Área total = soma.
- **Principal + exclusões**: 1 polígono verde (contorno) + N polígonos vermelhos (reservas/estradas). Área = principal - exclusões.

Alterações:
- `GeoPolygon` vira `GeoBoundary` (union): `{ mode: "multi", polygons: GeoPolygon[] }` ou `{ mode: "with-exclusions", main: GeoPolygon, exclusions: GeoPolygon[] }`.
- Backend continua salvando em `boundary JSONB` (schema já suporta).
- Camada de compatibilidade: se `boundary` vier no formato antigo (`{type:"Polygon"...}`), converter para `{mode:"multi", polygons:[...]}` no load.

## 3. Responsável da Regional vinculado

- Campo `manager` (texto livre) vira **dois campos opcionais**:
  - `managerUserId` → FK para `User` (qualquer usuário do sistema)
  - `managerPersonId` → FK para `Person` (consultor/técnico pré-cadastrado)
- Migration adiciona colunas + FKs `ON DELETE SET NULL`.
- Form: dois seletores (Autocomplete) — "Usuário do sistema" e "Consultor/Técnico". Pelo menos um deve estar preenchido.
- Backend valida existência e retorna dados populados via `include`.

## 4. Menu de Apps

Nova rota `/apps` (já existe placeholder em `dispositivos.tsx` mas vamos criar dedicada):
- Card "Painel Web" com URL atual + botão "Copiar link" + QR code (biblioteca `qrcode` — gera SVG inline sem dependência de servidor).
- Cards "App Monitor" e "App Consultor" com badge **Em breve**, descrição do que farão e ícone de download desabilitado.
- Item novo na sidebar: **Apps** (ícone `Smartphone`).

## 5. Área de Documentação

Nova rota `/documentacao` (layout com sidebar interna):
- Índice de artigos em Markdown estático (pasta `src/docs/*.md` importada via Vite `?raw`).
- Renderização com `react-markdown` + `remark-gfm`.
- Artigos iniciais:
  1. Primeiros passos (login, superadmin)
  2. Cadastro de Empresas (com CEP)
  3. Estrutura Territorial (Regional → Fazenda → Talhão)
  4. Desenhando áreas no mapa (multi-polígono e exclusões)
  5. Pessoas e Equipes
  6. Sangrias, Produção e Ocorrências
  7. Importação via CSV
  8. Sincronização e apps de campo (visão geral)
- Item novo na sidebar: **Documentação** (ícone `BookOpen`).

## Detalhes técnicos

**Novos pacotes**
- Frontend: `qrcode` (QR SVG), `react-markdown` + `remark-gfm` (docs). Nominatim e ViaCEP são fetch direto, sem SDK.

**Backend**
- Migration `20260729090000_regional_managers`: colunas `manager_user_id`, `manager_person_id` em `regionals` (mantém `manager` como legado para não quebrar dados).
- DTOs atualizados; service retorna `include: { managerUser, managerPerson }`.

**Frontend — arquivos novos**
- `src/components/vertex/cep-input.tsx`
- `src/components/vertex/uf-select.tsx` (lista dos 27 UFs)
- `src/components/vertex/qr-card.tsx`
- `src/lib/via-cep.ts`, `src/lib/geocode.ts`
- `src/lib/geo.ts` — estender tipos (`GeoBoundary`, adaptadores legacy)
- `src/routes/_authenticated/apps.tsx`
- `src/routes/_authenticated/documentacao.tsx` + `src/routes/_authenticated/documentacao.$slug.tsx`
- `src/docs/*.md` (8 artigos)

**Frontend — arquivos alterados**
- `MapEditor` + `MapEditorClient` (modos multi/exclusions, botão Concluir, painel de polígonos)
- `CompanyForm`, `FarmForm`, `RegionalForm` (CEP, UF select, geolocation, seletores de responsável)
- `AppSidebar` (novos itens Apps e Documentação)

## Escopo fora deste plano
- Cadastro de "Pessoas / Consultores" ainda usa tela existente; se não houver consultores cadastrados, apenas o campo "Usuário" fica funcional (o de Consultor fica desabilitado com dica "Cadastre em Consultores").
- App mobile (Monitor/Consultor) permanece como placeholder.

Ao aprovar, implemento em sequência: (1) backend + tipos, (2) componentes utilitários (CEP/UF/QR/geocode), (3) MapEditor multi-polígono, (4) forms, (5) Apps, (6) Documentação.
