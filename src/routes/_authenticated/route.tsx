import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentUser, hasAuthTokens } from "@/lib/api";
import { AppShell } from "@/components/vertex/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (!hasAuthTokens()) throw redirect({ to: "/auth" });
    let me: Awaited<ReturnType<typeof getCurrentUser>>;
    try {
      me = await getCurrentUser();
    } catch {
      throw redirect({ to: "/auth" });
    }
    if (me.mustChangePassword) throw redirect({ to: "/definir-senha" });
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
