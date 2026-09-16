const TONE_ACTIVE: Record<string, string> = {
  primary: "border-primary bg-primary/15 text-primary",
  warning: "border-warning bg-warning/15 text-warning",
  destructive: "border-destructive bg-destructive/15 text-destructive",
};

export function ChipToggle({
  active, label, tone = "primary", onClick, className = "",
}: {
  active: boolean;
  label: React.ReactNode;
  tone?: "primary" | "warning" | "destructive";
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 rounded-xl border text-xs font-semibold transition ${
        active ? TONE_ACTIVE[tone] : "border-border/60 bg-background/40 text-muted-foreground"
      } ${className}`}
    >
      {label}
    </button>
  );
}
