import { ArrowLeft, Check } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export function StepHeader({
  title,
  step,
  steps,
  onBack,
}: {
  title: string;
  step: number;
  steps: string[];
  onBack?: () => void;
}) {
  const nav = useNavigate();
  return (
    <div className="mb-4 space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => (onBack ? onBack() : nav({ to: "/campo" }))}
          className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-card text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="flex-1 text-center text-base font-semibold">{title}</h1>
        <div className="h-9 w-9" />
      </div>
      <ol className="flex items-center gap-1">
        {steps.map((label, i) => {
          const idx = i + 1;
          const done = idx < step;
          const active = idx === step;
          return (
            <li key={label} className="flex flex-1 items-center gap-1">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  done ? "bg-primary text-primary-foreground" :
                  active ? "bg-primary/15 text-primary ring-2 ring-primary" :
                  "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : idx}
              </div>
              <span className={`hidden text-[11px] font-medium sm:inline ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
              {idx < steps.length && <div className={`h-px flex-1 ${done ? "bg-primary" : "bg-border"}`} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function FieldCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border/60 bg-card p-4 ${className}`}>{children}</div>;
}
