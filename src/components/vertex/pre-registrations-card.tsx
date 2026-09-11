import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ArchiveX, Clock3 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listTapperPreRegistrations,
  reviewTapperPreRegistration,
  type PreRegistrationRole,
  type TapperPreRegistration,
} from "@/lib/tappers.functions";
import { invitePerson } from "@/lib/people.functions";

export function PreRegistrationsCard({
  companyId,
  role,
  roleLabel,
  onApproved,
}: {
  companyId: string;
  role: PreRegistrationRole;
  roleLabel: string;
  onApproved?: (personId: string) => void;
}) {
  const qc = useQueryClient();
  const queryKey = ["pre-registrations", companyId, role];

  const { data: items = [] } = useQuery({
    queryKey,
    queryFn: () => listTapperPreRegistrations(companyId, { role }),
    enabled: !!companyId,
  });

  const approve = useMutation({
    mutationFn: async (item: TapperPreRegistration) => {
      const person = await invitePerson({
        companyId,
        fullName: item.fullName,
        cpf: item.cpf,
        rg: item.rg ?? undefined,
        birthDate: item.birthDate ?? undefined,
        phone: item.phone ?? undefined,
        addressCity: item.addressCity ?? undefined,
        addressState: item.addressState ?? undefined,
        notes: item.notes ?? undefined,
        role,
        grantAccess: false,
      });
      await reviewTapperPreRegistration(item.id, {
        companyId,
        status: "approved",
        personId: person.id,
        reviewNotes: "Cadastro-base criado no RH a partir do pré-cadastro provisório.",
      });
      return person;
    },
    onSuccess: (person) => {
      toast.success("Pré-cadastro validado e enviado ao RH");
      qc.invalidateQueries({ queryKey: ["people", companyId] });
      qc.invalidateQueries({ queryKey });
      onApproved?.(person.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: (item: TapperPreRegistration) =>
      reviewTapperPreRegistration(item.id, {
        companyId,
        status: "rejected",
        reviewNotes: "Pré-cadastro arquivado pelo administrativo.",
      }),
    onSuccess: () => {
      toast.success("Pré-cadastro arquivado");
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!companyId) return null;

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Pré-cadastros provisórios do consultor</p>
            <p className="text-xs text-muted-foreground">
              O consultor envia a solicitação pelo app de campo e o RH valida aqui antes de transformar em cadastro-base.
            </p>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Clock3 className="h-3 w-3" />
            {items.length} pendente(s)
          </Badge>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum pré-cadastro de {roleLabel} pendente nesta empresa.</p>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-border/60 bg-background p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      CPF {item.cpf} {item.farmName ? `· Fazenda ${item.farmName}` : ""} {item.requestedByName ? `· Enviado por ${item.requestedByName}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.phone || "Sem telefone"} {item.contractType ? `· ${item.contractType}` : ""} {item.addressCity ? `· ${item.addressCity}/${item.addressState ?? "—"}` : ""}
                    </p>
                    {(item.treesAssigned != null || item.taskPercent != null) && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Tarefa: {item.treesAssigned ?? "—"} árvores {item.taskPercent != null ? `· ${item.taskPercent}%` : ""}
                      </p>
                    )}
                    {(item.rgPhotoUrl || item.cpfPhotoUrl) && (
                      <p className="mt-1 flex gap-3 text-xs">
                        {item.rgPhotoUrl && <a href={item.rgPhotoUrl} target="_blank" rel="noreferrer" className="text-primary underline">Foto do RG</a>}
                        {item.cpfPhotoUrl && <a href={item.cpfPhotoUrl} target="_blank" rel="noreferrer" className="text-primary underline">Foto do CPF</a>}
                      </p>
                    )}
                    {item.notes && <p className="mt-2 text-xs text-muted-foreground">{item.notes}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="gap-1"
                      disabled={approve.isPending}
                      onClick={() => approve.mutate(item)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Criar no RH
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={reject.isPending}
                      onClick={() => reject.mutate(item)}
                    >
                      <ArchiveX className="h-4 w-4" />
                      Arquivar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
