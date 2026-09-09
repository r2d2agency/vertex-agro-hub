/**
 * Fila de sincronização offline.
 *
 * Uso:
 *   await enqueueMutation({ path: "/occurrences", method: "POST", body: {...} });
 *   await flushOutbox();  // dispara envio manual (ou automático quando volta online)
 *
 * A fila persiste em IndexedDB e é reprocessada quando o navegador
 * volta a ficar online. Cada item recebe um UUID de idempotência
 * enviado no header `x-idempotency-key` para o backend deduplicar.
 */

import { apiRequest } from "@/lib/api";
import { idbCount, idbDelete, idbGetAll, idbPut } from "./idb";

export type OutboxItem = {
  id?: number;
  key: string; // UUID de idempotência
  path: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  body?: any;
  createdAt: number;
  attempts: number;
  lastError?: string;
  // true quando o item não deve mais ser reenviado automaticamente (erro de
  // validação/permissão/rota inexistente, ou excedeu o limite de tentativas)
  // — precisa de ação manual (descartar) em vez de ficar tentando para sempre.
  permanentlyFailed?: boolean;
  label?: string; // rótulo humano (ex: "Ocorrência: Vazamento")
};

type Listener = (state: { pending: number; running: boolean; failedCount: number }) => void;
const listeners = new Set<Listener>();
let running = false;

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function notify() {
  const all = await idbGetAll<OutboxItem>("outbox");
  const failedCount = all.filter((it) => it.permanentlyFailed).length;
  listeners.forEach((l) => l({ pending: all.length, running, failedCount }));
}

export function subscribeOutbox(l: Listener) {
  listeners.add(l);
  notify();
  return () => listeners.delete(l);
}

export async function outboxCount() {
  return idbCount("outbox");
}

export async function listOutbox(): Promise<OutboxItem[]> {
  return (await idbGetAll<OutboxItem>("outbox")).sort((a, b) => a.createdAt - b.createdAt);
}

export async function enqueueMutation(input: {
  path: string;
  method: OutboxItem["method"];
  body?: any;
  label?: string;
}) {
  const item: OutboxItem = {
    key: uuid(),
    path: input.path,
    method: input.method,
    body: input.body,
    createdAt: Date.now(),
    attempts: 0,
    label: input.label,
  };
  await idbPut("outbox", item);
  notify();
  return item.key;
}

export async function flushOutbox(): Promise<{ sent: number; failed: number }> {
  if (running) return { sent: 0, failed: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) return { sent: 0, failed: 0 };
  running = true;
  await notify();
  let sent = 0;
  let failed = 0;
  try {
    const items = await listOutbox();
    for (const it of items) {
      // Itens já marcados como falha permanente não são reenviados sozinhos —
      // dependem de ação manual (ver clearOutboxItem) para não tentar para
      // sempre contra uma rota que nunca vai funcionar.
      if (it.permanentlyFailed) continue;
      try {
        await apiRequest(it.path, {
          method: it.method,
          headers: { "x-idempotency-key": it.key },
          body: it.body != null ? JSON.stringify(it.body) : undefined,
        });
        await idbDelete("outbox", it.id!);
        sent++;
      } catch (e: any) {
        it.attempts = (it.attempts ?? 0) + 1;
        it.lastError = String(e?.message ?? e).slice(0, 300);

        // 400/401/403/404: erro de validação, permissão ou rota inexistente —
        // nunca vai se resolver sozinho reenviando. Acima de 5 tentativas,
        // desiste também mesmo que o erro pareça transitório.
        const isClientError = /\b(400|401|403|404)\b/.test(it.lastError ?? "");

        if (it.attempts >= 5 || isClientError) {
          it.permanentlyFailed = true;
          it.lastError = `[FALHA] ${it.lastError}`;
        }
        await idbPut("outbox", it);
        failed++;
      }
      await notify();
    }
  } finally {
    running = false;
    await notify();
  }
  return { sent, failed };
}

export async function clearOutboxItem(id: number) {
  await idbDelete("outbox", id);
  notify();
}
