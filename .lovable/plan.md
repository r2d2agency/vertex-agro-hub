# Sprint 8 — Apps de Campo (Monitor e Consultor)

Como o stack é web (TanStack Start + Nest), os apps de campo serão entregues como **PWAs mobile-first instaláveis** no mesmo domínio, com layout dedicado, autenticação por papel e reaproveitando a fila offline (`src/lib/offline/*`) e o Service Worker já criados.

## Escopo

### 1. Shell mobile dedicado
- Novo layout `src/routes/_field/route.tsx` (pathless, `ssr:false`, gate por papel `monitor` / `consultor`).
- Bottom navigation, header compacto, tema verde Vertex, otimizado para 1 mão.
- Indicador de status online/offline + fila pendente (badge no header).
- Botão "Instalar app" via `beforeinstallprompt` (manifesto já existe).

### 2. App Monitor (`/campo/monitor/*`)
Foco em execução diária no seringal:
- **Hoje**: fazendas/talhões atribuídos ao usuário logado (via `farm_assignments`), com check-in GPS.
- **Sangria**: formulário rápido (litros, DRC, aderência, sangrador) com auto-save offline.
- **Produção**: registrar entrega (peso bruto, tara, DRC) com cálculo automático de kg secos.
- **Ocorrências**: registro com foto + GPS, categorias pré-definidas.
- **Fotografias**: captura direta pela câmera, upload em fila.

### 3. App Consultor (`/campo/consultor/*`)
Foco em supervisão e avaliação:
- **Agenda**: visitas e inspeções do dia (reaproveita `ScheduledTask`).
- **Avaliação**: formulário de avaliação por sangrador/monitor (nota + observações + fotos).
- **Inspeção de talhão**: checklist rápido + fotos + parecer.
- **Histórico**: últimas visitas com filtro por fazenda.

### 4. Integração offline real
- Todos os POSTs do app de campo passam por `enqueueMutation()` (fila IndexedDB).
- Cache-first para dados de referência (fazendas atribuídas, clones, tabelas) via IndexedDB `cache` store.
- Auto-flush ao reconectar (já implementado).
- Middleware backend de idempotência via `x-idempotency-key` (evita duplicação em reenvios).

### 5. Backend — ajustes mínimos
- `POST /field/checkin` — endpoint dedicado que grava `Occurrence` de check-in.
- Middleware de idempotência no `main.ts` (Map em memória + índice único opcional).
- Endpoint `GET /field/me/assignments` — devolve fazendas/talhões do usuário para o "Hoje".

### 6. Roteamento por papel após login
- Ao logar, se o único papel do usuário é `monitor` ou `consultor` → redireciona para `/campo/...`.
- Admins continuam no painel web; ganham link "Abrir app de campo" no topbar.

## Fora de escopo (para depois)
- App Capacitor/native (fica como fase futura se quiser publicar em stores).
- Sincronização bidirecional de conflitos complexos (mantemos last-write-wins com `version`).
- Notificações push (requer FCM/OneSignal — sprint separada).

## Detalhes técnicos
- Rotas: `src/routes/_field/route.tsx` + `_field/monitor.*.tsx` + `_field/consultor.*.tsx`.
- Componentes: `src/components/vertex/field/` (bottom-nav, gps-checkin-button, camera-capture, offline-badge).
- Câmera: `<input type="file" accept="image/*" capture="environment">` + upload via fila.
- GPS: `navigator.geolocation.getCurrentPosition` com timeout + fallback manual.
- Backend: novo `FieldModule` (Nest) reutilizando serviços existentes.

## Entrega
Ao final: um monitor ou consultor abre `vertex.seu-dominio.com` no celular, faz login, é levado direto ao app de campo, instala como PWA, e consegue trabalhar o dia inteiro sem rede — sincroniza quando voltar ao sinal.

Confirmo e implemento?
