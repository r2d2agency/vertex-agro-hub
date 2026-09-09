import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, Trash2, Wifi, WifiOff } from "lucide-react";
import { clearOutboxItem, flushOutbox, listOutbox, subscribeOutbox, type OutboxItem } from "@/lib/offline/queue";
import { FieldCard } from "@/components/vertex/field/step-header";

export const Route = createFileRoute("/campo/sincronizacao")({ component: SyncPage });

function SyncPage() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [lastSync, setLastSync] = useState<string>("—");

  const refresh = async () => setItems(await listOutbox());

  useEffect(() => {
    if (typeof navigator !== "undefined") setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const un = subscribeOutbox((s) => {
      setPending(s.pending); setRunning(s.running); setFailedCount(s.failedCount);
      if (!s.running) { refresh(); if (s.pending === 0) setLastSync(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })); }
    });
    refresh();
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); un(); };
  }, []);

  const pendingItems = items.filter((it) => !it.permanentlyFailed);
  const failedItems = items.filter((it) => it.permanentlyFailed);

  return (
    <div className="space-y-4">
      <h1 className="text-center text-base font-semibold">Sincronização</h1>

      <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4">
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Estado</div>
          <div className={`text-2xl font-bold ${online ? "text-primary" : "text-warning"}`}>{online ? "Atualizado" : "Offline"}</div>
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-full ${online ? "bg-primary/15 text-primary" : "bg-warning/15 text-warning"}`}>
          {online ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
        </div>
      </div>

      <FieldCard className="space-y-3">
        <Row label="Última sincronização" value={`Hoje, ${lastSync}`} />
        <Row label="Registros pendentes" value={String(pending - failedCount)} />
        {failedCount > 0 && <Row label="Com falha (precisam de ação)" value={String(failedCount)} danger />}
      </FieldCard>

      <button
        disabled={!online || running}
        onClick={() => flushOutbox()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-base font-semibold text-primary-foreground disabled:opacity-60"
      >
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Sincronizar agora
      </button>

      {failedItems.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" /> Itens com falha
          </h2>
          <ul className="space-y-2">
            {failedItems.map((it) => (
              <li key={it.id} className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-destructive/15 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{it.label ?? it.path}</div>
                  <div className="truncate text-[11px] text-destructive">{it.lastError ?? "Falha ao enviar"}</div>
                  <div className="text-[10px] text-muted-foreground">Este registro não será reenviado automaticamente.</div>
                </div>
                <button
                  onClick={() => clearOutboxItem(it.id!)}
                  className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Descartar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">Itens pendentes</h2>
        {pendingItems.length === 0 ? (
          <p className="rounded-2xl border border-border/60 bg-card p-4 text-center text-sm text-muted-foreground">Fila vazia.</p>
        ) : (
          <ul className="space-y-2">
            {pendingItems.map((it) => (
              <li key={it.id} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{it.label ?? it.path}</div>
                  <div className="text-[11px] text-muted-foreground">Aguardando envio</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Row({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${danger ? "text-destructive" : ""}`}>{value}</span>
    </div>
  );
}
