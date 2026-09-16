export function KindPill({
  active, label, tone, onClick,
}: {
  active: boolean;
  label: string;
  tone: "primary" | "chart-2" | "warning";
  onClick: () => void;
}) {
  const activeCls =
    tone === "primary" ? "bg-primary text-primary-foreground border-primary" :
    tone === "chart-2" ? "bg-chart-2 text-primary-foreground border-chart-2" :
    "bg-warning text-primary-foreground border-warning";
  return (
    <button type="button" onClick={onClick}
      className={`h-11 rounded-xl border text-sm font-semibold ${active ? activeCls : "border-border/60 bg-background/40 text-muted-foreground"}`}>
      {label}
    </button>
  );
}
