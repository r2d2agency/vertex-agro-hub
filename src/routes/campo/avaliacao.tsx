import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { getFieldMe, submitEvaluation, type FieldMe } from "@/lib/field.functions";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FieldCard, StepHeader } from "@/components/vertex/field/step-header";

export const Route = createFileRoute("/campo/avaliacao")({ component: AvaliacaoPage });

type TeamMember = {
  id: string;
  userId: string;
  role: string;
  user: { id: string; email: string; fullName?: string | null };
};

const CATEGORIES = [
  { value: "sangria", label: "Sangria" },
  { value: "produtividade", label: "Produtividade" },
  { value: "conduta", label: "Conduta" },
  { value: "seguranca", label: "Segurança" },
  { value: "outros", label: "Outros" },
];

function AvaliacaoPage() {
  const nav = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [farmId, setFarmId] = useState("");
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [rating, setRating] = useState(4);
  const [category, setCategory] = useState("sangria");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFieldMe().then((m) => {
      setMe(m);
      if (m.assignments[0]) setFarmId(m.assignments[0].farm.id);
    });
  }, []);

  const farm = useMemo(() => me?.assignments.find((a) => a.farm.id === farmId)?.farm, [me, farmId]);

  useEffect(() => {
    if (!farm) return;
    setTeamLoading(true);
    setTargetUserId("");
    apiRequest<TeamMember[]>(`/people/farm/${farm.id}/team?companyId=${farm.companyId}`)
      .then((data) => {
        // Filtra o próprio consultor, usuários sem userId válido e também consultores da lista de avaliação
        const filtered = (data ?? []).filter((m) => 
          m.userId && 
          m.userId !== me?.user.id &&
          m.role !== "consultor"
        );
        setTeam(filtered);
      })
      .catch(() => setTeam([]))
      .finally(() => setTeamLoading(false));
  }, [farm?.id, me?.user.id]);

  if (!me) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  async function save() {
    if (!farm) { toast.error("Selecione uma fazenda"); return; }
    if (!targetUserId) { toast.error("Selecione o colaborador avaliado"); return; }
    setSaving(true);
    try {
      const res = await submitEvaluation({
        targetUserId,
        companyId: farm.companyId,
        ratedAt: new Date().toISOString(),
        rating,
        category,
        title: title.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success(res.queued ? "Avaliação salva (offline)" : "Avaliação registrada");
      nav({ to: "/campo" });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <StepHeader title="Avaliar equipe" step={1} steps={["Colaborador", "Salvar"]} />
      <FieldCard className="space-y-4">
        <Field label="Fazenda">
          <Select value={farmId} onValueChange={setFarmId}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {me.assignments.map((a) => <SelectItem key={a.farm.id} value={a.farm.id}>{a.farm.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Colaborador">
          {teamLoading ? (
            <div className="flex h-11 items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando equipe...
            </div>
          ) : team.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
              Nenhum colaborador vinculado a esta fazenda.
            </div>
          ) : (
            <Select value={targetUserId} onValueChange={setTargetUserId}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {team.map((m) => (
                  <SelectItem key={m.id} value={m.userId}>
                    {(m.user.fullName ?? m.user.email)} · {m.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <Field label="Categoria">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <div>
          <Label className="mb-2 block text-xs font-medium text-muted-foreground">Nota</Label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`Nota ${n}`}
                className={`grid h-11 w-11 place-items-center rounded-xl border transition ${
                  n <= rating
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border/60 bg-background/40 text-muted-foreground"
                }`}
              >
                <Star className={`h-5 w-5 ${n <= rating ? "fill-current" : ""}`} />
              </button>
            ))}
            <span className="ml-auto text-sm font-semibold text-foreground">{rating}/5</span>
          </div>
        </div>

        <Field label="Título (opcional)">
          <Input className="h-11 rounded-xl" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Corte técnico consistente" />
        </Field>

        <Field label="Observações">
          <Textarea rows={4} className="rounded-xl" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Pontos fortes, orientações, próximos passos..." />
        </Field>

        <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={save} disabled={saving || !targetUserId}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar avaliação
        </Button>
      </FieldCard>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
