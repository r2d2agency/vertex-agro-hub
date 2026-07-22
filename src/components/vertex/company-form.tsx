import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCompany, updateCompany } from "@/lib/companies.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export type CompanyFormValues = {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  email: string;
  telefone: string;
  responsavel: string;
  endereco: string;
  cidade: string;
  estado: string;
  observacoes: string;
  status: "ativa" | "inativa" | "bloqueada";
};

const empty: CompanyFormValues = {
  razao_social: "",
  nome_fantasia: "",
  cnpj: "",
  email: "",
  telefone: "",
  responsavel: "",
  endereco: "",
  cidade: "",
  estado: "",
  observacoes: "",
  status: "ativa",
};

export function CompanyForm({
  id,
  initial,
}: {
  id?: string;
  initial?: Partial<CompanyFormValues>;
}) {
  const [values, setValues] = useState<CompanyFormValues>({ ...empty, ...initial });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (id) return updateCompany({ id, values });
      return createCompany(values);
    },
    onSuccess: () => {
      toast.success(id ? "Empresa atualizada" : "Empresa criada");
      qc.invalidateQueries({ queryKey: ["companies"] });
      navigate({ to: "/empresas" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function set<K extends keyof CompanyFormValues>(k: K, v: CompanyFormValues[K]) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!values.razao_social.trim()) return toast.error("Razão social é obrigatória");
        mutation.mutate();
      }}
    >
      <Card>
        <CardContent className="grid gap-5 p-6 md:grid-cols-2">
          <Field label="Razão social *" required>
            <Input value={values.razao_social} onChange={(e) => set("razao_social", e.target.value)} required />
          </Field>
          <Field label="Nome fantasia">
            <Input value={values.nome_fantasia} onChange={(e) => set("nome_fantasia", e.target.value)} />
          </Field>
          <Field label="CNPJ">
            <Input value={values.cnpj} onChange={(e) => set("cnpj", e.target.value)} />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={values.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Telefone">
            <Input value={values.telefone} onChange={(e) => set("telefone", e.target.value)} />
          </Field>
          <Field label="Responsável">
            <Input value={values.responsavel} onChange={(e) => set("responsavel", e.target.value)} />
          </Field>
          <Field label="Endereço" full>
            <Input value={values.endereco} onChange={(e) => set("endereco", e.target.value)} />
          </Field>
          <Field label="Cidade">
            <Input value={values.cidade} onChange={(e) => set("cidade", e.target.value)} />
          </Field>
          <Field label="Estado (UF)">
            <Input maxLength={2} value={values.estado} onChange={(e) => set("estado", e.target.value.toUpperCase())} />
          </Field>
          <Field label="Status">
            <Select value={values.status} onValueChange={(v) => set("status", v as CompanyFormValues["status"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="inativa">Inativa</SelectItem>
                <SelectItem value="bloqueada">Bloqueada</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Observações" full>
            <Textarea rows={3} value={values.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => navigate({ to: "/empresas" })}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
  required?: boolean;
}) {
  return (
    <div className={full ? "md:col-span-2" : undefined}>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  );
}
