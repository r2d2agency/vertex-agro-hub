import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { hasAuthTokens } from "@/lib/api";
import { changePassword } from "@/lib/field.functions";
import { routeAfterAuth } from "@/lib/route-after-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import vertexLogo from "@/assets/vertex-logo.png";

export const Route = createFileRoute("/definir-senha")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window !== "undefined" && !hasAuthTokens()) {
      throw redirect({ to: "/auth" });
    }
  },
  component: DefinirSenhaPage,
});

function DefinirSenhaPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const hadHtml = html.classList.contains("dark");
    const hadBody = body.classList.contains("dark");
    html.classList.add("dark");
    body.classList.add("dark");
    return () => {
      if (!hadHtml) html.classList.remove("dark");
      if (!hadBody) body.classList.remove("dark");
    };
  }, []);

  async function handleSave() {
    if (!currentPassword || !newPassword) { toast.error("Preencha as senhas"); return; }
    if (newPassword !== confirmPassword) { toast.error("As senhas não coincidem"); return; }
    if (newPassword.length < 8) { toast.error("A nova senha deve ter pelo menos 8 caracteres"); return; }
    if (newPassword === currentPassword) { toast.error("A nova senha precisa ser diferente da senha temporária"); return; }

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Senha definida com sucesso!");
      await routeAfterAuth(navigate);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao definir a senha");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dark">
      <div
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12"
        style={{
          backgroundImage: "radial-gradient(ellipse at 50% 0%, color-mix(in oklab, var(--color-primary) 15%, transparent) 0%, transparent 55%)",
        }}
      >
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center">
            <img src={vertexLogo} alt="Vertex Agro" className="h-20 w-20" />
            <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <KeyRound className="h-7 w-7" />
            </div>
            <h1 className="mt-3 text-lg font-semibold text-foreground">Defina sua nova senha</h1>
            <p className="mt-1 max-w-xs text-center text-sm text-muted-foreground">
              Você entrou com uma senha temporária. Por segurança, defina uma senha nova antes de continuar.
            </p>
          </div>

          <div className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Senha temporária (atual)</Label>
              <Input
                type="password"
                autoComplete="current-password"
                className="h-12 rounded-xl"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Nova senha</Label>
              <Input
                type="password"
                autoComplete="new-password"
                className="h-12 rounded-xl"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Confirmar nova senha</Label>
              <Input
                type="password"
                autoComplete="new-password"
                className="h-12 rounded-xl"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar e continuar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
