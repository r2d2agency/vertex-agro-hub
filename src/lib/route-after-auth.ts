import type { useNavigate } from "@tanstack/react-router";
import { getFieldMe } from "@/lib/field.functions";

// Decide pra onde mandar o usuário depois de autenticado (login ou troca de
// senha obrigatória concluída): senha temporária pendente > papel > painel.
export async function routeAfterAuth(navigate: ReturnType<typeof useNavigate>) {
  try {
    const me = await getFieldMe();
    if (me.user.mustChangePassword) {
      navigate({ to: "/definir-senha", replace: true });
      return;
    }
    const isConsultant = me.primaryRole === "consultor";
    const isMonitor = me.primaryRole === "monitor";
    const isAdmin = !!me.isAdmin;

    if (isMonitor && !isAdmin) {
      navigate({ to: "/campo", replace: true });
    } else if (isConsultant && !isAdmin) {
      navigate({ to: "/campo/consultor", replace: true });
    } else {
      navigate({ to: "/dashboard", replace: true });
    }
  } catch {
    navigate({ to: "/campo", replace: true });
  }
}
