# Plano de Melhorias Visuais e Estruturais

O usuário solicitou uma série de ajustes na interface administrativa para melhorar a gestão de máquinas, fazendas e a integração da equipe (Monitores, Sangradores e Consultores).

## 1. Melhorias em Máquinas
- **Múltiplas Fotos**: Substituir o campo único `photoUrl` por uma galeria que permita cadastrar várias fotos por máquina.
- **Checklist do Trator**: Adicionar uma nova aba ou seção no cadastro de máquinas para gerenciar checklists técnicos.

## 2. Melhorias em Fazendas
- **Galeria de Fotos**: Adicionar aba de fotos no diálogo de detalhes da fazenda (já iniciado na timeline, mas expandir para visualização de galeria).
- **Informações Detalhadas**: Expandir a aba de informações da fazenda com mais metadados e documentos.

## 3. Unificação de Pessoas (Monitores, Sangradores, Consultores)
- **Fluxo Único**: O cadastro deve começar em "Usuários/Pessoas".
- **Vínculos**: Após cadastrar a pessoa, o administrador deve poder vinculá-la como Monitor, Sangrador ou Consultor em fazendas específicas.
- **Ficha RH**: Expandir a ficha de pessoa (já existe o `PersonEditor`) para comportar os dados específicos que hoje estão separados em Sangradores (Pix, PIS, Admissão, etc.).
- **Consultor**: Garantir que o consultor puxe da base de usuários e permita completar o cadastro técnico.

## Detalhes Técnicos

### Backend (Prisma/NestJS)
- Alterar modelo `Machine` para suportar `photos` (array de strings ou tabela relacionada).
- Criar modelo `MachineChecklist`.
- Garantir que `Tapper` e `Person` (User) estejam integrados ou que a lógica de negócio permita migrar dados de um para o outro.

### Frontend (TanStack Start)
- Refatorar `maquinas.tsx` para usar `FileDropzone` com suporte a múltiplos arquivos.
- Refatorar `sangradores.tsx` para ser uma visão filtrada e especializada da lista de `usuarios.tsx`.
- Ajustar `PersonEditor.tsx` para incluir os campos específicos de RH que eram exclusivos dos sangradores.
- Atualizar `FarmDetailDialog.tsx` para melhorar a visualização de fotos e informações.
