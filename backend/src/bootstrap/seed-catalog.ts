import { PrismaClient } from '@prisma/client';

/**
 * Catálogo base extraído da planilha Vertex (aba BASES) e das tabelas
 * de sangria padrão utilizadas em seringais brasileiros.
 * É aplicado por empresa, sem duplicar registros existentes.
 */

export const SEED_CLONES: Array<{ name: string; origin?: string }> = [
  { name: 'FX 3864', origin: 'IAC/Brasil' },
  { name: 'GT 1', origin: 'Indonésia' },
  { name: 'IAN 873', origin: 'IAN/Brasil' },
  { name: 'PB 217', origin: 'Malásia' },
  { name: 'PB 235', origin: 'Malásia' },
  { name: 'PR 255', origin: 'Indonésia' },
  { name: 'RRIM 527', origin: 'Malásia' },
  { name: 'RRIM 600', origin: 'Malásia' },
  { name: 'RRIM 701', origin: 'Malásia' },
];

export const SEED_TAPPING_TABLES: Array<{
  name: string;
  notation: string;
  cutType?: string;
  frequencyDays?: number;
  description?: string;
}> = [
  {
    name: 'Meia espiral d/3',
    notation: '1/2S d/3 6d/7',
    cutType: 'Meia espiral',
    frequencyDays: 3,
    description: 'Sangria a cada 3 dias, 6 dias trabalhados por semana.',
  },
  {
    name: 'Meia espiral d/4',
    notation: '1/2S d/4 6d/7',
    cutType: 'Meia espiral',
    frequencyDays: 4,
    description: 'Sangria a cada 4 dias — padrão mais comum em SP.',
  },
  {
    name: 'Meia espiral d/5',
    notation: '1/2S d/5 6d/7',
    cutType: 'Meia espiral',
    frequencyDays: 5,
    description: 'Sangria a cada 5 dias com estimulação.',
  },
  {
    name: 'Meia espiral d/7',
    notation: '1/2S d/7 6d/7',
    cutType: 'Meia espiral',
    frequencyDays: 7,
    description: 'Sangria semanal com estimulação.',
  },
];

export async function seedCompanyCatalog(prisma: PrismaClient, companyId: string) {
  const [existingClones, existingTables] = await Promise.all([
    prisma.clone.findMany({ where: { companyId }, select: { name: true } }),
    prisma.tappingTable.findMany({ where: { companyId }, select: { name: true } }),
  ]);
  const cloneNames = new Set(existingClones.map((c) => c.name.toLowerCase()));
  const tableNames = new Set(existingTables.map((t) => t.name.toLowerCase()));

  const clonesToCreate = SEED_CLONES.filter((c) => !cloneNames.has(c.name.toLowerCase()));
  const tablesToCreate = SEED_TAPPING_TABLES.filter(
    (t) => !tableNames.has(t.name.toLowerCase()),
  );

  if (clonesToCreate.length) {
    await prisma.clone.createMany({
      data: clonesToCreate.map((c) => ({ companyId, name: c.name, origin: c.origin })),
    });
  }
  if (tablesToCreate.length) {
    await prisma.tappingTable.createMany({
      data: tablesToCreate.map((t) => ({
        companyId,
        name: t.name,
        notation: t.notation,
        cutType: t.cutType,
        frequencyDays: t.frequencyDays,
        description: t.description,
        active: true,
      })),
    });
  }

  return { clones: clonesToCreate.length, tables: tablesToCreate.length };
}

export async function seedAllCompaniesCatalog(prisma: PrismaClient) {
  const companies = await prisma.company.findMany({
    where: { isDeleted: false },
    select: { id: true, razaoSocial: true },
  });
  let totalClones = 0;
  let totalTables = 0;
  for (const c of companies) {
    try {
      const r = await seedCompanyCatalog(prisma, c.id);
      totalClones += r.clones;
      totalTables += r.tables;
    } catch (err) {
      console.error(`[seed-catalog] falha em ${c.razaoSocial}:`, err);
    }
  }
  if (totalClones || totalTables) {
    console.log(
      `[seed-catalog] ${totalClones} clone(s) e ${totalTables} tabela(s) de sangria adicionados a ${companies.length} empresa(s).`,
    );
  }
}
