
-- Criar a tabela users no schema public
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text,
  full_name text,
  avatar_url text,
  google_id text UNIQUE,
  cpf text UNIQUE,
  rg text,
  birth_date date,
  gender text,
  marital_status text,
  nationality text,
  phone text,
  phone_alt text,
  address_cep text,
  address_street text,
  address_number text,
  address_complement text,
  address_district text,
  address_city text,
  address_state text,
  emergency_contact_name text,
  emergency_contact_phone text,
  notes text,
  active boolean DEFAULT true,
  deactivated_at timestamp with time zone,
  deactivation_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Garantir acesso
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
GRANT SELECT ON public.users TO anon;

-- Criar outras tabelas críticas para o PeopleService
CREATE TABLE IF NOT EXISTS public.person_employments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  position text,
  employee_code text,
  admission_date date,
  termination_date date,
  contract_type text,
  salary decimal(12,2),
  pis_number text,
  ctps_number text,
  bank_name text,
  bank_agency text,
  bank_account text,
  bank_pix_key text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, company_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_employments TO authenticated;
GRANT ALL ON public.person_employments TO service_role;

CREATE TABLE IF NOT EXISTS public.person_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  kind text NOT NULL,
  name text NOT NULL,
  number text,
  file_url text,
  issued_at date,
  expires_at date,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_documents TO authenticated;
GRANT ALL ON public.person_documents TO service_role;

-- Vincular user_roles ao users se necessário (já existe mas pode precisar de ajuste)
-- A tabela user_roles existente aponta para profiles? 
-- Vamos ver...
