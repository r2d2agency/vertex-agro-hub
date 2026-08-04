import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { 
  ClipboardCheck, 
  Stethoscope, 
  Droplets, 
  Camera, 
  Save,
  ChevronLeft,
  Info,
  Loader2,
  Users,
  LayoutDashboard,
  MapPin,
  Calendar,
  Sparkles,
  Search,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Mic,
  Video,
  PlusCircle,
  ShieldCheck,
  Crosshair,
  MapPinOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getFieldMe, type FieldMe, captureLocation, submitCheckin } from "@/lib/field.functions";
import { submitConsultation } from "@/lib/consultor.functions";

export const Route = createFileRoute("/campo/consultor/")({
  component: ConsultorFormPage,
});

function ConsultorFormPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"dashboard" | "visit" | "team">("dashboard");
  
  // Check-in state
  const [activeCheckin, setActiveCheckin] = useState<{ farmId?: string; plotId?: string; at: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "getting" | "active" | "error">("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Visit Form state
  const [farmId, setFarmId] = useState("");
  const [plotId, setPlotId] = useState("");
  const [tappingQuality, setTappingQuality] = useState(5);
  const [sanitaryState, setSanitaryState] = useState("Ótimo");
  const [recommendations, setRecommendations] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    getFieldMe().then(setMe).catch(console.error);
    
    // Check for existing session check-in
    const CHECKIN_KEY = "vertex.field.checkin.v1";
    const raw = sessionStorage.getItem(CHECKIN_KEY);
    if (raw) {
      const stamp = JSON.parse(raw);
      if (Date.now() - stamp.at < 12 * 60 * 60 * 1000) {
        setActiveCheckin(stamp);
      }
    }
  }, []);

  const handleNewCheckin = async (fId?: string, pId?: string) => {
    setGpsStatus("getting");
    const loc = await captureLocation();
    if (!loc) {
      toast.error("GPS não detectado");
      setGpsStatus("error");
      return;
    }
    
    setCoords({ lat: loc.latitude, lng: loc.longitude });
    setGpsStatus("active");
    
    const companyId = me?.companies[0]?.id || "";
    try {
      await submitCheckin({
        companyId,
        farmId: fId || farmId || undefined,
        plotId: pId || plotId || undefined,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracyM: loc.accuracyM
      });
      
      const stamp = { farmId: fId || farmId || undefined, plotId: pId || plotId || undefined, at: Date.now() };
      sessionStorage.setItem("vertex.field.checkin.v1", JSON.stringify(stamp));
      setActiveCheckin(stamp);
      
      const farmName = me?.assignments.find(a => a.farm.id === (fId || farmId))?.farm.name;
      toast.success(`Check-in realizado em ${farmName || 'Fazenda'}`);
    } catch (e) {
      toast.error("Erro ao registrar check-in");
    }
  };

  const stats = useMemo(() => {
    if (!me) return null;
    return {
      totalFarms: me.assignments.length,
      monitors: 12, // Mock or derived
      avgQuality: 4.2,
      lastVisitDays: 5
    };
  }, [me]);

  const handleSubmit = async () => {
    if (!farmId) {
      toast.error("Selecione uma fazenda");
      return;
    }
    
    setLoading(true);
    try {
      const res = await submitConsultation({
        farmId: farmId || activeCheckin?.farmId || "",
        consultantId: me?.user.id || "",
        conductedAt: new Date().toISOString(),
        recommendations,
        sanitaryState,
        tappingQuality,
        notes,
      });
      
      toast.success(res.queued ? "Ficha salva offline!" : "Consultoria registrada com sucesso!");
      setView("dashboard");
    } catch (error) {
      toast.error("Erro ao salvar ficha");
    } finally {
      setLoading(false);
    }
  };

  if (!me) return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;

  const renderDashboard = () => (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Olá, {me.user.fullName?.split(" ")[0]}</h1>
          {activeCheckin ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary mt-0.5">
              <ShieldCheck className="h-3 w-3" />
              <div className="flex flex-col">
                <span className="leading-tight">
                  {me.assignments.find(a => a.farm.id === activeCheckin.farmId)?.farm.name || "Fazenda"}
                </span>
                {activeCheckin.plotId && (
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Talhão: {activeCheckin.plotId}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Painel do Consultor</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCheckin && (
            <button 
              onClick={() => handleNewCheckin(activeCheckin.farmId)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary active:scale-95 transition-transform"
              title="Trocar Talhão / Novo Check-in"
            >
              <PlusCircle className="h-5 w-5" />
            </button>
          )}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </header>

      {/* AI Suggestion */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2 opacity-10">
          <Sparkles className="h-12 w-12 text-primary" />
        </div>
        <div className="flex items-center gap-2 text-primary font-bold text-sm mb-2">
          <Sparkles className="h-4 w-4" />
          Sugestão da IA
        </div>
        <p className="text-sm leading-relaxed">
          O monitor <span className="font-semibold">Ricardo Lima</span> na fazenda <span className="font-semibold">Boa Vista</span> não recebe visita há 12 dias. A produtividade caiu 8% no último talhão.
        </p>
        <Button 
          variant="link" 
          className="p-0 h-auto mt-2 text-primary text-xs font-bold"
          onClick={() => {
            setFarmId(me.assignments[0]?.farm.id || "");
            setView("visit");
          }}
        >
          Agendar visita agora →
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Fazendas sob gestão</div>
          <div className="text-2xl font-bold">{stats?.totalFarms}</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Qualidade Média</div>
          <div className="text-2xl font-bold text-primary">{stats?.avgQuality}</div>
        </div>
      </div>

      {/* Farm List */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Minhas Fazendas</h2>
          <Button variant="ghost" size="sm" className="text-xs h-7">Ver todas</Button>
        </div>
        <div className="space-y-3">
          {me.assignments.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border/60 bg-card p-4 flex items-center justify-between group active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-bold text-sm">{a.farm.name}</div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Visitada há 3 dias
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-active:text-primary" />
            </div>
          ))}
        </div>
      </section>

      {/* Quick Action FAB */}
      <button 
        onClick={() => setView("visit")}
        className="fixed bottom-24 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center animate-bounce-slow"
      >
        <ClipboardCheck className="h-6 w-6" />
      </button>
    </div>
  );

  const renderVisitForm = () => (
    <div className="space-y-6 pb-20">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setView("dashboard")}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Nova Visita Técnica</h1>
      </header>

      <div className="space-y-4">
        {/* Seleção de Fazenda */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Fazenda Visitada</label>
          <select
            value={farmId}
            onChange={(e) => setFarmId(e.target.value)}
            className="w-full rounded-xl border border-border/60 bg-card px-3 py-3 text-foreground"
          >
            <option value="">Selecione a fazenda...</option>
            {me.assignments.map((a) => (
              <option key={a.farm.id} value={a.farm.id}>{a.farm.name}</option>
            ))}
          </select>
        </div>

        {/* Avaliação Fitossanitária */}
        <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Stethoscope className="h-5 w-5" />
            <h2>Estado Fitossanitário</h2>
          </div>

          {activeCheckin && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <div className="text-xs">
                  <div className="font-bold text-primary">Localização confirmada</div>
                  <div className="text-muted-foreground">
                    {me.assignments.find(a => a.farm.id === activeCheckin.farmId)?.farm.name}
                    {activeCheckin.plotId && ` · Talhão ${activeCheckin.plotId}`}
                  </div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 text-[10px] font-bold uppercase text-primary"
                onClick={() => handleNewCheckin(activeCheckin.farmId)}
              >
                Trocar Talhão
              </Button>
            </div>
          )}

          
          <div className="grid grid-cols-2 gap-2">
            {["Ótimo", "Bom", "Alerta", "Crítico"].map((status) => (
              <button
                key={status}
                onClick={() => setSanitaryState(status)}
                className={`rounded-xl border py-2 text-sm font-medium transition-colors ${
                  sanitaryState === status 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-background border-border"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </section>

        {/* Qualidade da Sangria */}
        <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Droplets className="h-5 w-5" />
            <h2>Qualidade da Sangria</h2>
          </div>
          
          <div className="flex justify-between gap-1">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                onClick={() => setTappingQuality(score)}
                className={`flex h-12 w-12 items-center justify-center rounded-full border text-lg font-bold transition-all ${
                  tappingQuality === score
                    ? "bg-primary text-primary-foreground border-primary scale-110 shadow-lg"
                    : "bg-background border-border"
                }`}
              >
                {score}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground uppercase px-1">
            <span>Insatisfatório</span>
            <span>Excelente</span>
          </div>
        </section>

        {/* Recomendações */}
        <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <ClipboardCheck className="h-5 w-5" />
            <h2>Recomendações Técnicas</h2>
          </div>
          <Textarea 
            placeholder="Descreva as orientações para o produtor/equipe..." 
            className="min-h-[120px] bg-background border-border rounded-xl"
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
          />
        </section>

        {/* Fotos e Notas */}
        <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Info className="h-5 w-5" />
            <h2>Fotos e Mídia</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" className="h-20 rounded-xl border-dashed border-2 flex flex-col gap-1">
              <Camera className="h-5 w-5" />
              <span className="text-[10px]">Foto</span>
            </Button>
            <Button variant="outline" className="h-20 rounded-xl border-dashed border-2 flex flex-col gap-1">
              <Mic className="h-5 w-5" />
              <span className="text-[10px]">Áudio</span>
            </Button>
            <Button variant="outline" className="h-20 rounded-xl border-dashed border-2 flex flex-col gap-1">
              <Video className="h-5 w-5" />
              <span className="text-[10px]">Vídeo</span>
            </Button>
          </div>

          <Textarea 
            placeholder="Notas internas ou lembretes..." 
            className="bg-background border-border rounded-xl"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>

        <Button 
          className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl flex gap-2"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Salvar Visita Técnica
        </Button>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen">
      <div className="p-6">
        {view === "dashboard" && renderDashboard()}
        {view === "visit" && renderVisitForm()}
      </div>

      {/* Mobile Nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/80 backdrop-blur-md px-6 py-3 flex justify-between items-center z-50">
        <NavButton active={view === "dashboard"} onClick={() => setView("dashboard")} icon={<LayoutDashboard className="h-5 w-5" />} label="Painel" />
        <NavButton active={view === "visit"} onClick={() => setView("visit")} icon={<ClipboardCheck className="h-5 w-5" />} label="Visitas" />
        <NavButton active={false} onClick={() => {}} icon={<BarChart3 className="h-5 w-5" />} label="KPIs" />
        <NavButton active={false} onClick={() => {}} icon={<Users className="h-5 w-5" />} label="Equipe" />
      </nav>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}
