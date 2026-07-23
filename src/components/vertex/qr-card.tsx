import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function QrCard({
  title,
  description,
  url,
}: {
  title: string;
  description?: string;
  url: string;
}) {
  const [svg, setSvg] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    QRCode.toString(url, { type: "svg", margin: 1, width: 220, color: { dark: "#0f172a", light: "#ffffff" } })
      .then((s) => { if (alive) setSvg(s); })
      .catch(() => { if (alive) setSvg(""); });
    return () => { alive = false; };
  }, [url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="rounded-lg border bg-white p-3" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="flex w-full items-center gap-2">
          <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{url}</code>
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
            Copiar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
