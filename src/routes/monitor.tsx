import { createFileRoute, redirect } from "@tanstack/react-router";
import { hasAuthTokens } from "@/lib/api";

export const Route = createFileRoute("/monitor")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !hasAuthTokens()) {
      throw redirect({ to: "/auth" });
    }
    throw redirect({ to: "/campo" });
  },
});
