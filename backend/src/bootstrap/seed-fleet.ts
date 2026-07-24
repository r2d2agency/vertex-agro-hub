import { PrismaService } from '../prisma/prisma.service';

const OPERATIONS: Array<{
  code: string; name: string; category: string;
  requiresHourmeter?: boolean; consumesFuel?: boolean; requiresOperator?: boolean;
}> = [
  { code: 'TRANSP_PROD',  name: 'Transporte de produção',    category: 'transporte' },
  { code: 'TRANSP_EQP',   name: 'Transporte de equipe',      category: 'transporte' },
  { code: 'MANUT_ESTRADA',name: 'Manutenção de estrada',     category: 'manutencao_estrada' },
  { code: 'ROCADA',       name: 'Roçada',                    category: 'campo' },
  { code: 'APLIC_PRODUTO',name: 'Aplicação de produto',      category: 'campo' },
  { code: 'APOIO_SANGRIA',name: 'Apoio à sangria',           category: 'campo' },
  { code: 'TRANSP_INT',   name: 'Transporte interno',        category: 'transporte' },
  { code: 'CARREG',       name: 'Carregamento',              category: 'logistica' },
  { code: 'DESCARREG',    name: 'Descarregamento',           category: 'logistica' },
  { code: 'LIMPEZA',      name: 'Limpeza de área',           category: 'campo' },
  { code: 'MOV_IMPL',     name: 'Movimentação de implementos', category: 'logistica' },
  { code: 'ABAST_OUTRA',  name: 'Abastecimento de outra máquina', category: 'operacao_apoio' },
  { code: 'OUTRA',        name: 'Outra operação',            category: 'outro' },
];

export async function seedFleetOperations(prisma: PrismaService, companyId: string) {
  const existing = await prisma.operationType.count({ where: { companyId, isDeleted: false } });
  if (existing > 0) return;
  for (const op of OPERATIONS) {
    try {
      await prisma.operationType.create({
        data: {
          companyId,
          code: op.code,
          name: op.name,
          category: op.category,
          requiresHourmeter: op.requiresHourmeter ?? true,
          requiresOperator: op.requiresOperator ?? true,
          requiresPhoto: false,
          requiresLocation: true,
          consumesFuel: op.consumesFuel ?? true,
          active: true,
        },
      });
    } catch (err) {
      console.error('[fleet] seed operacao falhou', op.code, err);
    }
  }
}
