import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { MapEditorProps } from "./map-editor";

const MapEditor = lazy(() => import("./map-editor"));

export function MapEditorClient(props: MapEditorProps) {
  const fallback = (
    <div
      style={{ height: props.height ?? 400 }}
      className="flex w-full items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-sm text-muted-foreground"
    >
      Carregando mapa...
    </div>
  );
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <MapEditor {...props} />
      </Suspense>
    </ClientOnly>
  );
}
