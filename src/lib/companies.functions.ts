import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const companyInput = z.object({
  razao_social: z.string().trim().min(2).max(200),
  nome_fantasia: z.string().trim().max(200).optional().nullable(),
  cnpj: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email().max(255).optional().nullable().or(z.literal("")),
  telefone: z.string().trim().max(30).optional().nullable(),
  responsavel: z.string().trim().max(120).optional().nullable(),
  endereco: z.string().trim().max(300).optional().nullable(),
  cidade: z.string().trim().max(120).optional().nullable(),
  estado: z.string().trim().max(2).optional().nullable(),
  logo_url: z.string().trim().max(500).optional().nullable(),
  observacoes: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["ativa", "inativa", "bloqueada"]).default("ativa"),
});

export const listCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("companies")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCompany = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("companies")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const createCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => companyInput.parse(input))
  .handler(async ({ data, context }) => {
    const payload = {
      ...data,
      email: data.email || null,
      created_by: context.userId,
      updated_by: context.userId,
    };
    const { data: row, error } = await context.supabase
      .from("companies")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), values: companyInput }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("companies")
      .update({ ...data.values, email: data.values.email || null, updated_by: context.userId })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("companies")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_by: context.userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
