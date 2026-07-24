import { useRef, useState, type DragEvent } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadFile } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  value?: string | null;
  onUploaded: (url: string, meta: { originalName: string; mime: string; size: number }) => void;
  onClear?: () => void;
  accept?: string;
  label?: string;
  preview?: "image" | "file";
  className?: string;
};

export function FileDropzone({
  value, onUploaded, onClear,
  accept = "image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt",
  label = "Arraste um arquivo ou clique para selecionar",
  preview = "file",
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const res = await uploadFile(file);
      onUploaded(res.url, { originalName: res.originalName, mime: res.mime, size: res.size });
      toast.success("Arquivo enviado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDrag(false);
    if (busy) return;
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => !busy && inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center text-sm transition",
          drag ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/60",
          busy && "pointer-events-none opacity-60",
        )}
      >
        {busy ? (
          <><Loader2 className="h-5 w-5 animate-spin" /> <span>Enviando...</span></>
        ) : (
          <><Upload className="h-5 w-5 text-muted-foreground" /> <span className="text-muted-foreground">{label}</span></>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {value && preview === "image" && (
        <div className="relative w-fit">
          <img src={value} alt="preview" className="h-24 w-24 rounded-md border object-cover" />
          {onClear && (
            <Button type="button" variant="secondary" size="icon" className="absolute -right-2 -top-2 h-6 w-6" onClick={onClear}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
      {value && preview === "file" && (
        <a href={value} target="_blank" rel="noreferrer" className="truncate text-xs text-primary hover:underline">
          {value}
        </a>
      )}
    </div>
  );
}
