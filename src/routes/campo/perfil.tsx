import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getFieldMe, type FieldMe } from "@/lib/field.functions";
import { apiRequest } from "@/lib/api";
import { Loader2, KeyRound } from "lucide-react";

export const Route = createFileRoute("/campo/perfil")({
  component: ProfilePage,
});

function ProfilePage() {
  const [me, setMe] = useState<FieldMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    getFieldMe().then(setMe).finally(() => setLoading(false));
  }, []);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      return toast.error("As senhas não conferem");
    }
    if (form.newPassword.length < 6) {
      return toast.error("A senha deve ter pelo menos 6 caracteres");
    }

    setSaving(true);
    try {
      await apiRequest("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      toast.success("Senha alterada com sucesso!");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao alterar senha");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-center text-base font-semibold">Meu Perfil</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-0.5">
            <span className="text-xs text-muted-foreground">Nome</span>
            <span className="text-sm font-medium">{me?.user.fullName}</span>
          </div>
          <div className="grid gap-0.5">
            <span className="text-xs text-muted-foreground">E-mail</span>
            <span className="text-sm font-medium">{me?.user.email}</span>
          </div>
          <div className="grid gap-0.5">
            <span className="text-xs text-muted-foreground">Perfil</span>
            <span className="text-sm font-medium capitalize">{me?.primaryRole}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Alterar Senha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <Input
                id="currentPassword"
                type="password"
                required
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                required
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Alterando..." : "Alterar Senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}