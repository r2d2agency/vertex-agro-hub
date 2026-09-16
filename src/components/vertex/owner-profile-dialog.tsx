import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileText, Loader2, Plus, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FileDropzone } from "@/components/vertex/file-dropzone";
import {
  createOwnerDocument,
  deleteOwnerDocument,
  getOwner,
  listOwnerDocuments,
  updateOwner,
  type FarmOwnerRef,
  type OwnerRef,
} from "@/lib/fazendas.functions";

const DOCUMENT_KINDS = ["Contrato", "CPF", "CNPJ", "RG", "Inscrição estadual", "Comprovante", "Procuração", "Outro"];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}

export function OwnerProfileDialog({ owner, companyId, onOpenChange }: {
  owner: FarmOwnerRef | null;
  companyId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const open = !!owner;
  const [values, setValues] = useState<Omit<OwnerRef, "id">>({ name: "" });
  const [kind, setKind] = useState("Contrato");
  const [documentName, setDocumentName] = useState("");
  const [number, setNumber] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [documentNotes, setDocumentNotes] = useState("");

  const detail = useQuery({
    queryKey: ["owner", owner?.id, companyId],
    queryFn: () => getOwner(owner!.id, companyId),
    enabled: open,
  });
  const documents = useQuery({
    queryKey: ["owner-documents", owner?.id, companyId],
    queryFn: () => listOwnerDocuments(owner!.id, companyId),
    enabled: open,
  });

  useEffect(() => {
    const source = detail.data ?? owner;
    if (!source) return;
    setValues({
      name: source.name,
      code: source.code ?? "",
      alternateCode: source.alternateCode ?? "",
      cpf: source.cpf ?? "",
      cnpjCpf: source.cnpjCpf ?? "",
      stateRegistration: source.stateRegistration ?? "",
      notes: source.notes ?? "",
    });
  }, [detail.data, owner]);

  const save = useMutation({
    mutationFn: () => updateOwner(owner!.id, companyId, values),
    onSuccess: () => {
      toast.success("Cadastro do proprietário atualizado");
      qc.invalidateQueries({ queryKey: ["owner", owner?.id, companyId] });
      qc.invalidateQueries({ queryKey: ["farms", companyId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const addDocument = useMutation({
    mutationFn: () => createOwnerDocument(owner!.id, {
      companyId, kind, name: documentName.trim() || kind, number: number.trim() || null,
      fileUrl: fileUrl || null, issuedAt: issuedAt || null, expiresAt: expiresAt || null,
      notes: documentNotes.trim() || null,
    }),
    onSuccess: () => {
      toast.success("Documento adicionado");
      setDocumentName(""); setNumber(""); setFileUrl(""); setIssuedAt(""); setExpiresAt(""); setDocumentNotes("");
      qc.invalidateQueries({ queryKey: ["owner-documents", owner?.id, companyId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const removeDocument = useMutation({
    mutationFn: (documentId: string) => deleteOwnerDocument(owner!.id, documentId, companyId),
    onSuccess: () => {
      toast.success("Documento removido");
      qc.invalidateQueries({ queryKey: ["owner-documents", owner?.id, companyId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserRound className="h-5 w-5 text-primary" /> {owner?.name}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="cadastro">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
            <TabsTrigger value="documentos">Documentos e contratos ({documents.data?.length ?? 0})</TabsTrigger>
          </TabsList>
          <TabsContent value="cadastro" className="mt-4 space-y-4">
            {detail.isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
              <form noValidate onSubmit={(event) => { event.preventDefault(); if (!values.name.trim()) return toast.error("Informe o nome do proprietário"); save.mutate(); }} className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2"><Field label="Nome / razão social"><Input value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} /></Field></div>
                <Field label="Código do proprietário"><Input value={values.code ?? ""} onChange={(e) => setValues((v) => ({ ...v, code: e.target.value }))} /></Field>
                <Field label="Código alternativo"><Input value={values.alternateCode ?? ""} onChange={(e) => setValues((v) => ({ ...v, alternateCode: e.target.value }))} /></Field>
                <Field label="CPF"><Input inputMode="numeric" value={values.cpf ?? ""} onChange={(e) => setValues((v) => ({ ...v, cpf: e.target.value }))} /></Field>
                <Field label="CNPJ / CPF"><Input inputMode="numeric" value={values.cnpjCpf ?? ""} onChange={(e) => setValues((v) => ({ ...v, cnpjCpf: e.target.value }))} /></Field>
                <Field label="Inscrição estadual"><Input value={values.stateRegistration ?? ""} onChange={(e) => setValues((v) => ({ ...v, stateRegistration: e.target.value }))} /></Field>
                <div className="md:col-span-2"><Field label="Observações"><Textarea className="resize-none" rows={4} value={values.notes ?? ""} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} /></Field></div>
                <div className="md:col-span-2 flex justify-end"><Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar cadastro"}</Button></div>
              </form>
            )}
          </TabsContent>
          <TabsContent value="documentos" className="mt-4 space-y-4">
            <Card><CardContent className="grid gap-3 p-4 md:grid-cols-2">
              <Field label="Tipo"><Select value={kind} onValueChange={setKind}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DOCUMENT_KINDS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Nome / descrição"><Input value={documentName} onChange={(e) => setDocumentName(e.target.value)} placeholder="Ex.: Contrato de parceria 2026" /></Field>
              <Field label="Número"><Input value={number} onChange={(e) => setNumber(e.target.value)} /></Field>
              <Field label="Emissão"><Input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} /></Field>
              <Field label="Validade"><Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></Field>
              <div className="md:col-span-2"><Field label="Observações"><Textarea className="resize-none" rows={2} value={documentNotes} onChange={(e) => setDocumentNotes(e.target.value)} /></Field></div>
              <div className="md:col-span-2"><Field label="Arquivo"><FileDropzone value={fileUrl} onClear={() => setFileUrl("")} onUploaded={(url, meta) => { setFileUrl(url); if (!documentName) setDocumentName(meta.originalName); }} label="Arraste o documento ou clique para selecionar (até 20 MB)" /></Field></div>
              <div className="md:col-span-2 flex justify-end"><Button type="button" size="sm" onClick={() => addDocument.mutate()} disabled={addDocument.isPending || (!fileUrl && !documentName.trim())}><Plus className="mr-2 h-4 w-4" /> Adicionar</Button></div>
            </CardContent></Card>
            {documents.isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div> : documents.data?.length ? (
              <div className="grid gap-2">{documents.data.map((document) => <Card key={document.id}><CardContent className="flex items-center gap-3 p-3"><FileText className="h-5 w-5 text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{document.name}</p><p className="text-xs text-muted-foreground">{document.kind}{document.number ? ` · Nº ${document.number}` : ""}{document.expiresAt ? ` · Validade ${String(document.expiresAt).slice(0, 10)}` : ""}</p></div>{document.fileUrl && <a href={document.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">Abrir <ExternalLink className="h-3 w-3" /></a>}<Button type="button" variant="ghost" size="icon" aria-label={`Remover ${document.name}`} className="text-destructive" onClick={() => removeDocument.mutate(document.id)}><Trash2 className="h-4 w-4" /></Button></CardContent></Card>)}</div>
            ) : <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum documento ou contrato cadastrado.</div>}
          </TabsContent>
        </Tabs>
        <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
