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
  label?: string; // rótulo humano (ex: "Ocorrência: Vazamento")
};

type Listener = (state: { pending: number; running: boolean }) => void;
const listeners = new Set<Listener>();
let running = false;

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function notify() {
  const pending = await idbCount("outbox");
  listeners.forEach((l) => l({ pending, running }));
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
        
        // Se erro for de validação (400) ou permissão (403), ou se exceder tentativas,
        // manter na fila mas marcar como falha para não descartar silenciosamente.
        const isClientError = e?.message?.includes('400') || e?.message?.includes('403') || e?.message?.includes('401');
        
        if (it.attempts >= 5 || isClientError) {
          // Mantém na fila mas não tenta mais automaticamente neste ciclo
          it.lastError = `[FALHA] ${it.lastError}`;
          await idbPut("outbox", it);
        } else {
          await idbPut("outbox", it);
        }
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
