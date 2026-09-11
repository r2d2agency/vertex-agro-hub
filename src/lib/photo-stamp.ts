// Carimba data/hora e coordenadas GPS na própria imagem (desenhado nos
// pixels via canvas, não metadado EXIF) — assim a foto fica documentada e
// não perde essa informação ao ser recortada, compartilhada ou reenviada.
export type StampCoords = { latitude: number; longitude: number; accuracyM?: number } | null | undefined;

export async function stampPhoto(file: File, coords: StampCoords): Promise<File> {
  try {
    if (typeof document === "undefined" || !file.type.startsWith("image/")) return file;

    const dataUrl = await readAsDataUrl(file);
    const img = await loadImage(dataUrl);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx || canvas.width === 0 || canvas.height === 0) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const dateStr = new Date().toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const gpsStr = coords
      ? `GPS: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}${coords.accuracyM ? ` (±${Math.round(coords.accuracyM)}m)` : ""}`
      : "GPS indisponível";

    const pad = Math.max(10, Math.round(canvas.width * 0.018));
    const fontSize = Math.max(13, Math.round(canvas.width * 0.026));
    const lineGap = fontSize * 0.35;
    const barHeight = fontSize * 2 + lineGap + pad * 2;

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "alphabetic";
    ctx.font = `600 ${fontSize}px sans-serif`;
    ctx.fillText(dateStr, pad, canvas.height - barHeight + pad + fontSize);
    ctx.font = `${Math.round(fontSize * 0.85)}px sans-serif`;
    ctx.fillText(gpsStr, pad, canvas.height - barHeight + pad + fontSize * 2 + lineGap);

    const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.9));
    if (!blob) return file;
    return new File([blob], file.name, { type: mime });
  } catch {
    // Se algo falhar (imagem corrompida, canvas bloqueado, etc.), envia a
    // foto original em vez de travar o upload.
    return file;
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Falha ao ler a imagem"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar a imagem"));
    img.src = src;
  });
}
