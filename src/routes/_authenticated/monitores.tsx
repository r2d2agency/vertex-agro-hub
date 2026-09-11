import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/vertex/page-header";
import { PersonEditor } from "@/components/vertex/person-editor";
import { PreRegistrationsCard } from "@/components/vertex/pre-registrations-card";
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

export const Route = createFileRoute("/_authenticated/monitores")({
  head: () => ({
    meta: [
      { title: "Monitores — Vertex Agro" },
      { name: "description", content: "Monitores de campo com filtro por fazenda e consultor." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MonitoresPage,
});

function MonitoresPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const [search, setSearch] = useState("");
  const [farmFilter, setFarmFilter] = useState("");
  const [consultorFilter, setConsultorFilter] = useState("");
  const [selected, setSelected] = useState<Person | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const { data: people = [], isLoading: loadingPeople } = useQuery({
    queryKey: ["people", companyId],
    queryFn: () => listPeople(companyId!),
    enabled: !!companyId,
  });
  const { data: farms = [] } = useQuery({
    queryKey: ["farms", companyId],
    queryFn: () => listFarms(companyId!),
    enabled: !!companyId,
  });
  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ["company-assignments", companyId],
    queryFn: () => listCompanyAssignments(companyId!, { history: false }),
    enabled: !!companyId,
  });

  const consultants = people.filter((person) => person.roles.includes("consultor"));
  const monitorAssignments = assignments.filter((assignment) => assignment.role === "monitor");

  const monitors = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people
      .filter((person) => person.roles.includes("monitor"))
      .filter((person) => {
        const matchesSearch = !q || (person.fullName ?? "").toLowerCase().includes(q) || (person.email ?? "").toLowerCase().includes(q);
        if (!matchesSearch) return false;
        const activeAssignments = monitorAssignments.filter((assignment) => assignment.userId === person.id);
        if (farmFilter && !activeAssignments.some((assignment) => assignment.farmId === farmFilter)) return false;
        if (consultorFilter && !activeAssignments.some((assignment) => assignment.consultorUserId === consultorFilter)) return false;
        return true;
      });
  }, [people, search, farmFilter, consultorFilter, monitorAssignments]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Monitores"
        description="Lista operacional de monitores. O cadastro nasce no RH; aqui você apenas filtra e ajusta fazenda e consultor."
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
          <PreRegistrationsCard
            companyId={companyId}
            role="monitor"
            roleLabel="monitor"
            onApproved={(personId) => setEditingUserId(personId)}
          />

          <div className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder="Buscar monitor por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={farmFilter || "all"} onValueChange={(value) => setFarmFilter(value === "all" ? "" : value)}>
              <SelectTrigger><SelectValue placeholder="Filtrar por fazenda" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as fazendas</SelectItem>
                {farms.map((farm) => <SelectItem key={farm.id} value={farm.id}>{farm.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={consultorFilter || "all"} onValueChange={(value) => setConsultorFilter(value === "all" ? "" : value)}>
              <SelectTrigger><SelectValue placeholder="Filtrar por consultor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os consultores</SelectItem>
                {consultants.map((consultant) => (
                  <SelectItem key={consultant.id} value={consultant.id}>
                    {consultant.fullName || consultant.email || "Consultor"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingPeople || loadingAssignments ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando...</CardContent></Card>
          ) : monitors.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Nenhum monitor encontrado com os filtros atuais.</CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {monitors.map((monitor) => {
                const activeAssignments = monitorAssignments.filter((assignment) => assignment.userId === monitor.id);
                const farmsLabel = activeAssignments.map((assignment) => assignment.farm?.name).filter(Boolean);
                const consultantsLabel = activeAssignments.map((assignment) => assignment.consultor?.fullName || assignment.consultor?.email).filter(Boolean);
                return (
                  <Card key={monitor.id} className="transition-colors hover:border-primary/40">
                    <CardContent className="space-y-4 p-5">
                      <div className="space-y-1">
                        <p className="truncate font-semibold">{monitor.fullName || monitor.email || "Monitor sem nome"}</p>
                        <p className="truncate text-xs text-muted-foreground">{monitor.email || "Sem e-mail de acesso"}</p>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline"><MapPin className="mr-1 h-3 w-3" /> {activeAssignments.length} vínculo(s)</Badge>
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="truncate">Fazendas: {farmsLabel.length > 0 ? farmsLabel.join(", ") : "Sem fazenda definida"}</p>
                        <p className="truncate">Consultores: {consultantsLabel.length > 0 ? consultantsLabel.join(", ") : "Sem consultor definido"}</p>
                      </div>

                      <Button className="w-full" variant="outline" onClick={() => setSelected(monitor)}>
                        Editar vínculos
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <MonitorDialog
            monitor={selected}
            companyId={companyId}
            farms={farms}
            consultants={consultants}
            assignments={monitorAssignments}
            onClose={() => setSelected(null)}
          />

          <PersonEditor
            open={!!editingUserId}
            onOpenChange={(open) => !open && setEditingUserId(null)}
            userId={editingUserId}
            companyId={companyId}
          />
        </>
      )}
    </div>
  );
}

function MonitorDialog({
  monitor,
  companyId,
  farms,
  consultants,
  assignments,
  onClose,
}: {
  monitor: Person | null;
  companyId: string;
  farms: Array<{ id: string; name: string }>;
  consultants: Person[];
  assignments: FarmAssignment[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [farmId, setFarmId] = useState("");
  const [consultorUserId, setConsultorUserId] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["company-assignments", companyId] });
    qc.invalidateQueries({ queryKey: ["people", companyId] });
  };

  const addAssignment = useMutation({
    mutationFn: () =>
      createPersonAssignment(monitor!.id, {
        companyId,
        farmId,
        role: "monitor",
        consultorUserId: consultorUserId || undefined,
        startAt: new Date().toISOString().slice(0, 10),
      }),
    onSuccess: () => {
      toast.success("Vínculo do monitor atualizado");
      setFarmId("");
      setConsultorUserId("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const endAssignment = useMutation({
    mutationFn: (assignmentId: string) => endPersonAssignment(monitor!.id, assignmentId, companyId),
    onSuccess: () => {
      toast.success("Vínculo encerrado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!monitor) return null;

  const activeAssignments = assignments.filter((assignment) => assignment.userId === monitor.id);

  return (
    <Dialog open={!!monitor} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{monitor.fullName || monitor.email || "Monitor"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          <section className="space-y-3">
            <div>
              <p className="text-sm font-medium">Novo vínculo operacional</p>
              <p className="text-xs text-muted-foreground">Defina a fazenda e o consultor responsável por este monitor.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Fazenda</Label>
                <Select value={farmId || "none"} onValueChange={(value) => setFarmId(value === "none" ? "" : value)}>
                  <SelectTrigger><SelectValue placeholder="Selecione a fazenda" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione</SelectItem>
                    {farms.map((farm) => <SelectItem key={farm.id} value={farm.id}>{farm.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Consultor</Label>
                <Select value={consultorUserId || "none"} onValueChange={(value) => setConsultorUserId(value === "none" ? "" : value)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o consultor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem consultor</SelectItem>
                    {consultants.map((consultant) => (
                      <SelectItem key={consultant.id} value={consultant.id}>
                        {consultant.fullName || consultant.email || "Consultor"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button disabled={!farmId || addAssignment.isPending} onClick={() => addAssignment.mutate()}>
              Salvar vínculo
            </Button>
          </section>

          <section className="space-y-3">
            <div>
              <p className="text-sm font-medium">Vínculos atuais</p>
              <p className="text-xs text-muted-foreground">Você pode encerrar e recriar o vínculo quando precisar trocar fazenda ou consultor.</p>
            </div>

            {activeAssignments.length === 0 ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Este monitor ainda não possui vínculo ativo.</CardContent></Card>
            ) : (
              <div className="grid gap-2">
                {activeAssignments.map((assignment) => (
                  <Card key={assignment.id}>
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="space-y-1">
                        <p className="font-medium">{assignment.farm?.name ?? "Sem fazenda"}</p>
                        <p className="text-xs text-muted-foreground">
                          <Users className="mr-1 inline h-3 w-3" />
                          {assignment.consultor?.fullName || assignment.consultor?.email || "Sem consultor"}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => endAssignment.mutate(assignment.id)}>
                        Encerrar
                      </Button>
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
