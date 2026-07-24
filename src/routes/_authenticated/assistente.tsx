import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Send, Bot, User as UserIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { chatAssistant, type ChatMessage } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/assistente")({
  head: () => ({ meta: [
    { title: "Assistente Gerencial — Vertex Agro" },
    { name: "description", content: "Converse com a IA sobre a operação dos seus seringais." },
    { name: "robots", content: "noindex" },
  ] }),
  component: AssistentePage,
});

const SUGGESTIONS = [
  "Qual fazenda produziu mais nos últimos 90 dias?",
  "Como está o DRC médio? Está estável?",
  "Quais são as ocorrências mais críticas em aberto?",
  "Onde devo focar minha equipe esta semana?",
];

function AssistentePage() {
  const { companyId, companies, isLoading, setCompanyId } = useSelectedCompany();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = useMutation({
    mutationFn: (next: ChatMessage[]) => chatAssistant(companyId!, next),
    onSuccess: (r) => setMessages((cur) => [...cur, { role: "assistant", content: r.content }]),
    onError: (e: any) => toast.error(e.message ?? "Falha ao consultar IA"),
  });

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, send.isPending]);

  function submit(text?: string) {
    const content = (text ?? input).trim();
    if (!content || !companyId || send.isPending) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    send.mutate(next);
  }

  return (
    <div className="grid gap-4">
      <PageHeader title="Assistente Gerencial" description="IA especialista em heveicultura, com acesso aos seus dados." />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <Card className="flex h-[65vh] flex-col">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="grid h-full place-items-center text-center">
                <div className="max-w-md space-y-3">
                  <Bot className="mx-auto h-10 w-10 text-primary" />
                  <p className="text-sm text-muted-foreground">Faça uma pergunta sobre sua operação. A IA analisa os últimos 90 dias de dados.</p>
                  <div className="grid gap-2 pt-2">
                    {SUGGESTIONS.map((s) => (
                      <Button key={s} variant="outline" size="sm" className="justify-start text-left" onClick={() => submit(s)}>
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    {m.role === "assistant" && <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10"><Bot className="h-4 w-4 text-primary" /></div>}
                    <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                    {m.role === "user" && <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted"><UserIcon className="h-4 w-4" /></div>}
                  </div>
                ))}
                {send.isPending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Pensando…
                  </div>
                )}
              </div>
            )}
          </div>
          <CardContent className="border-t p-3">
            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex gap-2">
              <Textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                placeholder="Pergunte sobre produção, DRC, ocorrências, fazendas…"
                className="min-h-10 resize-none"
                disabled={send.isPending}
              />
              <Button type="submit" disabled={!input.trim() || send.isPending}><Send className="h-4 w-4" /></Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
