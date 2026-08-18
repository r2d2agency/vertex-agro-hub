
-- Criar tabelas territoriais no schema public
CREATE TABLE IF NOT EXISTS public.regionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  description text,
  manager_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  regional_id uuid REFERENCES public.regionals(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text,
  city text,
  state text,
  total_area_ha float,
  latitude float,
  longitude float,
  boundary jsonb,
  photo_urls text[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  area_ha float,
  planting_year int,
  tree_count int,
  tapping_system text,
  boundary jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Garantir acesso
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regionals, public.farms, public.plots TO authenticated;
GRANT ALL ON public.regionals, public.farms, public.plots TO service_role;
GRANT SELECT ON public.regionals, public.farms, public.plots TO anon;
