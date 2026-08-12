import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

export function PhoneInput({
  value,
  onChange,
  className,
  placeholder = "(00) 00000-0000",
  ...props
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
} & Omit<React.ComponentProps<"input">, "value" | "onChange">) {
  const [displayValue, setDisplayValue] = useState(value || "");

  useEffect(() => {
    setDisplayValue(maskPhone(value || ""));
  }, [value]);

  function maskPhone(v: string) {
    let d = v.replace(/\D/g, "");
    if (d.length > 11) d = d.slice(0, 11);

    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    onChange(raw);
  };

  return (
    <div className="relative flex items-center">
      <span className="absolute left-3 text-sm text-muted-foreground pointer-events-none">+55</span>
      <Input
        {...props}
        className={`pl-11 ${className}`}
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={15}
      />
    </div>
  );
}
