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
    date: "2026-09-11",
    entries: [
      {
        type: "novidade",
        title: "Monitor: tela de Equipe com consultor, troca de sangrador e alertas",
        description:
          "A tela \"Avaliar equipe\" do monitor virou \"Equipe da fazenda\": mostra o consultor responsável e todos os colaboradores vinculados, permite solicitar a troca de um sangrador (com motivo) e enviar um alerta direto ao consultor sobre qualquer problema — que passa a aparecer na aba Alertas do app do consultor.",
      },
      {
        type: "correcao",
        title: "Monitor não conseguia avaliar sangrador da equipe",
        description:
          "Ao tentar salvar uma avaliação de um sangrador, o monitor recebia um erro de permissão — só consultor e admin podiam avaliar, mesmo o monitor tendo o vínculo correto com a fazenda. Corrigido.",
      },
      {
        type: "correcao",
        title: "Apontamento de operação de máquina não mostrava operadores nem máquinas",
        description:
          "As telas de apontamento de operação, abastecimento e checklist de máquina não listavam operadores, máquinas e implementos para monitor e consultor selecionarem, mesmo já cadastrados no admin. Corrigido — e um operador vinculado apenas pelo Portal de RH agora também aparece automaticamente nessas listas.",
      },
      {
        type: "correcao",
        title: "Sessão podia cair sozinha ao abrir uma tela do app de campo",
        description:
          "Em alguns casos, ao entrar numa tela do app de campo o sistema derrubava a sessão sozinho e voltava para o login, mesmo com o usuário ativo. Era uma corrida entre duas renovações de sessão simultâneas: corrigido para as chamadas compartilharem a mesma renovação.",
      },
      {
        type: "correcao",
        title: "Registro ficava \"pendente de sincronização\" mesmo online",
        description:
          "Sangria, produção, ocorrência e outros registros do app de campo podiam ficar marcados como \"salvo offline\" e pendente de envio mesmo com internet normal — eles só saíam da fila numa reconexão. Corrigido: agora tenta enviar direto primeiro, e só cai na fila se realmente estiver offline ou o envio falhar.",
      },
      {
        type: "correcao",
        title: "Sangrador vinculado só no RH não aparecia para registrar sangria",
        description:
          "Um sangrador vinculado a uma fazenda apenas pelo Portal de RH (sem uma ficha antiga cadastrada) não aparecia na lista do monitor ao registrar sangria ou estimulação, mesmo com o vínculo correto. Corrigido: a lista agora junta os dois cadastros.",
      },
      {
        type: "correcao",
        title: "Sessão caía sozinha depois de trocar a senha",
        description:
          "Depois de trocar a senha, a sessão podia parar de funcionar (erro \"Unauthorized\") assim que o login expirasse, exigindo entrar de novo manualmente. Corrigido: trocar a senha agora renova a sessão automaticamente.",
      },
      {
        type: "melhoria",
        title: "Pré-cadastro: foto por câmera ou galeria, e pendências visíveis",
        description:
          "No pré-cadastro de sangrador, monitor e operador, a foto do documento (RG/CNH) agora pode ser tirada na hora ou escolhida do celular/computador — antes só abria a câmera. A tela também passa a mostrar, no topo, os pré-cadastros que o próprio consultor já enviou e o status de cada um (pendente, aprovado ou arquivado), para não enviar o mesmo CPF de novo.",
      },
      {
        type: "correcao",
        title: "Mensagens de sucesso e erro voltaram a aparecer",
        description:
          "Um problema fazia com que avisos de sucesso e erro (ex.: \"Visita agendada\", \"CPF inválido\") não aparecessem em nenhuma tela do sistema — ações podiam funcionar ou falhar sem nenhum aviso visível. Corrigido.",
      },
      {
        type: "correcao",
        title: "Algumas fazendas bloqueavam ações do consultor sem aviso",
        description:
          "Em alguns casos, uma fazenda vinculada ao consultor aparecia normalmente no app, mas ações nela (agendar visita, registrar ocorrência, consultar dados da fazenda) eram bloqueadas por engano, sem explicação. Corrigido.",
      },
      {
        type: "novidade",
        title: "Senha temporária: troca obrigatória no primeiro login",
        description:
          "Quando o admin gera uma senha temporária (pessoa nova ou \"Resetar senha\" no Portal de RH), o usuário agora é obrigado a definir uma senha nova ao entrar com ela, antes de acessar o resto do sistema.",
      },
      {
        type: "novidade",
        title: "Check-in exige estar na fazenda e foto da propriedade",
        description:
          "O check-in que libera o app de campo (e o início de uma visita do consultor) agora confirma que o GPS está dentro de um raio configurável da fazenda — mostrando a distância em tempo real se estiver longe — e exige uma foto da propriedade. O raio pode ser ajustado por fazenda em Fazendas > Dados Gerais.",
      },
      {
        type: "novidade",
        title: "Agenda do consultor com calendário, recorrência e conflito",
        description:
          "A agenda do consultor ganhou visão de calendário mensal (além da lista por Hoje/Semana/Mês), agendamento recorrente de visitas (\"a cada X dias, por Y vezes\") e aviso de conflito quando já existe outra visita marcada no mesmo dia e horário em qualquer fazenda.",
      },
      {
        type: "novidade",
        title: "Equipe: cadastro de colaborador e ficha com avaliações",
        description:
          "A aba Equipe do consultor ganhou atalhos para pré-cadastrar sangrador, monitor ou operador, passou a trazer também os operadores, e tocar num colaborador abre uma ficha com avaliações, atividade recente e opção de fazer uma nova avaliação.",
      },
      {
        type: "novidade",
        title: "Ficha da fazenda: talhões, mapa e área",
        description:
          "Nova tela de fazenda no app de campo: área total, talhões (com árvores previstas por talhão), árvores sangradas nos últimos 30 dias e um mapa da fazenda.",
      },
      {
        type: "novidade",
        title: "Fazenda selecionada vira o centro do app do consultor",
        description:
          "Ao abrir o app de campo, o consultor escolhe uma fazenda e passa a ver tudo daquela fazenda num só lugar: quem está lá hoje, sangrias do dia, alertas, insights de IA, agenda de visitas, histórico e indicadores — com um seletor no topo para trocar de fazenda a qualquer momento.",
      },
      {
        type: "novidade",
        title: "Consultor acessa o app de campo também pelo desktop",
        description:
          "O app de campo do consultor passa a funcionar também no computador, com um layout adaptado (menu superior em vez do menu inferior do celular) — antes, abrir pelo computador sempre redirecionava para o painel administrativo.",
      },
      {
        type: "novidade",
        title: "Pré-cadastro de monitor e operador pelo consultor",
        description:
          "O app de campo já permitia ao consultor pré-cadastrar um sangrador (nome, CPF, fotos de RG/CPF e fazenda) e enviar para validação do RH. Agora o mesmo fluxo existe para monitor e operador, com pré-cadastros pendentes aparecendo nas telas Sangradores, Monitores e Operadores do administrativo para o RH aprovar (criando o cadastro-base) ou arquivar.",
      },
    ],
  },
  {
    date: "2026-09-09",
    entries: [
      {
        type: "correcao",
        title: "Sangrador vinculado no RH não aparecia no consultor",
        description:
          "Ao vincular um sangrador a uma fazenda e a um consultor pelo Portal de RH, ele não aparecia no card do consultor (sempre mostrava 0 sangradores) nem na tela Sangradores. Corrigido: o card do consultor agora usa o mesmo vínculo gravado pelo RH, e a tela Sangradores ganhou uma seção listando os sangradores cadastrados por lá.",
      },
      {
        type: "novidade",
        title: "Avaliação automática de alertas (1x por dia)",
        description:
          'As regras de alerta (ocorrência aberta há muito tempo, DRC fora da faixa, fazenda sem visita de consultor) passam a ser avaliadas automaticamente todo dia às 6h, sem precisar clicar em "Avaliar agora". O botão manual continua disponível para checar na hora.',
      },
      {
        type: "melhoria",
        title: "Fazenda em abastecimento, checklist e movimentação de estoque",
        description:
          "Abastecimento de máquina, checklist e movimentação de insumo agora guardam a fazenda de origem (preenchida automaticamente pelo tanque, item ou máquina vinculada) e podem ser filtrados por fazenda nas telas de Abastecimento, Checklists e Estoque.",
      },
      {
        type: "correcao",
        title: "Fila offline tentava para sempre em registros com erro permanente",
        description:
          "Itens que falhavam por rota inexistente (404) ou erro de validação/permissão ficavam tentando reenviar indefinidamente na fila offline do app de campo, sem nenhum aviso. Agora esses itens ficam marcados como falha, aparecem destacados em Sincronização com o motivo do erro e podem ser descartados manualmente.",
      },
      {
        type: "novidade",
        title: "Consultor: versão mobile ou desktop conforme o dispositivo",
        description:
          "O consultor/gestor passa a ver a versão do app adequada ao dispositivo: painel mobile no celular, painel administrativo completo no computador — antes ficava sempre travado na versão mobile, independente de onde acessava.",
      },
      {
        type: "melhoria",
        title: "Dashboard do consultor com dados reais",
        description:
          "O painel do consultor (qualidade global, produtividade estimada, top fazendas e equipe de monitores/sangradores) deixou de mostrar números fixos de exemplo e passa a usar dados reais das visitas, entregas e vínculos de cada consultor.",
      },
      {
        type: "novidade",
        title: "Alerta de visita atrasada e justificativa de falta",
        description:
          "O app do consultor agora avisa quando uma fazenda está há muito tempo sem visita registrada (prazo configurável em Configurações), com botão para visitar agora ou justificar a falta. Também é possível criar uma regra de alerta 'Fazenda sem visita' em Alertas.",
      },
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
