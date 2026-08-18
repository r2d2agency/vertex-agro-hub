import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  console.log('--- Database Repair Starting ---');
  
  try {
    // 1. Verificar se a tabela users existe
    const tables = await prisma.$queryRaw`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`;
    console.log('Existing tables:', tables);

    // 2. Tentar criar tabelas se não existirem
    await prisma.$executeRawUnsafe(`
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
    `);
    console.log('Table "users" ensured.');

    await prisma.$executeRawUnsafe(`
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
    `);
    console.log('Table "person_employments" ensured.');

    await prisma.$executeRawUnsafe(`
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
    `);
    console.log('Table "person_documents" ensured.');

    // 3. Garantir privilégios
    const roles = ['authenticated', 'service_role', 'anon'];
    const schemas = ['public.users', 'public.person_employments', 'public.person_documents'];
    
    for (const schema of schemas) {
      await prisma.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${schema} TO authenticated;`);
      await prisma.$executeRawUnsafe(`GRANT ALL ON ${schema} TO service_role;`);
      await prisma.$executeRawUnsafe(`GRANT SELECT ON ${schema} TO anon;`);
    }
    console.log('Grants applied.');

  } catch (error) {
    console.error('Repair failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
