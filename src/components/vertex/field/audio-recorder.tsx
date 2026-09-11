import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadFile } from "@/lib/api";

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
];

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

function extFor(mime: string | null) {
  if (!mime) return "webm";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// Gravador de áudio opcional (ex.: observação falada do monitor sobre a
// sangria) — grava com MediaRecorder, envia pro mesmo endpoint de upload de
// fotos e guarda só a URL.
export function AudioRecorder({ value, onChange }: { value?: string | null; onChange: (url: string | null) => void }) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  async function start() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Gravação de áudio não é suportada neste dispositivo");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMimeType();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        const blob = new Blob(chunksRef.current, { type: mime ?? "audio/webm" });
        setUploading(true);
        try {
          const file = new File([blob], `gravacao-sangria.${extFor(mime)}`, { type: blob.type });
          const res = await uploadFile(file);
          onChange(res.url);
          toast.success("Áudio anexado");
        } catch (e: any) {
          toast.error(e?.message ?? "Falha ao enviar áudio");
        } finally {
          setUploading(false);
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      toast.error("Não foi possível acessar o microfone");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  if (value && !recording) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2">
        <audio controls src={value} className="h-8 flex-1" />
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => onChange(null)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {recording ? (
        <Button type="button" variant="destructive" className="h-11 flex-1 rounded-xl" onClick={stop}>
          <Square className="mr-2 h-4 w-4" /> Parar ({formatTime(elapsed)})
        </Button>
      ) : (
        <Button type="button" variant="outline" className="h-11 flex-1 rounded-xl" onClick={start} disabled={uploading}>
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />}
          {uploading ? "Enviando..." : "Gravar áudio (opcional)"}
        </Button>
      )}
    </div>
  );
}
