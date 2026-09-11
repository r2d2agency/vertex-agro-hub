import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function MiniCalendar({
  month,
  onMonthChange,
  countsByDate,
  selectedDate,
  onSelectDate,
}: {
  month: Date;
  onMonthChange: (m: Date) => void;
  countsByDate: Map<string, number>;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstWeekday = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);

  const cells: Array<{ date: string; day: number } | null> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ date, day: d });
  }

  const monthLabel = month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(new Date(year, m - 1, 1))}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold capitalize">{monthLabel}</span>
        <button
          type="button"
          onClick={() => onMonthChange(new Date(year, m + 1, 1))}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
        {WEEKDAYS.map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <div key={`empty-${i}`} />;
          const count = countsByDate.get(c.date) ?? 0;
          const active = c.date === selectedDate;
          const isToday = c.date === todayStr;
          return (
            <button
              type="button"
              key={c.date}
              onClick={() => onSelectDate(c.date)}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-xs transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : isToday
                  ? "bg-primary/15 text-primary font-semibold"
                  : count > 0
                  ? "text-foreground hover:bg-muted"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {c.day}
              {count > 0 && (
                <span className={`h-1 w-1 rounded-full ${active ? "bg-primary-foreground" : "bg-primary"}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
