import { useMemo, useState } from "react";
import { Camera, Loader2, MapPin, MapPinOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { uploadFile } from "@/lib/api";
import { submitCheckin, type Coords } from "@/lib/field.functions";
import { distanceMeters } from "@/lib/geo";

const DEFAULT_RADIUS_M = 200;

export function CheckinSheet({
  open,
  onOpenChange,
  companyId,
  farmId,
  farmName,
  farmLat,
  farmLng,
  checkinRadiusM,
  plotId,
  taskId,
  coords,
  requireGeolocation = true,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  farmId?: string;
  farmName?: string;
  farmLat?: number | null;
  farmLng?: number | null;
  checkinRadiusM?: number | null;
  plotId?: string;
  taskId?: string;
  coords: Coords | null;
  // Admin desligou a exigência de geolocalização em Configurações (modo de
  // teste) — pula GPS obrigatório e o raio da fazenda, sem mexer na foto.
  requireGeolocation?: boolean;
  onDone: (stamp: { farmId?: string; plotId?: string; at: number }) => void;
}) {
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const radius = checkinRadiusM ?? DEFAULT_RADIUS_M;
  const distance = useMemo(() => {
    if (!coords || farmLat == null || farmLng == null) return null;
    return distanceMeters(coords.latitude, coords.longitude, farmLat, farmLng);
  }, [coords, farmLat, farmLng]);
  const outOfRange = requireGeolocation && distance != null && distance > radius;

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
    if (requireGeolocation && !coords) { toast.error("GPS não detectado"); return; }
    if (outOfRange) {
      toast.error(`Você está a ${Math.round(distance!)}m da fazenda. Aproxime-se para fazer o check-in.`);
      return;
    }
    if (!photoUrl) { toast.error("Tire uma foto da propriedade"); return; }
    setSaving(true);
    try {
      const res = await submitCheckin({
        companyId,
        farmId,
        plotId,
        taskId,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        accuracyM: coords?.accuracyM,
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
          {!requireGeolocation && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs font-medium text-warning">
              Validação de geolocalização desligada em Configurações — GPS e raio da fazenda não são exigidos agora.
            </div>
          )}

          <div
            className={`flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
              !coords
                ? "border-muted-foreground/30 bg-muted text-muted-foreground"
                : outOfRange
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-primary/40 bg-primary/10 text-primary"
            }`}
          >
            {!coords ? <MapPin className="h-3.5 w-3.5" /> : outOfRange ? <MapPinOff className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
            {!coords
              ? "Obtendo localização…"
              : `GPS ativo${coords.accuracyM ? ` · ${Math.round(coords.accuracyM)}m` : ""}`}
          </div>

          {requireGeolocation && coords && distance != null && (
            outOfRange ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                Você está a <strong>{Math.round(distance)}m</strong> da fazenda{farmName ? ` ${farmName}` : ""}.
                Aproxime-se para fazer o check-in (raio liberado: {radius}m).
              </div>
            ) : (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
                Você está dentro da área de check-in ({Math.round(distance)}m da fazenda, raio de {radius}m).
              </div>
            )
          )}

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
            disabled={saving || uploading || (requireGeolocation && !coords) || !photoUrl || outOfRange}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar check-in
          </Button>

          {requireGeolocation && (
            <p className="text-center text-[11px] text-muted-foreground">
              Você precisa estar dentro do raio de check-in da fazenda para confirmar.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
