import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listCompanies, type Company } from "@/lib/companies.functions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Building2, Plus } from "lucide-react";

const STORAGE_KEY = "vertex_selected_company";

export function useSelectedCompany() {
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: listCompanies,
  });

  const [companyId, setCompanyIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    if (isLoading || companies.length === 0) return;
    if (!companyId || !companies.find((c) => c.id === companyId)) {
      const next = companies[0].id;
      setCompanyIdState(next);
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, [companies, companyId, isLoading]);

  function setCompanyId(id: string) {
    setCompanyIdState(id);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
  }

  return { companies, companyId, setCompanyId, isLoading };
}

export function CompanyPicker({
  companies,
  companyId,
  onChange,
}: {
  companies: Company[];
  companyId: string | null;
  onChange: (id: string) => void;
}) {
  if (companies.length === 0) return null;
  return (
    <div className="mb-4 flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Empresa:</span>
      <Select value={companyId ?? undefined} onValueChange={onChange}>
        <SelectTrigger className="w-72">
          <SelectValue placeholder="Selecione uma empresa" />
        </SelectTrigger>
        <SelectContent>
          {companies.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nome_fantasia || c.razao_social}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function NoCompanyCard() {
  return (
    <Card>
      <CardContent className="p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhuma empresa cadastrada. Crie uma empresa primeiro para acessar este módulo.
        </p>
        <Link to="/empresas/novo" className="mt-4 inline-block">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nova empresa
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
