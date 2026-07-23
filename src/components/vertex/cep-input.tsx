import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCep, lookupCep, type ViaCepResult } from "@/lib/via-cep";

export type CepFilled = {
  cep: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export function CepInput({
  value,
  onChange,
  onFilled,
}: {
  value: string;
  onChange: (v: string) => void;
  onFilled: (data: CepFilled) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function fetchCep(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setLoading(true);
    const result: ViaCepResult | null = await lookupCep(digits);
    setLoading(false);
    if (!result) {
      toast.error("CEP não encontrado");
      return;
    }
    const enderecoParts = [result.logradouro, result.complemento].filter(Boolean).join(", ");
    onFilled({
      cep: formatCep(digits),
      endereco: enderecoParts,
      bairro: result.bairro ?? "",
      cidade: result.localidade ?? "",
      uf: result.uf ?? "",
    });
    toast.success("Endereço preenchido");
  }

  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => {
          const formatted = formatCep(e.target.value);
          onChange(formatted);
          if (formatted.replace(/\D/g, "").length === 8) fetchCep(formatted);
        }}
        onBlur={(e) => fetchCep(e.target.value)}
        placeholder="00000-000"
        maxLength={9}
        inputMode="numeric"
      />
      <Button type="button" variant="outline" size="icon" onClick={() => fetchCep(value)} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
      </Button>
    </div>
  );
}
