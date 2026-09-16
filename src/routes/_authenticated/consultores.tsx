import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, MapPin, Trees, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/vertex/page-header";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listFarms } from "@/lib/fazendas.functions";
import {
  createPersonAssignment,
  endPersonAssignment,
  listCompanyAssignments,
  listPeople,
  type FarmAssignment,
  type Person,
} from "@/lib/people.functions";

export const Route = createFileRoute("/_authenticated/consultores")({
  head: () => ({
    meta: [
      { title: "Consultores — Vertex Agro" },
      { name: "description", content: "Gestão dos consultores e das fazendas administradas." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConsultoresPage,
});

function ConsultoresPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Person | null>(null);

  const { data: people = [], isLoading: loadingPeople } = useQuery({
    queryKey: ["people", companyId],
    queryFn: () => listPeople(companyId!),
    enabled: !!companyId,
  });
  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ["company-assignments", companyId],
    queryFn: () => listCompanyAssignments(companyId!, { history: false }),
    enabled: !!companyId,
  });
  const consultants = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people
      .filter((person) => person.roles.includes("consultor"))
      .filter((person) => {
        if (!q) return true;
        return (person.fullName ?? "").toLowerCase().includes(q) || (person.email ?? "").toLowerCase().includes(q);
      });
  }, [people, search]);

  const consultantAssignments = assignments.filter((assignment) => assignment.role === "consultor");
  const monitorAssignments = assignments.filter((assignment) => assignment.role === "monitor");
  const sangradorAssignments = assignments.filter((assignment) => assignment.role === "sangrador");

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Consultores"
        description="Gestão dos vínculos do gestor/consultor: fazendas administradas, sangradores e monitores de cada uma."
        actions={
          <Link to="/usuarios">
            <Button variant="outline"><UserPlus className="mr-2 h-4 w-4" /> Cadastro no RH</Button>
          </Link>
        }
      />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <>
          <div className="max-w-sm">
            <Input
              placeholder="Buscar consultor por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loadingPeople || loadingAssignments ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando...</CardContent></Card>
          ) : consultants.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Nenhum consultor vinculado a esta empresa.</CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {consultants.map((consultant) => {
                const farmsManaged = consultantAssignments.filter((item) => item.userId === consultant.id);
                const monitored = monitorAssignments.filter((item) => item.consultorUserId === consultant.id);
                const sangradores = sangradorAssignments.filter((item) => item.consultorUserId === consultant.id);
                return (
                  <Card key={consultant.id} className="transition-colors hover:border-primary/40">
                    <CardContent className="space-y-4 p-5">
                      <div className="space-y-1">
                        <p className="truncate font-semibold">{consultant.fullName || consultant.email || "Consultor sem nome"}</p>
                        <p className="truncate text-xs text-muted-foreground">{consultant.email || "Sem e-mail de acesso"}</p>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline"><Building2 className="mr-1 h-3 w-3" /> {farmsManaged.length} fazenda(s)</Badge>
                        <Badge variant="outline"><Trees className="mr-1 h-3 w-3" /> {sangradores.length} sangrador(es)</Badge>
                        <Badge variant="outline"><Users className="mr-1 h-3 w-3" /> {monitored.length} monitor(es)</Badge>
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground">
                        {farmsManaged.slice(0, 3).map((item) => (
                          <p key={item.id} className="truncate">
                            <MapPin className="mr-1 inline h-3 w-3" />
                            {formatFarmLabel(item.farm) || "Fazenda sem nome"}
                          </p>
                        ))}
                        {farmsManaged.length === 0 && <p>Nenhuma fazenda administrada.</p>}
                      </div>

                      <Button className="w-full" variant="outline" onClick={() => setSelected(consultant)}>
                        Gerenciar fazendas, sangradores e monitores
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <ConsultantDialog
            consultant={selected}
            companyId={companyId}
            assignments={consultantAssignments}
            monitorAssignments={monitorAssignments}
            sangradorAssignments={sangradorAssignments}
            onClose={() => setSelected(null)}
          />
        </>
      )}
    </div>
  );
}

function formatFarmLabel(farm: { name: string; code: string | null } | null) {
  if (!farm) return "";
  return farm.code ? `${farm.code} · ${farm.name}` : farm.name;
}

function ConsultantDialog({
  consultant,
  companyId,
  assignments,
  monitorAssignments,
  sangradorAssignments,
  onClose,
}: {
  consultant: Person | null;
  companyId: string;
  assignments: FarmAssignment[];
  monitorAssignments: FarmAssignment[];
  sangradorAssignments: FarmAssignment[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [farmId, setFarmId] = useState("");
  const { data: farms = [] } = useQuery({
    queryKey: ["farms", companyId],
    queryFn: () => listFarms(companyId),
    enabled: !!consultant,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["company-assignments", companyId] });
    qc.invalidateQueries({ queryKey: ["people", companyId] });
  };

  const addFarm = useMutation({
    mutationFn: () =>
      createPersonAssignment(consultant!.id, {
        companyId,
        farmId,
        role: "consultor",
        startAt: new Date().toISOString().slice(0, 10),
      }),
    onSuccess: () => {
      toast.success("Fazenda vinculada ao consultor");
      setFarmId("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const endFarm = useMutation({
    mutationFn: (assignmentId: string) => endPersonAssignment(consultant!.id, assignmentId, companyId),
    onSuccess: () => {
      toast.success("Vínculo encerrado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!consultant) return null;

  const activeFarms = assignments.filter((item) => item.userId === consultant.id);
  const administeredMonitors = monitorAssignments.filter((item) => item.consultorUserId === consultant.id);
  const administeredSangradores = sangradorAssignments.filter((item) => item.consultorUserId === consultant.id);

  return (
    <Dialog open={!!consultant} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{consultant.fullName || consultant.email || "Consultor"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          <section className="space-y-3">
            <div>
              <p className="text-sm font-medium">Fazendas administradas</p>
              <p className="text-xs text-muted-foreground">Uma fazenda pode ser administrada por mais de um consultor.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <div>
                <Label>Adicionar fazenda</Label>
                <Select value={farmId || "none"} onValueChange={(value) => setFarmId(value === "none" ? "" : value)}>
                  <SelectTrigger><SelectValue placeholder="Selecione a fazenda" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione</SelectItem>
                    {farms.map((farm) => (
                      <SelectItem key={farm.id} value={farm.id}>{farm.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button disabled={!farmId || addFarm.isPending} onClick={() => addFarm.mutate()}>
                  Vincular fazenda
                </Button>
              </div>
            </div>

            {activeFarms.length === 0 ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma fazenda vinculada.</CardContent></Card>
            ) : (
              <div className="grid gap-2">
                {activeFarms.map((assignment) => (
                  <Card key={assignment.id}>
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <p className="font-medium">{assignment.farm?.name ?? "Fazenda sem nome"}</p>
                        <p className="text-xs text-muted-foreground">Vínculo iniciado em {new Date(assignment.startAt).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => endFarm.mutate(assignment.id)}>
                        Encerrar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Sangradores administrados</p>
                <p className="text-xs text-muted-foreground">Mostra os sangradores que hoje respondem a este consultor.</p>
              </div>
              <Link to="/sangradores" className="shrink-0 text-xs text-primary underline">Gerenciar sangradores</Link>
            </div>
            {administeredSangradores.length === 0 ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhum sangrador vinculado a este consultor.</CardContent></Card>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {administeredSangradores.map((assignment) => (
                  <Card key={assignment.id}>
                    <CardContent className="space-y-1 p-4">
                      <p className="font-medium">{assignment.user?.fullName || assignment.user?.email || "Sangrador"}</p>
                      <p className="text-xs text-muted-foreground">
                        <Trees className="mr-1 inline h-3 w-3" />
                        {assignment.farm?.name ?? "Sem fazenda"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div>
              <p className="text-sm font-medium">Monitores administrados</p>
              <p className="text-xs text-muted-foreground">Mostra os monitores que hoje respondem a este consultor.</p>
            </div>
            {administeredMonitors.length === 0 ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhum monitor vinculado a este consultor.</CardContent></Card>
            ) : (
              <div className="grid gap-2">
                {administeredMonitors.map((assignment) => (
                  <Card key={assignment.id}>
                    <CardContent className="space-y-1 p-4">
                      <p className="font-medium">{assignment.user?.fullName || assignment.user?.email || "Monitor"}</p>
                      <p className="text-xs text-muted-foreground">
                        <Trees className="mr-1 inline h-3 w-3" />
                        {assignment.farm?.name ?? "Sem fazenda"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
