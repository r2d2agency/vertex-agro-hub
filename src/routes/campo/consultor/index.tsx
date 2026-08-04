import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  ClipboardCheck, 
  Stethoscope, 
  Droplets, 
  Camera, 
  Save,
  ChevronLeft,
  Info,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getFieldMe, type FieldMe } from "@/lib/field.functions";
import { submitConsultation } from "@/lib/consultor.functions";

export const Route = createFileRoute("/campo/consultor/")({
  component: ConsultorFormPage,
});

function ConsultorFormPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [farmId, setFarmId] = useState("");
  const [tappingQuality, setTappingQuality] = useState(5);
  const [sanitaryState, setSanitaryState] = useState("Ótimo");
  const [recommendations, setRecommendations] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    getFieldMe().then(setMe).catch(console.error);
  }, []);

  const handleSubmit = async () => {
    if (!farmId) {
      toast.error("Selecione uma fazenda");
      return;
    }
    
    setLoading(true);
    try {
      const res = await submitConsultation({
        farmId,
        consultantId: me?.user.id || "",
        conductedAt: new Date().toISOString(),
        recommendations,
        sanitaryState,
        tappingQuality,
        notes,
      });
      
      toast.success(res.queued ? "Ficha salva offline!" : "Consultoria registrada com sucesso!");
      navigate({ to: "/campo" });
    } catch (error) {
      toast.error("Erro ao salvar ficha");
    } finally {
      setLoading(false);
    }
  };

  if (!me) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="space-y-6 pb-12">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/campo" })}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Visita Técnica</h1>
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
            <h2>Observações Adicionais</h2>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-20 rounded-xl border-dashed border-2 flex flex-col gap-1">
              <Camera className="h-6 w-6" />
              <span className="text-xs">Anexar Fotos</span>
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
}
