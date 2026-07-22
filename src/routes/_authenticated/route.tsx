import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { hasAuthTokens } from "@/lib/api";
import { AppShell } from "@/components/vertex/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (!hasAuthTokens()) throw redirect({ to: "/auth" });
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
