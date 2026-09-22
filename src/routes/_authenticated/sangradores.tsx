import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HardHat, Search, Trash2, MapPin, Phone, UserPlus, ShieldAlert, ShieldCheck, ListTree } from "lucide-react";
import { toast } from "sonner";
import { PersonEditor } from "@/components/vertex/person-editor";
import { PreRegistrationsCard } from "@/components/vertex/pre-registrations-card";
import { TapperPlotsDialog } from "@/components/vertex/tapper-plots-dialog";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { SearchableSelect } from "@/components/vertex/searchable-select";
import { listFarms } from "@/lib/fazendas.functions";
import {
  deleteTapper,
  listTappers,
  TAPPER_STATUS,
  type TapperListItem,
} from "@/lib/tappers.functions";
import { invitePerson, listCompanyAssignments, listPeople, type Person } from "@/lib/people.functions";

export const Route = createFileRoute("/_authenticated/sangradores")({
  head: () => ({
    meta: [
      { title: "Sangradores — Vertex Agro" },
      { name: "description", content: "Lista operacional de sangradores vinculada ao RH." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SangradoresPage,
});

const fmt = (n?: number | null, d = 1) =>
  n ? n.toLocaleString("pt-BR", { maximumFractionDigits: d }) : "—";
const date = (v?: string | null) => (v ? new Date(v).toLocaleDateString("pt-BR") : "—");
const digits = (v?: string | null) => (v ?? "").replace(/\D+/g, "");
const norm = (v?: string | null) => (v ?? "").trim().toLowerCase();

function SangradoresPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [farmFilter, setFarmFilter] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<TapperListItem | null>(null);
  const [plotsTarget, setPlotsTarget] = useState<{ key: string; name: string; farmIds: string[] } | null>(null);

  const { data: tappers = [], isLoading: loadingList } = useQuery({
    queryKey: ["tappers", companyId],
    queryFn: () => listTappers(companyId!),
    enabled: !!companyId,
  });

  const { data: farms = [] } = useQuery({ queryKey: ["farms", companyId], queryFn: () => listFarms(companyId!), enabled: !!companyId });

  const { data: people = [] } = useQuery({
    queryKey: ["people", companyId],
    queryFn: () => listPeople(companyId!),
    enabled: !!companyId,
  });

  const { data: rhSangradores = [] } = useQuery({
    queryKey: ["company-assignments", companyId, "sangrador"],
    queryFn: () => listCompanyAssignments(companyId!, { role: "sangrador", history: false }),
    enabled: !!companyId,
  });

  const peopleMatch = useMemo(() => buildPeopleMatch(people), [people]);

  // Fallback pra ficha operacional (Tapper/stints) não bater com o vínculo
  // feito pelo Portal de RH — mesma pessoa, duas fontes de fazenda. Sem isso
  // o card mostra "Sem fazenda vinculada" mesmo com a fazenda certa no RH.
  const rhFarmsByUserId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const a of rhSangradores) {
      if (!a.farm?.name) continue;
      map.set(a.userId, [...(map.get(a.userId) ?? []), formatFarmLabel(a.farm)]);
    }
    return map;
  }, [rhSangradores]);
  const rhFarmIdsByUserId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const a of rhSangradores) if (a.farm?.id) map.set(a.userId, [...(map.get(a.userId) ?? []), a.farm.id]);
    return map;
  }, [rhSangradores]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = !q
      ? tappers
      : tappers.filter((t) =>
          [t.fullName, t.nickname, t.code, t.cpf].some((v) => (v ?? "").toLowerCase().includes(q)),
        );

    const byFarm = farmFilter ? filtered.filter((t) => t.stints.some((stint) => !stint.endAt && stint.farmId === farmFilter)) : filtered;
    return byFarm.map((tapper) => ({
      tapper,
      personId: resolveTapperPersonId(tapper, peopleMatch),
    }));
  }, [tappers, search, farmFilter, peopleMatch]);

  const del = useMutation({
    mutationFn: (id: string) => deleteTapper(id),
    onSuccess: () => {
      toast.success("Sangrador removido");
      qc.invalidateQueries({ queryKey: ["tappers", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const regularize = useMutation({
    mutationFn: async (tapper: TapperListItem) => {
      if (!companyId) throw new Error("Selecione uma empresa");
      if (!digits(tapper.cpf)) {
        throw new Error("Esse sangrador ainda não tem CPF. Cadastre o CPF no legado antes de enviar ao RH.");
      }
      return invitePerson({
        companyId,
        fullName: tapper.fullName,
        cpf: tapper.cpf ?? undefined,
        grantAccess: false,
      });
    },
    onSuccess: (person) => {
      toast.success("Cadastro-base criado no RH");
      qc.invalidateQueries({ queryKey: ["people", companyId] });
      setEditingUserId(person.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Sangradores"
        description="Lista operacional de sangradores. A ficha cadastral oficial fica no RH."
        actions={companyId ? (
          <div className="flex gap-2">
            <Link to="/usuarios" className="inline-flex">
              <Button variant="outline"><UserPlus className="mr-2 h-4 w-4" /> Portal de RH</Button>
            </Link>
          </div>
        ) : null}
      />

      {!isLoading && companies.length === 0 ? (
        <NoCompanyCard />
      ) : (
        <>
          <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />

          {companyId && (
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="mb-3">
                  <p className="text-sm font-semibold">Sangradores cadastrados no RH</p>
                  <p className="text-xs text-muted-foreground">
                    Vínculo de fazenda e consultor feito pelo Portal de RH. Separado da ficha operacional (lista abaixo), usada nos lançamentos de sangria.
                  </p>
                </div>
                {rhSangradores.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum sangrador vinculado por fazenda no RH ainda.</p>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {rhSangradores.map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-3 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{assignment.user?.fullName || assignment.user?.email || "Sem nome"}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatFarmLabel(assignment.farm) || "Sem fazenda"}{assignment.consultor ? ` · consultor: ${assignment.consultor.fullName || assignment.consultor.email}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => setPlotsTarget({
                              key: `rh:${assignment.userId}`,
                              name: assignment.user?.fullName || assignment.user?.email || "Sangrador",
                              farmIds: assignment.farm?.id ? [assignment.farm.id] : [],
                            })}
                          >
                            <ListTree className="mr-1 h-3.5 w-3.5" /> Talhões e tabelas
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingUserId(assignment.userId)}>
                            Abrir no RH
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {companyId && (
            <PreRegistrationsCard
              companyId={companyId}
              role="sangrador"
              roleLabel="sangrador"
              onApproved={(personId) => setEditingUserId(personId)}
            />
          )}

          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <div className="relative"><Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Buscar por nome, apelido, código ou CPF..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <SearchableSelect value={farmFilter} onChange={(value) => setFarmFilter(value === "all" ? "" : value)} placeholder="Todas as fazendas" options={[{ value: "all", label: "Todas as fazendas" }, ...farms.map((farm: any) => ({ value: farm.id, label: `${farm.name}${farm.code ? ` (${farm.code})` : ""}`, keywords: farm.code ?? "" }))]} />
          </div>

          {loadingList ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando...</CardContent></Card>
          ) : list.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
              Nenhum sangrador encontrado.
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.map(({ tapper, personId }) => {
                const current = tapper.stints.find((s) => !s.endAt);
                const inRh = !!personId;
                const rhFarms = personId ? rhFarmsByUserId.get(personId) : undefined;
                const farmLabel = formatFarmLabel(current?.farm)
                  ?? (rhFarms?.length ? `${rhFarms.join(", ")} (RH)` : null)
                  ?? "Sem fazenda vinculada";
                return (
                  <Card key={tapper.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
                          {tapper.photoUrl
                            ? <img src={tapper.photoUrl} alt={tapper.fullName} className="h-full w-full object-cover" />
                            : <HardHat className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{tapper.fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {tapper.nickname ? `"${tapper.nickname}" · ` : ""}{tapper.code ? `#${tapper.code} · ` : ""}
                            {tapper.contractType ?? "Sem contrato"}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={tapper.status === "ativo" ? "default" : "secondary"}>
                            {TAPPER_STATUS.find((s) => s.value === tapper.status)?.label ?? tapper.status}
                          </Badge>
                          <Badge variant={inRh ? "outline" : "secondary"} className="text-[10px]">
                            {inRh ? <><ShieldCheck className="mr-1 h-3 w-3" /> No RH</> : <><ShieldAlert className="mr-1 h-3 w-3" /> Fora do RH</>}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {farmLabel}</p>
                        <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {tapper.phone ?? "—"}</p>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                        <Stat label="Sangrias" value={String(tapper.stats.records)} />
                        <Stat label="Litros" value={fmt(tapper.stats.liters)} />
                        <Stat label="Kg seco" value={fmt(tapper.stats.dryKg)} />
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">Última atividade: {date(tapper.stats.lastDate)}</p>

                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm" variant="default"
                          onClick={() => setPlotsTarget({ key: tapper.id, name: tapper.fullName, farmIds: current?.farmId ? [current.farmId] : (personId ? (rhFarmIdsByUserId.get(personId) ?? []) : []) })}
                        >
                          <ListTree className="mr-1 h-3.5 w-3.5" /> Talhões e tabelas
                        </Button>
                        {inRh ? (
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditingUserId(personId)}>
                            Abrir no RH
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            disabled={regularize.isPending}
                            onClick={() => regularize.mutate(tapper)}
                          >
                            Enviar ao RH
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setToDelete(tapper)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {companyId && (
        <PersonEditor
          open={!!editingUserId}
          onOpenChange={(open) => !open && setEditingUserId(null)}
          userId={editingUserId}
          companyId={companyId}
        />
      )}

      {companyId && plotsTarget && (
        <TapperPlotsDialog
          open={!!plotsTarget}
          onOpenChange={(open) => !open && setPlotsTarget(null)}
          companyId={companyId}
          tapperKey={plotsTarget.key}
          tapperName={plotsTarget.name}
          farmIds={plotsTarget.farmIds}
        />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover sangrador?</AlertDialogTitle>
            <AlertDialogDescription>
              A ficha legada de <b>{toDelete?.fullName}</b> será arquivada. Os registros de sangria já lançados permanecem no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (toDelete) del.mutate(toDelete.id); setToDelete(null); }}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatFarmLabel(farm: { name: string; code: string | null } | null | undefined) {
  if (!farm) return "";
  return farm.code ? `${farm.code} · ${farm.name}` : farm.name;
}

function buildPeopleMatch(people: Person[]) {
  const byCpf = new Map<string, string>();
  const names = new Map<string, string[]>();

  for (const person of people) {
    const cpf = digits(person.cpf);
    if (cpf) byCpf.set(cpf, person.id);
    const name = norm(person.fullName);
    if (!name) continue;
    names.set(name, [...(names.get(name) ?? []), person.id]);
  }

  const uniqueByName = new Map<string, string>();
  for (const [name, ids] of names.entries()) {
    if (ids.length === 1) uniqueByName.set(name, ids[0]);
  }

  return { byCpf, uniqueByName };
}

function resolveTapperPersonId(
  tapper: TapperListItem,
  match: { byCpf: Map<string, string>; uniqueByName: Map<string, string> },
) {
  const cpf = digits(tapper.cpf);
  if (cpf && match.byCpf.has(cpf)) return match.byCpf.get(cpf) ?? null;
  return match.uniqueByName.get(norm(tapper.fullName)) ?? null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
