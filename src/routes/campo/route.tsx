import { createFileRoute, Outlet, useNavigate, redirect, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LogOut, LayoutDashboard, WifiOff, Wifi, Download, Loader2, Bell,
  MapPin, MapPinOff, ShieldCheck, Crosshair,
} from "lucide-react";
import { hasAuthTokens, logout } from "@/lib/api";
import { getFieldMe, type FieldMe, captureLocation, submitCheckin, type Coords } from "@/lib/field.functions";
import { subscribeOutbox, flushOutbox } from "@/lib/offline/queue";
import { FieldBottomNav } from "@/components/vertex/field/bottom-nav";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import vertexLogo from "@/assets/vertex-logo.png";

export const Route = createFileRoute("/campo")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window !== "undefined" && !hasAuthTokens()) {
      throw redirect({ to: "/auth" });
    }
  },
  component: FieldShell,
});

function useInstallPrompt() {
  const [prompt, setPrompt] = useState<any>(null);
  useEffect(() => {
    const h = (e: any) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  return prompt ? { show: async () => { await prompt.prompt(); setPrompt(null); } } : null;
}

type GpsState =
  | { status: "unknown" }
  | { status: "denied" }
  | { status: "unsupported" }
  | { status: "locating" }
  | { status: "active"; coords: Coords; at: number };

function useGps() {
  const [state, setState] = useState<GpsState>({ status: "unknown" });

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "unsupported" });
      return;
    }
    let watchId: number | null = null;
    let cancelled = false;
    setState({ status: "locating" });
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (cancelled) return;
        setState({
          status: "active",
          at: Date.now(),
          coords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracyM: pos.coords.accuracy,
          },
        });
      },
      (err) => {
        if (cancelled) return;
        if (err.code === err.PERMISSION_DENIED) setState({ status: "denied" });
        else setState((s) => (s.status === "active" ? s : { status: "locating" }));
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
    );
    return () => {
      cancelled = true;
      if (watchId != null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return state;
}

const CHECKIN_KEY = "vertex.field.checkin.v1";

function readCheckin(): { farmId?: string; at: number } | null {
  try {
    const raw = sessionStorage.getItem(CHECKIN_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (typeof v?.at !== "number") return null;
    // Expira em 12h
    if (Date.now() - v.at > 12 * 3600 * 1000) return null;
    return v;
  } catch { return null; }
}

function FieldShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [flushing, setFlushing] = useState(false);
  const install = useInstallPrompt();
  const gps = useGps();
  const [checkin, setCheckin] = useState<{ farmId?: string; at: number } | null>(null);

  // Aplica tema dark no <html> para que portais (Sheet, Dialog, Toast) herdem os tokens.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const hadHtml = html.classList.contains("dark");
    const hadBody = body.classList.contains("dark");
    html.classList.add("dark");
    body.classList.add("dark");
    return () => {
      if (!hadHtml) html.classList.remove("dark");
      if (!hadBody) body.classList.remove("dark");
    };
  }, []);

  useEffect(() => { setCheckin(readCheckin()); }, []);
  useEffect(() => { getFieldMe().then(setMe).catch((e) => setError(e?.message ?? "Falha ao carregar")); }, []);

  useEffect(() => {
    if (typeof navigator !== "undefined") setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    const un = subscribeOutbox((s) => { setPending(s.pending); setFlushing(s.running); });
    return () => { un(); };
  }, []);

  async function signOut() { await logout(); navigate({ to: "/auth", replace: true }); }

  const gpsBadge = useMemo(() => {
    switch (gps.status) {
      case "active": {
        const acc = gps.coords.accuracyM ?? 0;
        const good = acc && acc <= 30;
        return {
          icon: MapPin,
          label: `GPS ${acc ? `${Math.round(acc)}m` : "ok"}`,
          className: good
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-warning/40 bg-warning/10 text-warning",
          title: `Localização ativa · precisão ${acc ? Math.round(acc) + " m" : "—"}`,
        };
      }
      case "locating":
        return { icon: Crosshair, label: "GPS…", className: "border-muted-foreground/30 bg-muted text-muted-foreground animate-pulse", title: "Obtendo localização" };
      case "denied":
        return { icon: MapPinOff, label: "GPS off", className: "border-destructive/40 bg-destructive/10 text-destructive", title: "Permissão negada" };
      case "unsupported":
        return { icon: MapPinOff, label: "GPS n/d", className: "border-destructive/40 bg-destructive/10 text-destructive", title: "Sem suporte" };
      default:
        return { icon: Crosshair, label: "GPS", className: "border-muted-foreground/30 bg-muted text-muted-foreground", title: "GPS" };
    }
  }, [gps]);

  const content = (() => {
    if (error) {
      return (
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Tentar novamente</Button>
        </div>
      );
    }
    if (!me) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      );
    }
    const role = me.primaryRole;
    const firstName = me.user?.fullName?.split(" ")[0] ?? "campo";
    const GpsIcon = gpsBadge.icon;
    const isConsultantRoute = location.pathname.includes("/consultor");
    return (
      <div className="min-h-screen bg-background text-foreground pb-24">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <img src={vertexLogo} alt="Vertex" className="h-9 w-9 shrink-0" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">Olá, {firstName}</div>
                <div className="text-[11px] capitalize text-muted-foreground">
                  {role === "consultor" ? "Consultor" : role === "monitor" ? "Monitor" : role}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span
                className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium ${gpsBadge.className}`}
                title={gpsBadge.title}
              >
                <GpsIcon className="h-3 w-3" />
                {gpsBadge.label}
              </span>
              <button
                onClick={() => { setFlushing(true); flushOutbox().finally(() => setFlushing(false)); }}
                className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium ${
                  online ? "border-primary/40 bg-primary/10 text-primary" : "border-warning/40 bg-warning/10 text-warning"
                }`}
                title={online ? "Online" : "Offline"}
              >
                {flushing ? <Loader2 className="h-3 w-3 animate-spin" /> : online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {pending > 0 ? pending : online ? "On" : "Off"}
              </button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-foreground" title="Notificações">
                <Bell className="h-4 w-4" />
              </Button>
              {install && (
                <Button variant="ghost" size="icon" className="h-9 w-9 text-foreground" onClick={install.show} title="Instalar">
                  <Download className="h-4 w-4" />
                </Button>
              )}
              {me.isAdmin && (
                <Button variant="ghost" size="icon" className="h-9 w-9 text-foreground" onClick={() => navigate({ to: "/dashboard" })} title="Admin">
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-9 w-9 text-foreground" onClick={signOut} title="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-lg px-4 py-4">
          {checkin || isConsultantRoute ? (
            <Outlet />
          ) : (
            <CheckinGate
              me={me}
              gps={gps}
              onDone={(c) => setCheckin(c)}
            />
          )}
        </main>

        {!isConsultantRoute && <FieldBottomNav role={role} />}
      </div>
    );
  })();

  return content;
}

function CheckinGate({
  me, gps, onDone,
}: {
  me: FieldMe;
  gps: GpsState;
  onDone: (v: { farmId?: string; at: number }) => void;
}) {
  const [farmId, setFarmId] = useState<string>(me.assignments[0]?.farm.id ?? "");
  const [plotId, setPlotId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [locationName, setLocationName] = useState<{ farm?: string; plot?: string } | null>(null);

  const farm = me.assignments.find((a) => a.farm.id === farmId)?.farm;
  const companyId = farm?.companyId ?? me.companies[0]?.id ?? me.assignments[0]?.farm.companyId;
  const gpsReady = gps.status === "active";
  const canSubmit = !!companyId && gpsReady && !loading;

  async function handleCheckin() {
    if (!companyId) return;
    setLoading(true);
    try {
      let coords: Coords | null =
        gps.status === "active" ? gps.coords : await captureLocation(8000);
      if (!coords) {
        toast.error("Não foi possível obter GPS", { description: "Ative a localização e tente novamente." });
        return;
      }
      const res = await submitCheckin({
        companyId,
        farmId: farmId || undefined,
        plotId: plotId || undefined,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracyM: coords.accuracyM,
      });

      // Se o backend/checkin retornasse os nomes seria ideal, mas vamos usar o que temos no estado
      const selectedFarm = me.assignments.find(a => a.farm.id === farmId)?.farm.name;
      // Nota: plotId nome teria que vir de uma lista de talhões que ainda não carregamos aqui.
      // Para o MVP de UI, vamos setar o nome da localização detectada.
      setLocationName({ farm: selectedFarm });

      const stamp = { farmId: farmId || undefined, plotId: plotId || undefined, at: Date.now() };
      sessionStorage.setItem(CHECKIN_KEY, JSON.stringify(stamp));
      
      toast.success(res.queued ? "Check-in salvo (offline)" : "Check-in registrado");
      
      // Delay pequeno para o usuário ver a mensagem de boas-vindas antes de sumir o gate
      setTimeout(() => onDone(stamp), 2500);
    } catch (e: any) {
      toast.error("Falha no check-in", { description: e?.message ?? "Tente novamente." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <ShieldCheck className="h-8 w-8" />
      </div>
      <div className="space-y-1">
        {locationName ? (
          <div className="animate-in fade-in zoom-in duration-500">
            <h1 className="text-xl font-bold text-primary">Olá, {me.user?.fullName?.split(" ")[0]}!</h1>
            <p className="max-w-xs text-sm font-medium text-foreground">
              Você está na fazenda <span className="text-primary">{locationName.farm}</span>
              {plotId && <span>, no talhão <span className="text-primary">{plotId}</span></span>}.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-foreground">Check-in obrigatório</h1>
            <p className="max-w-xs text-sm text-muted-foreground">
              Confirme sua localização para liberar registros de sangria, produção, ocorrências e agenda.
            </p>
          </>
        )}
      </div>

      {me.assignments.length > 0 && (
        <div className="w-full max-w-xs space-y-3 text-left">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Fazenda</label>
            <select
              value={farmId}
              onChange={(e) => setFarmId(e.target.value)}
              className="w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm text-foreground"
            >
              {me.assignments.map((a) => (
                <option key={a.id} value={a.farm.id}>{a.farm.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Talhão (Opcional)</label>
            <input
              type="text"
              value={plotId}
              onChange={(e) => setPlotId(e.target.value)}
              placeholder="Ex: Talhão A1"
              className="w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
        </div>
      )}

      <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
        gpsReady
          ? "border-primary/40 bg-primary/10 text-primary"
          : gps.status === "denied" || gps.status === "unsupported"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-muted-foreground/30 bg-muted text-muted-foreground"
      }`}>
        {gpsReady ? <MapPin className="h-3.5 w-3.5" /> : gps.status === "denied" ? <MapPinOff className="h-3.5 w-3.5" /> : <Crosshair className="h-3.5 w-3.5 animate-pulse" />}
        {gpsReady
          ? `GPS ativo · ${gps.coords.accuracyM ? Math.round(gps.coords.accuracyM) + " m" : "ok"}`
          : gps.status === "denied"
          ? "Permissão de localização negada"
          : gps.status === "unsupported"
          ? "Dispositivo sem GPS"
          : "Obtendo localização…"}
      </div>

      <Button className="h-12 w-full max-w-xs rounded-xl text-base font-semibold" disabled={!canSubmit} onClick={handleCheckin}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fazer check-in"}
      </Button>

      <p className="max-w-xs text-[11px] text-muted-foreground/80">
        Sem check-in, apenas visualização básica está disponível. O check-in expira em 12h.
      </p>
    </div>
  );
}
