export type ChangelogType = "novidade" | "melhoria" | "correcao";

export type ChangelogEntry = {
  type: ChangelogType;
  title: string;
  description: string;
};

export type ChangelogRelease = {
  date: string; // YYYY-MM-DD
  entries: ChangelogEntry[];
};

// Entradas mais recentes primeiro. Ao publicar uma nova correção/melhoria/
// novidade, adicione uma entrada no release do dia (ou crie um novo release).
export const changelog: ChangelogRelease[] = [
  {
    date: "2026-09-09",
    entries: [
      {
        type: "correcao",
        title: "Relatório de visita do consultor não era salvo",
        description:
          "O app do consultor gravava a visita técnica num endereço que não existia no backend — o relatório nunca era salvo, sem nenhum aviso. Agora o registro é real e aparece na tela de Visitas técnicas do admin.",
      },
      {
        type: "novidade",
        title: "Sangradores na gestão de vínculos do consultor",
        description:
          "A tela Consultores agora mostra também os sangradores vinculados às fazendas administradas por cada consultor, além das fazendas e monitores.",
      },
      {
        type: "novidade",
        title: "Menu Ajuda e Atualizações",
        description:
          "Novo item Ajuda no menu, com Documentação e esta página de Atualizações, listando novidades, melhorias e correções do sistema.",
      },
      {
        type: "novidade",
        title: "Árvores previstas na sangria a partir do talhão",
        description:
          "Ao lançar uma sangria, selecionar o talhão preenche automaticamente a quantidade de árvores prevista com base no cadastro do talhão (Nº de árvores).",
      },
      {
        type: "novidade",
        title: "Saldo, tabela de sangria, tarefa e período na sangria",
        description:
          "O lançamento de sangria (admin e app do monitor) agora mostra o saldo entre árvores previstas e realizadas, permite escolher a tabela de sangria (sugerida automaticamente pelo sistema do talhão), a extensão da tarefa (meia/inteira) e o período de término.",
      },
      {
        type: "novidade",
        title: "Sangrador selecionado do cadastro de RH",
        description:
          "Nos lançamentos de sangria e estimulação, o sangrador agora é selecionado a partir do cadastro de Sangradores vinculado à fazenda, em vez de digitado como texto livre.",
      },
      {
        type: "novidade",
        title: "Previsão de próxima sangria no detalhe da fazenda",
        description:
          "A ficha da fazenda no admin passa a mostrar, por talhão, a data da última sangria e o prazo previsto para a próxima, calculado pela frequência da tabela de sangria.",
      },
      {
        type: "correcao",
        title: "Estimulação do app do monitor gravava como Ocorrência",
        description:
          "O registro de estimulação feito pelo monitor não aparecia na tela de Estimulações do admin. Agora usa o cadastro correto, com talhão, sangrador, tabela de estimulação, concentração e motivo da não sangria no período.",
      },
      {
        type: "correcao",
        title: "Consultor sem acesso à própria equipe",
        description:
          "Usuários com o papel Consultor não conseguiam vincular/desvincular monitores e sangradores nem avaliar sua equipe. Agora o consultor tem acesso, restrito às fazendas onde atua.",
      },
      {
        type: "correcao",
        title: "Apontamento de operação de máquina não era salvo",
        description:
          '"Apontar operação de máquina" no app do monitor chamava um endereço inexistente e o lançamento nunca chegava a ser salvo nem aparecia no admin. Corrigido.',
      },
      {
        type: "novidade",
        title: "Pré-cadastro de sangrador com fotos de documento",
        description:
          "O pré-cadastro de sangrador pelo consultor passa a exigir quantidade de árvores e % da tarefa, além de foto obrigatória do RG e do CPF, visíveis para o RH na validação.",
      },
    ],
  },
  {
    date: "2026-08-28",
    entries: [
      {
        type: "correcao",
        title: "Erro 500 ao atualizar implementos",
        description:
          "Corrigido erro 500 ao editar implementos da frota, incluindo vínculos com operadores e ordens de trabalho.",
      },
      {
        type: "correcao",
        title: "Campos vazios em cadastros de máquinas",
        description:
          "Valores vazios em campos de identificador, número e texto agora são normalizados antes de salvar, evitando falhas ao atualizar máquinas e implementos.",
      },
      {
        type: "correcao",
        title: "Vínculo de operador no cadastro de máquinas",
        description: "Corrigido o vínculo de operador ao cadastrar ou editar uma máquina.",
      },
      {
        type: "correcao",
        title: "Upload de arquivos e checklist de máquinas",
        description:
          "Corrigidos problemas no upload de fotos, leitura de erros e no checklist do cadastro de máquinas.",
      },
    ],
  },
  {
    date: "2026-08-26",
    entries: [
      {
        type: "melhoria",
        title: "Operadores centralizados no RH",
        description:
          "Operadores agora são geridos a partir do Portal de RH, com papéis de operador e sangrador consolidados.",
      },
      {
        type: "novidade",
        title: "Pré-cadastro provisório de sangrador",
        description:
          "Agora é possível criar um pré-cadastro provisório de sangrador direto pelo RH.",
      },
      {
        type: "melhoria",
        title: "Validação e feedback do CPF no cadastro do RH",
        description: "Melhorada a validação visual e o feedback de CPF ao cadastrar pessoas no RH.",
      },
      {
        type: "correcao",
        title: "Ficha de sangradores e vínculos por empresa",
        description:
          "Corrigida a abertura da ficha de sangradores e ajustado o acesso do administrador por vínculos do RH e por empresa.",
      },
    ],
  },
  {
    date: "2026-08-18",
    entries: [
      {
        type: "correcao",
        title: "Check-in com GPS",
        description: "Corrigido o registro de check-in com geolocalização.",
      },
    ],
  },
];

export const changelogTypeLabels: Record<ChangelogType, string> = {
  novidade: "Novidade",
  melhoria: "Melhoria",
  correcao: "Correção",
};
