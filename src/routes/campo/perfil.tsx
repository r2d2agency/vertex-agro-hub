import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, KeyRound, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { changePassword } from "@/lib/field.functions";
import { FieldCard, StepHeader } from "@/components/vertex/field/step-header";

export const Route = createFileRoute("/campo/perfil")({ component: PerfilPage });

function PerfilPage() {
  const nav = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!currentPassword || !newPassword) {
      toast.error("Preencha as senhas");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Senha alterada com sucesso!");
      nav({ to: "/campo/mais" });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao alterar senha");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Button variant="ghost" size="icon" onClick={() => nav({ to: "/campo/mais" })}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Meu Perfil</h1>
      </div>

      <FieldCard className="space-y-6">
        <div className="flex flex-col items-center py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="h-8 w-8" />
          </div>
          <h2 className="mt-3 font-medium">Segurança da Conta</h2>
          <p className="text-xs text-muted-foreground text-center px-4 mt-1">
            Recomendamos trocar sua senha periodicamente para manter sua conta segura.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Senha Atual</Label>
            <Input 
              type="password" 
              className="h-12 rounded-xl" 
              value={currentPassword} 
              onChange={(e) => setCurrentPassword(e.target.value)} 
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Nova Senha</Label>
            <Input 
              type="password" 
              className="h-12 rounded-xl" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Confirmar Nova Senha</Label>
            <Input 
              type="password" 
              className="h-12 rounded-xl" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
            />
          </div>
        </div>

        <Button 
          className="h-12 w-full rounded-xl text-base font-semibold" 
          onClick={handleSave} 
          disabled={saving}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Atualizar Senha
        </Button>
      </FieldCard>
    </div>
  );
}