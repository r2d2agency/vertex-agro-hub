import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { hasAuthTokens, login } from "@/lib/api";
import { getFieldMe } from "@/lib/field.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Eye, EyeOff, WifiOff } from "lucide-react";
import vertexLogo from "@/assets/vertex-logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Vertex Agro" },
      { name: "description", content: "Acesse sua conta Vertex Agro para gerenciar seringais." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

async function routeAfterLogin(navigate: ReturnType<typeof useNavigate>) {
  try {
    const me = await getFieldMe();
    const fieldOnly = !me.isAdmin && (me.primaryRole === "monitor" || me.primaryRole === "consultor" || me.primaryRole === "sangrador");
    navigate({ to: fieldOnly ? "/campo" : "/dashboard", replace: true });
  } catch {
    navigate({ to: "/campo", replace: true });
  }
}

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

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

  useEffect(() => { if (hasAuthTokens()) void routeAfterLogin(navigate); }, [navigate]);


  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await login(String(fd.get("email")), String(fd.get("password")));
      toast.success("Bem-vindo!");
      await routeAfterLogin(navigate);
    } catch (error) {
      toast.error("Erro ao entrar", { description: error instanceof Error ? error.message : "Tente novamente." });
    } finally {
      setLoading(false);
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
        <div className="w-full max-w-sm">
          <div className="mb-10 flex flex-col items-center">
            <img src={vertexLogo} alt="Vertex Agro" className="h-40 w-40 drop-shadow-[0_0_40px_color-mix(in_oklab,var(--color-primary)_35%,transparent)]" />
            <h1 className="mt-2 text-lg font-semibold text-foreground">Login no sistema</h1>
            <p className="mt-1 text-sm text-muted-foreground">Acesse sua conta para continuar</p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="sr-only">E-mail</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" placeholder="E-mail" className="h-12 rounded-xl border-border/60 bg-card/60 backdrop-blur" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="sr-only">Senha</Label>
              <div className="relative">
                <Input id="password" name="password" type={showPw ? "text" : "password"} required autoComplete="current-password" placeholder="Senha" className="h-12 rounded-xl border-border/60 bg-card/60 pr-11 backdrop-blur" />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-muted-foreground">
                <Checkbox className="h-4 w-4 rounded-[4px]" defaultChecked />
                Lembrar acesso
              </label>
              <Link to="/reset-password" className="text-primary hover:underline">Esqueci minha senha</Link>
            </div>

            <Button type="submit" className="h-12 w-full rounded-xl text-base font-semibold" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-card/40 py-3 text-sm text-muted-foreground backdrop-blur transition hover:text-foreground"
            onClick={() => toast.info("Modo offline: use dados locais já sincronizados.")}
          >
            <WifiOff className="h-4 w-4" />
            <span className="flex flex-col items-center leading-tight">
              <span className="font-medium text-foreground">Trabalhar offline</span>
              <span className="text-[11px] text-primary">Acessar com dados locais</span>
            </span>
          </button>

          <div className="mt-10 text-center text-[11px] text-muted-foreground/70">
            <div>Versão 1.2.0</div>
            <div className="mt-1">Design by TNS R2D2</div>
          </div>
        </div>
      </div>
    </div>
  );
}
