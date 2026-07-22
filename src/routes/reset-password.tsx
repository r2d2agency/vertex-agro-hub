import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — Vertex Agro" },
      { name: "description", content: "Recupere o acesso à sua conta Vertex Agro." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);

  async function sendEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setLoading(false);
    toast.info("Recuperação de senha será enviada pelo backend quando o serviço de e-mail estiver configurado.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Leaf className="h-6 w-6" />
          </div>
          <span className="text-2xl font-semibold tracking-tight">Vertex Agro</span>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold">
            Recuperar senha
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Informe seu e-mail para solicitar a redefinição pelo backend Vertex Agro.
          </p>

          <form onSubmit={sendEmail} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Solicitar redefinição"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/auth" className="hover:text-foreground">← Voltar ao login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
