import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Search, Tractor, UserCog, UserPlus, Wrench } from "lucide-react";
import { PageHeader } from "@/components/vertex/page-header";
import { PersonEditor } from "@/components/vertex/person-editor";
import { PreRegistrationsCard } from "@/components/vertex/pre-registrations-card";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { listPeople, type Person } from "@/lib/people.functions";
import { listImplements, listMachines, updateImplement, updateMachine, type Implement, type Machine } from "@/lib/frota.functions";

export const Route = createFileRoute("/_authenticated/operadores")({
  head: () => ({ meta: [
    { title: "Operadores — Vertex Agro" },
    { name: "description", content: "Vínculos operacionais de operadores cadastrados no RH." },
    { name: "robots", content: "noindex" },
  ] }),
  component: OperatorsPage,
});

function OperatorsPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedOperator, setSelectedOperator] = useState<Person | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const { data: people = [], isLoading: loadingPeople } = useQuery({
    queryKey: ["people", companyId],
    queryFn: () => listPeople(companyId!),
    enabled: !!companyId,
  });

  const { data: machines = [], isLoading: loadingMachines } = useQuery({
    queryKey: ["machines", companyId],
    queryFn: () => listMachines(companyId!),
    enabled: !!companyId,
  });

  const { data: implementsData = [], isLoading: loadingImplements } = useQuery({
    queryKey: ["implements", companyId],
    queryFn: () => listImplements(companyId!),
    enabled: !!companyId,
  });

  const operators = useMemo(
    () => people.filter((person) => person.roles.includes("operador")),
    [people],
  );

  const operatorNames = useMemo(
    () => new Map(operators.map((person) => [person.id, person.fullName ?? "Sem nome"])),
    [operators],
  );

  const machineCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const machine of machines) {
      if (!machine.defaultOperatorId) continue;
      counts.set(machine.defaultOperatorId, (counts.get(machine.defaultOperatorId) ?? 0) + 1);
    }
    return counts;
  }, [machines]);

  const implementCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const implementItem of implementsData) {
      if (!implementItem.responsibleUserId) continue;
      counts.set(implementItem.responsibleUserId, (counts.get(implementItem.responsibleUserId) ?? 0) + 1);
    }
    return counts;
  }, [implementsData]);

  const filteredOperators = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return operators;
    return operators.filter((person) =>
      [person.fullName, person.cpf, person.phone, person.email].some((value) =>
        (value ?? "").toLowerCase().includes(term),
      ),
    );
  }, [operators, search]);

  const loading = loadingPeople || loadingMachines || loadingImplements;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Operadores"
        description="O cadastro do operador fica no RH. Aqui voce so define quais maquinas e implementos ficam sob responsabilidade dele."
        actions={companyId && (
          <Link to="/usuarios">
            <Button variant="outline"><UserPlus className="mr-2 h-4 w-4" /> Portal de RH</Button>
          </Link>
        )}
      />

      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <>
          <PreRegistrationsCard
            companyId={companyId}
            role="operador"
            roleLabel="operador"
            onApproved={(personId) => setEditingUserId(personId)}
          />

          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            Operadores sao cadastrados na central de RH. Para aparecer aqui, a pessoa precisa estar vinculada a esta empresa com o papel `operador`.
          </div>

          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar operador por nome, CPF, telefone ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando...</CardContent></Card>
          ) : operators.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                Nenhum operador foi encontrado no RH para esta empresa.
              </CardContent>
            </Card>
          ) : filteredOperators.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                Nenhum operador corresponde ao filtro informado.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredOperators.map((operator) => (
                <Card key={operator.id} className="transition-colors hover:border-primary/40">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <UserCog className="h-4 w-4 text-primary" />
                          <p className="truncate font-semibold">{operator.fullName || "Sem nome"}</p>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {operator.cpf ? `CPF: ${operator.cpf}` : "CPF nao informado"}
                          {operator.phone ? ` · ${operator.phone}` : ""}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge variant="outline">RH</Badge>
                          {operator.hasAccess ? <Badge variant="outline">Com acesso</Badge> : <Badge variant="secondary">Base RH</Badge>}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                          <SummaryCard icon={<Tractor className="h-3.5 w-3.5" />} label="Maquinas" value={machineCounts.get(operator.id) ?? 0} />
                          <SummaryCard icon={<Wrench className="h-3.5 w-3.5" />} label="Implementos" value={implementCounts.get(operator.id) ?? 0} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Button className="w-full" variant="outline" onClick={() => setSelectedOperator(operator)}>
                        Gerenciar vinculos
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <OperatorLinksDialog
        open={!!selectedOperator}
        onOpenChange={(open) => !open && setSelectedOperator(null)}
        companyId={companyId}
        operator={selectedOperator}
        machines={machines}
        implementsData={implementsData}
        operatorNames={operatorNames}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["machines", companyId] });
          qc.invalidateQueries({ queryKey: ["implements", companyId] });
        }}
      />

      {companyId && (
        <PersonEditor
          open={!!editingUserId}
          onOpenChange={(open) => !open && setEditingUserId(null)}
          userId={editingUserId}
          companyId={companyId}
        />
      )}
    </div>
  );
}

function OperatorLinksDialog({
  open,
  onOpenChange,
  companyId,
  operator,
  machines,
  implementsData,
  operatorNames,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string | null;
  operator: Person | null;
  machines: Machine[];
  implementsData: Implement[];
  operatorNames: Map<string, string>;
  onSaved: () => void;
}) {
  const [machineIds, setMachineIds] = useState<string[]>([]);
  const [implementIds, setImplementIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !operator) return;
    setMachineIds(machines.filter((machine) => machine.defaultOperatorId === operator.id).map((machine) => machine.id));
    setImplementIds(implementsData.filter((implementItem) => implementItem.responsibleUserId === operator.id).map((implementItem) => implementItem.id));
  }, [open, operator, machines, implementsData]);

  const saveLinks = useMutation({
    mutationFn: async () => {
      if (!companyId || !operator) throw new Error("Selecione uma empresa e um operador");

      const currentMachineIds = new Set(machines.filter((machine) => machine.defaultOperatorId === operator.id).map((machine) => machine.id));
      const nextMachineIds = new Set(machineIds);
      const machineUpdates: Promise<unknown>[] = [];

      for (const machine of machines) {
        const shouldHaveOperator = nextMachineIds.has(machine.id);
        const hasOperator = currentMachineIds.has(machine.id);

        if (shouldHaveOperator && machine.defaultOperatorId !== operator.id) {
          machineUpdates.push(updateMachine(machine.id, { companyId, defaultOperatorId: operator.id }));
        } else if (!shouldHaveOperator && hasOperator) {
          machineUpdates.push(updateMachine(machine.id, { companyId, defaultOperatorId: null }));
        }
      }

      const currentImplementIds = new Set(implementsData.filter((implementItem) => implementItem.responsibleUserId === operator.id).map((implementItem) => implementItem.id));
      const nextImplementIds = new Set(implementIds);
      const implementUpdates: Promise<unknown>[] = [];

      for (const implementItem of implementsData) {
        const shouldHaveOperator = nextImplementIds.has(implementItem.id);
        const hasOperator = currentImplementIds.has(implementItem.id);

        if (shouldHaveOperator && implementItem.responsibleUserId !== operator.id) {
          implementUpdates.push(updateImplement(implementItem.id, { responsibleUserId: operator.id }));
        } else if (!shouldHaveOperator && hasOperator) {
          implementUpdates.push(updateImplement(implementItem.id, { responsibleUserId: null }));
        }
      }

      await Promise.all([...machineUpdates, ...implementUpdates]);
    },
    onSuccess: () => {
      toast.success("Vinculos do operador atualizados");
      onSaved();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!operator) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Vinculos de {operator.fullName || "operador"}</DialogTitle>
          <DialogDescription>
            O cadastro principal continua no RH. Aqui voce define apenas as maquinas e os implementos vinculados a esse operador.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Tractor className="h-4 w-4 text-primary" />
              <h3 className="font-medium">Maquinas</h3>
            </div>
            <div className="max-h-[360px] space-y-2 overflow-y-auto rounded-md border p-3">
              {machines.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma maquina cadastrada.</p>
              ) : machines.map((machine) => {
                const currentOwner = machine.defaultOperatorId ? operatorNames.get(machine.defaultOperatorId) : null;
                return (
                  <label key={machine.id} className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
                    <Checkbox
                      checked={machineIds.includes(machine.id)}
                      onCheckedChange={(checked) => {
                        setMachineIds((current) =>
                          checked
                            ? Array.from(new Set([...current, machine.id]))
                            : current.filter((id) => id !== machine.id),
                        );
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{machine.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {machine.category} {machine.plate ? `· ${machine.plate}` : ""} {machine.farmId ? `· fazenda vinculada` : ""}
                      </p>
                      {currentOwner && machine.defaultOperatorId !== operator.id && (
                        <p className="mt-1 text-[11px] text-amber-700">Atualmente vinculada a: {currentOwner}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              <h3 className="font-medium">Implementos</h3>
            </div>
            <div className="max-h-[360px] space-y-2 overflow-y-auto rounded-md border p-3">
              {implementsData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum implemento cadastrado.</p>
              ) : implementsData.map((implementItem) => {
                const currentOwner = implementItem.responsibleUserId ? operatorNames.get(implementItem.responsibleUserId) : null;
                return (
                  <label key={implementItem.id} className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
                    <Checkbox
                      checked={implementIds.includes(implementItem.id)}
                      onCheckedChange={(checked) => {
                        setImplementIds((current) =>
                          checked
                            ? Array.from(new Set([...current, implementItem.id]))
                            : current.filter((id) => id !== implementItem.id),
                        );
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{implementItem.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {implementItem.category} {implementItem.machineId ? "· ja vinculado a uma maquina" : ""}
                      </p>
                      {currentOwner && implementItem.responsibleUserId !== operator.id && (
                        <p className="mt-1 text-[11px] text-amber-700">Atualmente vinculado a: {currentOwner}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" onClick={() => saveLinks.mutate()} disabled={saveLinks.isPending}>
            {saveLinks.isPending ? "Salvando..." : "Salvar vinculos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <div className="flex items-center gap-1 text-[11px] uppercase text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}
