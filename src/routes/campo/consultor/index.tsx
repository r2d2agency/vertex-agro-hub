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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [view, setView] = useState<"dashboard" | "visit" | "team" | "kpis">("dashboard");
  
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
  const [sanitaryInspector, setSanitaryInspector] = useState("");
  const [isThirdPartyInspector, setIsThirdPartyInspector] = useState(false);

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
    
    const companyId = me?.companies?.[0]?.id || "";
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
      totalFarms: me.assignments?.length || 0,
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
        sanitaryInspector,
        isThirdPartyInspector,
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
                  {(me.assignments || []).find(a => a.farm.id === activeCheckin.farmId)?.farm.name || "Fazenda"}
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
            setFarmId(me.assignments?.[0]?.farm.id || "");
            setView("visit");
          }}
        >
          Agendar visita agora →
        </Button>
      </div>

      {/* Stats and Info Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Fazendas sob gestão</div>
          <div className="text-2xl font-bold">{stats?.totalFarms}</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Qualidade Média</div>
          <div className="text-2xl font-bold text-primary">{stats?.avgQuality}</div>
        </div>

        {activeCheckin && (
          <div className="col-span-2 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] uppercase font-bold text-primary tracking-widest">Status da Fazenda Atual</h3>
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground uppercase">Última Visita</div>
                <div className="text-sm font-bold text-foreground">há 4 dias</div>
              </div>
              <div className="space-y-1 text-right">
                <div className="text-[10px] text-muted-foreground uppercase">Erros Reportados</div>
                <div className="text-sm font-bold text-destructive">2 pendentes</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground uppercase">KPI Produção</div>
                <div className="text-sm font-bold text-primary">92% da meta</div>
              </div>
              <div className="space-y-1 text-right">
                <div className="text-[10px] text-muted-foreground uppercase">Clima Atual</div>
                <div className="text-sm font-bold text-foreground">24°C · Ensolarado</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Farm List */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Minhas Fazendas</h2>
          <Button variant="ghost" size="sm" className="text-xs h-7">Ver todas</Button>
        </div>
        <div className="space-y-3">
          {(me.assignments || []).map((a) => (
            <div 
              key={a.id} 
              onClick={() => {
                setFarmId(a.farm.id);
                // Se o check-in não for desta fazenda, abre o formulário para iniciar nova visita
                if (activeCheckin?.farmId !== a.farm.id) {
                  setView("visit");
                }
              }}
              className={`rounded-2xl border border-border/60 bg-card p-4 flex items-center justify-between group active:scale-[0.98] transition-transform ${activeCheckin?.farmId === a.farm.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${activeCheckin?.farmId === a.farm.id ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                  <MapPin className="h-5 w-5" />
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
            {(me.assignments || []).map((a) => (
              <option key={a.farm.id} value={a.farm.id}>{a.farm.name}</option>
            ))}
          </select>
        </div>

        {/* Seleção de Consultor (Vínculo ou Novo) */}
        {farmId && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
            <label className="text-sm font-medium">Consultor / Responsável</label>
            <Select 
              value={me.user.id} 
              onValueChange={(v: string) => {/* ... */}}
            >

              <SelectTrigger className="w-full rounded-xl h-12 bg-card border-border/60">
                <SelectValue placeholder="Selecione o consultor..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={me.user.id}>{me.user.fullName} (Você)</SelectItem>
                {/* Find other consultants linked to this farm in assignments */}
                {me.assignments
                  .filter(a => a.farm.id === farmId && a.role === 'consultor')
                  .map(a => (
                    <SelectItem key={a.id} value={a.id}>Consultor Vinculado</SelectItem>
                  ))
                }

                <SelectItem value="add_new">+ Adicionar novo consultor à fazenda</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground px-1 italic">
              Se o consultor atual não puder comparecer, você pode registrar a visita em nome de outro ou adicionar um substituto.
            </p>
          </div>
        )}

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

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inspecionado por</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isThirdParty"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={isThirdPartyInspector}
                  onChange={(e) => setIsThirdPartyInspector(e.target.checked)}
                />
                <label htmlFor="isThirdParty" className="text-xs font-medium cursor-pointer">Terceirizado</label>
              </div>
            </div>
            <Input
              placeholder="Nome do inspetor ou colaborador..."
              value={sanitaryInspector}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSanitaryInspector(e.target.value)}
              className="bg-background border-border rounded-xl"
            />

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
          
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-28 rounded-2xl border-dashed border-2 flex flex-col items-center justify-center gap-2 group active:bg-secondary">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-active:scale-110 transition-transform">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <div className="text-center">
                <span className="block text-xs font-bold">Capturar Foto</span>
                <span className="text-[10px] text-muted-foreground uppercase">Georeferenciada</span>
              </div>
            </Button>
            
            <Button variant="outline" className="h-28 rounded-2xl border-dashed border-2 flex flex-col items-center justify-center gap-2 group active:bg-secondary">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-active:scale-110 transition-transform">
                <Mic className="h-5 w-5 text-primary" />
              </div>
              <div className="text-center">
                <span className="block text-xs font-bold">Gravar Áudio</span>
                <span className="text-[10px] text-muted-foreground uppercase">Relato Técnico</span>
              </div>
            </Button>

            <Button variant="outline" className="h-28 rounded-2xl border-dashed border-2 flex flex-col items-center justify-center gap-2 group active:bg-secondary">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-active:scale-110 transition-transform">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div className="text-center">
                <span className="block text-xs font-bold">Gravar Vídeo</span>
                <span className="text-[10px] text-muted-foreground uppercase">Inspeção Visual</span>
              </div>
            </Button>

            <div className="h-28 rounded-2xl bg-secondary/30 border border-border/40 p-3 flex flex-col justify-center gap-1">
              <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                <ShieldCheck className="h-2.5 w-2.5" /> Marca d'água
              </div>
              <p className="text-[10px] leading-tight text-muted-foreground italic">
                {activeCheckin ? (
                  <>
                    Registrando coords, timestamp e consultor no rodapé da mídia para rastreabilidade total.
                  </>
                ) : (
                  <>Check-in necessário para carimbar dados de localização.</>
                )}
              </p>
            </div>
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
  
  const renderKpiView = () => (
    <div className="space-y-6">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setView("dashboard")}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Indicadores (KPIs)</h1>
      </header>
      
      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Qualidade Global</h3>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="text-4xl font-black text-primary mb-1">4.8</div>
          <p className="text-xs text-muted-foreground">+0.3% em relação ao mês anterior</p>
        </div>
        
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Produtividade Estimada</h3>
            <Droplets className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-bold mb-1">2.450 <span className="text-sm font-normal text-muted-foreground">kg/ha</span></div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden mt-2">
            <div className="h-full bg-primary w-[75%]" />
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <h3 className="font-bold text-xs uppercase text-muted-foreground mb-4">Top 5 Fazendas (Qualidade)</h3>
          <div className="space-y-3">
            {me.assignments.slice(0, 5).map((a, i) => (
              <div key={a.id} className="flex items-center justify-between">
                <div className="text-sm font-medium">{a.farm.name}</div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${95 - i * 5}%` }} />
                  </div>
                  <span className="text-xs font-bold">{(4.9 - i * 0.1).toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTeamView = () => (
    <div className="space-y-6">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setView("dashboard")}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Minha Equipe</h1>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input 
          type="text" 
          placeholder="Buscar monitor ou sangrador..." 
          className="w-full pl-10 pr-4 py-3 bg-card border border-border/60 rounded-xl text-sm"
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Monitores em Campo</h2>
        {[
          { name: "Ricardo Lima", farm: "Fazenda Boa Vista", status: "Em atividade", lastVisit: "Hoje" },
          { name: "Ana Paula Silva", farm: "Seringal Ouro", status: "Pendente", lastVisit: "Ontem" },
          { name: "Marcos Oliveira", farm: "Fazenda Progresso", status: "Em atividade", lastVisit: "Hoje" }
        ].map((member, i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {member.name.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-sm">{member.name}</div>
                <div className="text-[10px] text-muted-foreground">{member.farm} · {member.lastVisit}</div>
              </div>
            </div>
            <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${member.status === 'Em atividade' ? 'bg-primary/20 text-primary' : 'bg-warning/20 text-warning'}`}>
              {member.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen">
      <div className="p-6">
        {view === "dashboard" && renderDashboard()}
        {view === "visit" && renderVisitForm()}
        {view === "kpis" && renderKpiView()}
        {view === "team" && renderTeamView()}
      </div>

      {/* Mobile Nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/80 backdrop-blur-md px-6 py-3 flex justify-between items-center z-50">
        <NavButton active={view === "dashboard"} onClick={() => setView("dashboard")} icon={<LayoutDashboard className="h-5 w-5" />} label="Painel" />
        <NavButton active={view === "visit"} onClick={() => setView("visit")} icon={<ClipboardCheck className="h-5 w-5" />} label="Visitas" />
        <NavButton active={view === "kpis"} onClick={() => setView("kpis")} icon={<BarChart3 className="h-5 w-5" />} label="KPIs" />
        <NavButton active={view === "team"} onClick={() => setView("team")} icon={<Users className="h-5 w-5" />} label="Equipe" />
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
