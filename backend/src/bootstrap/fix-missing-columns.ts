import { PrismaClient } from '@prisma/client';

/**
 * Script de emergência para garantir que as colunas ausentes no banco de dados 
 * (que estão no Prisma schema mas não no banco físico no EasyPanel) sejam criadas.
 */
export async function fixMissingColumns(prisma: PrismaClient) {
  console.log('[fix-missing-columns] Iniciando verificação de colunas...');
  
  try {
    // 1. Tabela FARMS - Coluna photo_urls
    await prisma.$executeRawUnsafe(`
      ALTER TABLE farms ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT '{}';
    `).catch(e => console.log('[fix-missing-columns] farms.photo_urls já existe ou erro:', e.message));

    // 2. Tabela TAPPING_RECORDS - Coluna status
    await prisma.$executeRawUnsafe(`
      ALTER TABLE tapping_records ADD COLUMN IF NOT EXISTS status text;
    `).catch(e => console.log('[fix-missing-columns] tapping_records.status já existe ou erro:', e.message));

    // 3. Tabela MACHINES - Coluna photo_urls
    await prisma.$executeRawUnsafe(`
      ALTER TABLE machines ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT '{}';
    `).catch(e => console.log('[fix-missing-columns] machines.photo_urls já existe ou erro:', e.message));

    // 4. Tabela INVENTORY_ITEMS - Colunas de fornecedor
    await prisma.$executeRawUnsafe(`
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS supplier_cnpj text;
    `).catch(e => console.log('[fix-missing-columns] inventory_items.supplier_cnpj já existe ou erro:', e.message));
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS supplier_phone text;
    `).catch(e => console.log('[fix-missing-columns] inventory_items.supplier_phone já existe ou erro:', e.message));
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS supplier_contact text;
    `).catch(e => console.log('[fix-missing-columns] inventory_items.supplier_contact já existe ou erro:', e.message));
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS supplier_address text;
    `).catch(e => console.log('[fix-missing-columns] inventory_items.supplier_address já existe ou erro:', e.message));

    console.log('[fix-missing-columns] Verificação concluída.');
  } catch (error) {
    console.error('[fix-missing-columns] Erro crítico ao ajustar colunas:', error);
  }
}
