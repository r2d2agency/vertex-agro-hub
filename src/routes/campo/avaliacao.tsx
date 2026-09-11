import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeftRight, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { getFieldMe, submitEvaluation, submitOccurrence, type FieldMe } from "@/lib/field.functions";
import { OCC_SEVERITIES } from "@/lib/ocorrencias.functions";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FieldCard, StepHeader } from "@/components/vertex/field/step-header";
import { getLocalIsoDate, getLocalIsoString } from "@/lib/date-utils";

export const Route = createFileRoute("/campo/avaliacao")({ component: AvaliacaoPage });

type TeamMember = {
  id: string;
  userId: string;
  role: string;
  user: { id: string; email: string; fullName?: string | null; avatarUrl?: string | null };
};

const CATEGORIES = [
  { value: "sangria", label: "Sangria" },
  { value: "produtividade", label: "Produtividade" },
  { value: "conduta", label: "Conduta" },
  { value: "seguranca", label: "Segurança" },
  { value: "outros", label: "Outros" },
];

const ROLE_LABEL: Record<string, string> = {
  consultor: "Consultor", monitor: "Monitor", sangrador: "Sangrador", operador: "Operador",
};

function AvaliacaoPage() {
  const nav = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [farmId, setFarmId] = useState("");
  const [rawTeam, setRawTeam] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [rating, setRating] = useState(4);
  const [category, setCategory] = useState("sangria");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [swapTargetId, setSwapTargetId] = useState<string | null>(null);
  const [swapReason, setSwapReason] = useState("");
  const [swapSaving, setSwapSaving] = useState(false);

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertSeverity, setAlertSeverity] = useState("alta");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertDescription, setAlertDescription] = useState("");
  const [alertSaving, setAlertSaving] = useState(false);

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
      .then((data) => setRawTeam((data ?? []).filter((m) => m.userId)))
      .catch(() => setRawTeam([]))
      .finally(() => setTeamLoading(false));
  }, [farm?.id, me?.user.id]);

  const consultorMember = rawTeam.find((m) => m.role === "consultor");
  // Colaboradores que o usuário logado pode avaliar/gerenciar: nunca o próprio
  // consultor nem ele mesmo — o backend aplica a mesma regra em people.service.ts.
  const team = rawTeam.filter((m) => m.userId !== me?.user.id && m.role !== "consultor");
  const swapTarget = team.find((m) => m.userId === swapTargetId);

  if (!me) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  async function requestSwap() {
    if (!farm || !swapTarget) return;
    if (!swapReason.trim()) { toast.error("Descreva o motivo da troca"); return; }
    setSwapSaving(true);
    try {
      const name = swapTarget.user.fullName ?? swapTarget.user.email;
      await submitOccurrence({
        companyId: farm.companyId, farmId: farm.id,
        date: getLocalIsoDate(), type: "equipe", severity: "alta", status: "aberta",
        title: `Solicitação de troca — ${name}`,
        description: swapReason.trim(),
        responsible: me?.user.fullName ?? me?.user.email,
      });
      toast.success("Solicitação enviada ao consultor");
      setSwapTargetId(null);
      setSwapReason("");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enviar solicitação");
    } finally {
      setSwapSaving(false);
    }
  }

  async function sendAlert() {
    if (!farm) return;
    if (!alertTitle.trim()) { toast.error("Informe um título para o alerta"); return; }
    setAlertSaving(true);
    try {
      await submitOccurrence({
        companyId: farm.companyId, farmId: farm.id,
        date: getLocalIsoDate(), type: "equipe", severity: alertSeverity, status: "aberta",
        title: alertTitle.trim(),
        description: alertDescription.trim() || undefined,
        responsible: me?.user.fullName ?? me?.user.email,
      });
      toast.success("Alerta enviado ao consultor");
      setAlertOpen(false);
      setAlertTitle("");
      setAlertDescription("");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enviar alerta");
    } finally {
      setAlertSaving(false);
    }
  }

  async function save() {
    if (!farm) { toast.error("Selecione uma fazenda"); return; }
    if (!targetUserId) { toast.error("Selecione o colaborador avaliado"); return; }
    setSaving(true);
    try {
      const res = await submitEvaluation({
        targetUserId,
        companyId: farm.companyId,
        ratedAt: getLocalIsoString(),
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
    <div className="space-y-4">
      <StepHeader title="Equipe da fazenda" step={1} steps={["Equipe", "Avaliar"]} />

      <FieldCard className="space-y-4">
        <Field label="Fazenda">
          <Select value={farmId} onValueChange={setFarmId}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {me.assignments.map((a) => <SelectItem key={a.farm.id} value={a.farm.id}>{a.farm.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        {teamLoading ? (
          <div className="flex h-11 items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando equipe...
          </div>
        ) : (
          <div className="space-y-2">
            {consultorMember ? (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                <p className="text-[10px] font-bold uppercase text-primary">Consultor responsável</p>
                <p className="text-sm font-medium text-foreground">
                  {consultorMember.user.fullName ?? consultorMember.user.email}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum consultor vinculado a esta fazenda.</p>
            )}

            {team.length === 0 ? (
              <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                Nenhum outro colaborador vinculado a esta fazenda.
              </div>
            ) : (
              <ul className="space-y-2">
                {team.map((m) => {
                  const name = m.user.fullName ?? m.user.email;
                  return (
                    <li key={m.id} className="rounded-xl border border-border/60 bg-background/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{name}</p>
                          <p className="text-[11px] text-muted-foreground">{ROLE_LABEL[m.role] ?? m.role}</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button" variant="outline" size="sm" className="h-8 rounded-lg text-xs"
                            onClick={() => setTargetUserId(m.userId)}
                          >
                            Avaliar
                          </Button>
                          {m.role === "sangrador" && (
                            <Button
                              type="button" variant="outline" size="sm" className="h-8 rounded-lg text-xs"
                              onClick={() => { setSwapTargetId(m.userId); setSwapReason(""); }}
                            >
                              <ArrowLeftRight className="mr-1 h-3 w-3" /> Trocar
                            </Button>
                          )}
                        </div>
                      </div>

                      {swapTargetId === m.userId && (
                        <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
                          <Label className="text-xs font-medium text-muted-foreground">
                            Motivo da solicitação de troca
                          </Label>
                          <Textarea
                            rows={3} className="rounded-xl" value={swapReason}
                            onChange={(e) => setSwapReason(e.target.value)}
                            placeholder="Ex.: baixa produtividade, faltas recorrentes, conflito na fazenda..."
                          />
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setSwapTargetId(null)}>
                              Cancelar
                            </Button>
                            <Button type="button" size="sm" onClick={requestSwap} disabled={swapSaving}>
                              {swapSaving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />} Enviar ao consultor
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </FieldCard>

      <FieldCard className="space-y-3">
        <button
          type="button"
          className="flex w-full items-center gap-2 text-left text-sm font-semibold text-foreground"
          onClick={() => setAlertOpen((v) => !v)}
        >
          <AlertTriangle className="h-4 w-4 text-warning" />
          Enviar alerta ao consultor
        </button>
        {alertOpen && (
          <div className="space-y-3">
            <Field label="Prioridade">
              <Select value={alertSeverity} onValueChange={setAlertSeverity}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OCC_SEVERITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Título">
              <Input
                className="h-11 rounded-xl" value={alertTitle} onChange={(e) => setAlertTitle(e.target.value)}
                placeholder="Ex.: Falta de sangrador no talhão B2"
              />
            </Field>
            <Field label="Descrição">
              <Textarea
                rows={3} className="rounded-xl" value={alertDescription}
                onChange={(e) => setAlertDescription(e.target.value)}
              />
            </Field>
            <Button className="h-11 w-full rounded-xl" onClick={sendAlert} disabled={alertSaving}>
              {alertSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enviar alerta
            </Button>
          </div>
        )}
      </FieldCard>

      <FieldCard className="space-y-4">
        <p className="text-sm font-semibold text-foreground">Avaliar colaborador</p>
        <Field label="Colaborador">
          {team.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
              Nenhum colaborador vinculado a esta fazenda.
            </div>
          ) : (
            <Select value={targetUserId} onValueChange={setTargetUserId}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {team.map((m) => (
                  <SelectItem key={m.id} value={m.userId}>
                    {(m.user.fullName ?? m.user.email)} · {ROLE_LABEL[m.role] ?? m.role}
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
