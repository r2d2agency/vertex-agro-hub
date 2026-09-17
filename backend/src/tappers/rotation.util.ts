// Assinatura determinística do conjunto de tabelas ativas de um sangrador.
// Se a lista mudar (adicionar/remover/reactivar), o stamp muda e a rotação
// existente fica "desatualizada" — precisa de novo ponto de partida, porque
// a ordem/percurso antigo pode não fazer mais sentido.
export function computeLinkStamp(links: Array<{ id: string; position?: number }>): string {
  return links
    .map((l) => `${l.id}:${l.position ?? 0}`)
    .sort()
    .join(',');
}

// Próxima tabela na rotação cíclica, a partir da última registrada.
// Retorna needsReset quando a rotação não pode ser calculada: stamp
// divergente da lista atual, lastTableId fora da lista, ou lista vazia.
export function nextTableInRotation(
  rotation: { linkStamp: string | null; lastTableId: string },
  orderedLinks: Array<{ id: string; tappingTableId: string }>,
): { tableId: string } | { needsReset: true; reason: 'stamp' | 'missing_last' | 'empty' } {
  if (!orderedLinks.length) return { needsReset: true, reason: 'empty' };
  if (rotation.linkStamp && rotation.linkStamp !== computeLinkStamp(orderedLinks)) {
    return { needsReset: true, reason: 'stamp' };
  }
  const idx = orderedLinks.findIndex((l) => l.tappingTableId === rotation.lastTableId);
  if (idx === -1) return { needsReset: true, reason: 'missing_last' };
  const next = orderedLinks[(idx + 1) % orderedLinks.length];
  return { tableId: next.tappingTableId };
}
