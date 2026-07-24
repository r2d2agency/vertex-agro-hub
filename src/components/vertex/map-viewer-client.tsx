import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { MapViewerProps } from "./map-viewer";

const MapViewer = lazy(() => import("./map-viewer"));

export function MapViewerClient(props: MapViewerProps) {
  const fallback = (
    <div
      style={{ height: props.height ?? 560 }}
      className="flex w-full items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-sm text-muted-foreground"
    >
      Carregando mapa...
    </div>
  );
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <MapViewer {...props} />
      </Suspense>
    </ClientOnly>
  );
}
