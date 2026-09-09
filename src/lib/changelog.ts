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
