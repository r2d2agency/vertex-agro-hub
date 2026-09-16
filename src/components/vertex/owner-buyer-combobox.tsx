import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { listOwners, listBuyers, type OwnerRef, type BuyerRef } from "@/lib/fazendas.functions";

type Item = OwnerRef | BuyerRef;

export function OwnerBuyerCombobox({
  kind,
  companyId,
  value,
  onChange,
  placeholder = "Buscar...",
  className,
}: {
  kind: "owner" | "buyer";
  companyId: string;
  value?: { id: string; name: string } | null;
  onChange: (item: Item | null) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !companyId) return;
    setLoading(true);
    const t = setTimeout(() => {
      const fetcher = kind === "owner" ? listOwners : listBuyers;
      fetcher(companyId, query.trim() || undefined)
        .then(setItems)
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [open, companyId, query, kind]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-11 w-full justify-between rounded-xl font-normal", !value && "text-muted-foreground", className)}
        >
          <span className="truncate">{value?.name ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
              </div>
            ) : (
              <>
                <CommandEmpty>Nenhum resultado.</CommandEmpty>
                <CommandGroup>
                  {value && (
                    <CommandItem
                      value={`__clear__${value.id}`}
                      onSelect={() => { onChange(null); setOpen(false); }}
                      className="text-muted-foreground"
                    >
                      Limpar seleção
                    </CommandItem>
                  )}
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => { onChange(item); setOpen(false); }}
                    >
                      <Check className={cn("h-4 w-4", value?.id === item.id ? "opacity-100" : "opacity-0")} />
                      <div className="min-w-0">
                        <div className="truncate">{item.name}</div>
                        {item.code && <div className="truncate text-xs text-muted-foreground">Código: {item.code}</div>}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
