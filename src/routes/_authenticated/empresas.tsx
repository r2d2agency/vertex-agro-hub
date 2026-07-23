import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/empresas")({
  component: EmpresasLayout,
});

function EmpresasLayout() {
  return <Outlet />;
}
