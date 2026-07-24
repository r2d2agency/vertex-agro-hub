// CSV helper — gera e força download no navegador.
export function downloadCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns: { key: keyof T | string; label: string; format?: (v: any, row: T) => string }[],
) {
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => esc(c.label)).join(";");
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const raw = (row as any)[c.key];
          return esc(c.format ? c.format(raw, row) : raw);
        })
        .join(";"),
    )
    .join("\n");
  const csv = "\uFEFF" + header + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const fmtDateBR = (d?: string | null) =>
  d ? d.slice(0, 10).split("-").reverse().join("/") : "";
