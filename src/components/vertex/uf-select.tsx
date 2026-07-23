import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BRAZIL_UFS } from "@/lib/uf";

export function UfSelect({
  value,
  onChange,
  placeholder = "Selecione o UF",
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent className="max-h-72">
        {BRAZIL_UFS.map((u) => (
          <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
