import { WifiOff } from "lucide-react";
import { useOnlineStatus, useOutboxState } from "@/lib/offline/network";

export function OfflineIndicator() {
  const online = useOnlineStatus();
  const outbox = useOutboxState();
  if (online && outbox.pending === 0) return null;
  return (
    <div className="fixed bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-card/95 px-4 py-2 text-xs font-medium shadow-lg backdrop-blur">
      {!online ? (
        <span className="flex items-center gap-2 text-amber-600">
          <WifiOff className="h-3.5 w-3.5" /> Versão offline
        </span>
      ) : outbox.pending > 0 ? (
        <span className="text-muted-foreground">{outbox.pending} pendente(s) de sincronização</span>
      ) : null}
    </div>
  );
}