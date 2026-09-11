import { useState } from "react";
import { Camera, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { uploadFile } from "@/lib/api";
import { submitCheckin, type Coords } from "@/lib/field.functions";

export function CheckinSheet({
  open,
  onOpenChange,
  companyId,
  farmId,
  farmName,
  plotId,
  taskId,
  coords,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  farmId?: string;
  farmName?: string;
  plotId?: string;
  taskId?: string;
  coords: Coords | null;
  onDone: (stamp: { farmId?: string; plotId?: string; at: number }) => void;
}) {
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onPick(f: File | null) {
    if (!f) return;
    setUploading(true);
    try {
      const r = await uploadFile(f);
      setPhotoUrl(r.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar foto");
    } finally {
      setUploading(false);
    }
  }

  async function confirm() {
    if (!coords) { toast.error("GPS não detectado"); return; }
    if (!photoUrl) { toast.error("Tire uma foto da propriedade"); return; }
    setSaving(true);
    try {
      const res = await submitCheckin({
        companyId,
        farmId,
        plotId,
        taskId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracyM: coords.accuracyM,
        photoUrl,
        strict: true,
      });
      const stamp = { farmId, plotId, at: Date.now() };
      sessionStorage.setItem("vertex.field.checkin.v1", JSON.stringify(stamp));
      toast.success(res.queued ? "Check-in salvo (offline)" : "Check-in registrado");
      setPhotoUrl("");
      onOpenChange(false);
      onDone(stamp);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar check-in");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl border-border/60 bg-card">
        <SheetHeader>
          <SheetTitle className="text-left">Check-in{farmName ? ` — ${farmName}` : ""}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4 pb-6">
          <div
            className={`flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
              coords ? "border-primary/40 bg-primary/10 text-primary" : "border-muted-foreground/30 bg-muted text-muted-foreground"
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            {coords ? `GPS ativo${coords.accuracyM ? ` · ${Math.round(coords.accuracyM)}m` : ""}` : "Obtendo localização…"}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Foto da propriedade *</label>
            {photoUrl ? (
              <img src={photoUrl} alt="Propriedade" className="h-32 w-full rounded-xl border border-border/60 object-cover" />
            ) : (
              <label className="grid h-32 w-full cursor-pointer place-items-center rounded-xl border border-dashed border-border/60 bg-background/40 text-muted-foreground hover:border-primary hover:text-primary">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                <span className="mt-1 text-xs">{uploading ? "Enviando..." : "Tirar foto"}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => onPick(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>

          <Button
            className="h-12 w-full rounded-xl text-base font-semibold"
            onClick={confirm}
            disabled={saving || uploading || !coords || !photoUrl}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar check-in
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            Você precisa estar dentro do raio de check-in da fazenda para confirmar.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
