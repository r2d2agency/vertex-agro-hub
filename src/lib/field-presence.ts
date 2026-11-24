import { apiRequest } from "@/lib/api";
import { getFieldMe } from "@/lib/field.functions";

const DEVICE_ID_KEY = "vertex-field-device-id.v1";
const PRESENCE_INTERVAL_MS = 60_000;

function deviceId() {
  if (typeof localStorage === "undefined") return null;
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/** Renova a presença do aparelho no backend. Silencioso quando offline. */
async function ping(companyId: string) {
  const id = deviceId();
  if (!id || typeof navigator !== "undefined" && !navigator.onLine) return;
  try {
    await apiRequest("/field/presence", {
      method: "POST",
      body: JSON.stringify({ companyId, deviceId: id }),
    });
  } catch {
    // Presença é best-effort: indisponibilidade não pode atrapalhar o app.
  }
}

let started = false;

/** Chama uma vez ao entrar no app e a cada minuto enquanto estiver aberto. */
export function installFieldPresence() {
  if (started || typeof window === "undefined") return;
  started = true;

  async function send() {
    try {
      const me = await getFieldMe();
      const companyIds = me.companies?.map((c) => c.id) ?? [];
      await Promise.all(companyIds.map((companyId) => ping(companyId)));
    } catch {
      // Sem sessão ou sem rede: nada a informar.
    }
  }

  void send();
  setInterval(() => { void send(); }, PRESENCE_INTERVAL_MS);
  window.addEventListener("online", send);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void send();
  });
}
