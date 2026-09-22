import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useState } from "react";

export type SearchableOption = { value: string; label: string; keywords?: string };

export function SearchableSelect({ value, onChange, options, placeholder = "Selecione", searchPlaceholder = "Buscar por nome ou código...", empty = "Nenhum resultado" }: { value: string; onChange: (value: string) => void; options: SearchableOption[]; placeholder?: string; searchPlaceholder?: string; empty?: string }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal"><span className="truncate">{selected?.label ?? placeholder}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0"><Command><CommandInput placeholder={searchPlaceholder} /><CommandList><CommandEmpty>{empty}</CommandEmpty>{options.map((option) => <CommandItem key={option.value} value={`${option.label} ${option.keywords ?? ""}`} onSelect={() => { onChange(option.value); setOpen(false); }}><Check className={cn("mr-2 h-4 w-4", selected?.value === option.value ? "opacity-100" : "opacity-0")} />{option.label}</CommandItem>)}</CommandList></Command></PopoverContent></Popover>;
}
