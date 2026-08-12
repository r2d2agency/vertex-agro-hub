import { useEffect, useState } from "react";
import { flushOutbox, subscribeOutbox } from "./queue";

let installed = false;

/** Instala listeners globais: quando volta online, tenta esvaziar a fila. */
export function installOfflineAutoFlush() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const onOnline = () => { flushOutbox().catch(() => {}); };
  window.addEventListener("online", onOnline);
  // Tentativa inicial após 2s
  setTimeout(() => { if (navigator.onLine) flushOutbox().catch(() => {}); }, 2000);
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setOnline(navigator.onLine);
    }
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function useOutboxState() {
  const [state, setState] = useState<{ pending: number; running: boolean }>({ pending: 0, running: false });
  useEffect(() => { const un = subscribeOutbox(setState); return () => { un; }; }, []);
  return state;
}
