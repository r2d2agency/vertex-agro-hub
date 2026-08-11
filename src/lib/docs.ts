export type Doc = {
  slug: string;
  title: string;
  summary: string;
  body: string;
};

export const docs: Doc[] = [
  {
    slug: "primeiros-passos",
    title: "Primeiros passos",
    summary: "Ordem recomendada para deixar o sistema pronto para operar.",
    body: `## Ordem recomendada de cadastros

1. **Empresa** — cadastre a empresa (grupo, produtor ou cliente).
2. **Regionais** — agrupamentos por gerente/região.
3. **Fazendas** — cadastre com CEP (endereço é preenchido automático) e desenhe o polígono no mapa.
4. **Talhões** — dentro de cada fazenda, desenhe o talhão sobre o polígono da fazenda.
5. **Tabelas de sangria** e **Clones**.
6. **Pessoas**: usuários, monitores, sangradores e consultores.
7. **Equipes**: agrupe pessoas em equipes que atuam por fazenda/talhão.

Depois disso, o dia a dia acontece em **Agenda**, **Sangrias**, **Produção** e **Ocorrências**.`,
  },
  {
    slug: "cadastro-empresa",
    title: "Como cadastrar uma empresa",
    summary: "Passo a passo do cadastro de empresa com preenchimento por CEP.",
    body: `## Cadastro de empresa

1. Menu lateral → **Empresas** → **Nova empresa**.
2. Preencha **Razão social** (obrigatório) e demais dados fiscais.
3. Digite o **CEP** — endereço, cidade e UF são preenchidos automaticamente (ViaCEP).
4. Ajuste **Endereço** se necessário e escolha o **Status**.
5. Clique **Salvar**.

> Dica: use o seletor de empresa no topo para trocar entre empresas.`,
  },
  {
    slug: "cadastro-fazenda",
    title: "Como cadastrar fazenda e desenhar polígono",
    summary: "Endereço automático por CEP, geolocalização e desenho no mapa.",
    body: `## Cadastro de fazenda

1. Selecione a **Empresa** no topo.
2. Menu → **Fazendas** → **Nova fazenda**.
3. Informe **Nome**, **Regional** e opcionalmente **Código**.
4. **CEP** preenche cidade e UF; ajuste manualmente se precisar.
5. Para geolocalização: clique **"Usar minha localização"** ou **"Buscar pelo endereço"**.
6. Desenhe o **polígono da fazenda** no mapa:
   - Modo **Multi-polígono**: desenhe quantos polígonos precisar até fechar toda a área.
   - Modo **Com exclusões**: desenhe o contorno principal em verde e depois marque as exclusões (reservas, estradas, benfeitorias) em vermelho.
   - A cada polígono novo, a **área em hectares** é recalculada e sugerida.
7. Salve.

> Você pode continuar adicionando polígonos até concluir a área.`,
  },
  {
    slug: "cadastro-talhao",
    title: "Como cadastrar talhões",
    summary: "Talhões desenhados sobre o polígono da fazenda.",
    body: `## Cadastro de talhão

1. Menu → **Talhões** → **Novo talhão**.
2. Selecione a **Fazenda** — o contorno dela aparece como referência tracejada no mapa.
3. Informe **Nome**, **Clone**, **Ano de plantio** e **Sistema de sangria**.
4. Desenhe o polígono do talhão **dentro** do contorno da fazenda.
5. A **área** em hectares é calculada automaticamente.
6. Salve.`,
  },
  {
    slug: "operacao-diaria",
    title: "Operação diária",
    summary: "Como registrar sangrias, produção e ocorrências.",
    body: `## Operação diária

- **Agenda**: planeje quem sangra qual talhão a cada dia.
- **Sangrias**: registre cortes realizados, com sangrador, talhão e data.
- **Produção**: informe entregas com peso úmido; o sistema calcula o peso seco (DRC).
- **Ocorrências**: registre ausências, doenças, quebras, roubos e faça o acompanhamento até a resolução.

Todos os registros ficam vinculados à empresa selecionada e sincronizam com os apps de campo assim que eles forem lançados.`,
  },
  {
    slug: "apps-e-sincronizacao",
    title: "Apps móveis e sincronização",
    summary: "Como compartilhar acesso e como o offline-first funciona.",
    body: `## Apps móveis

Vá em **Apps móveis** no menu para copiar links ou escanear QR Codes.

- **Painel Administrativo**: web, funciona no navegador.
- **Vertex Monitor**: app do sangrador/monitor para lançar sangrias, produção e ocorrências.
- **Vertex Consultor**: app para o consultor técnico realizar visitas e inspeções sanitárias.

## Sincronização e Offline

Todos os registros têm **UUID**, **versão** e **status de sincronização**. 

1. **Trabalhe Offline**: se o sinal cair no campo, continue lançando. O app guarda tudo localmente.
2. **Sincronize**: ao retornar para o sinal (ou chegar na sede), o app detecta a internet e envia os dados pendentes automaticamente.
3. **Segurança**: o sistema garante que nenhum dado seja duplicado ou perdido em caso de conflitos.`,
  },
  {
    slug: "inspecoes-sanitarias",
    title: "Inspeções Sanitárias",
    summary: "Como realizar e acompanhar inspeções técnicas.",
    body: `## Realizando uma Inspeção

As inspeções são realizadas através do **App Consultor**:

1. Faça **Check-in GPS** na fazenda ou talhão.
2. No formulário de visita, preencha o **Estado Fitossanitário**.
3. No campo **Inspecionado por**, identifique se o técnico é da empresa ou terceirizado.
4. Registre **Recomendações** e anexe **Fotos georreferenciadas** de pragas ou doenças.

## Acompanhamento

Gestores podem acompanhar o histórico de inspeções no **Prontuário da Fazenda** ou na aba **Visitas**, visualizando quem realizou a inspeção e quais foram as recomendações técnicas.`,
  },
  {
    slug: "frota-e-estoque",
    title: "Frota, Implementos e Estoque",
    summary: "Gestão de máquinas, combustíveis e insumos.",
    body: `## Máquinas e Implementos
1. Cadastre suas máquinas e implementos em **Frota**.
2. Vincule **Operadores** a cada equipamento.
3. Registre **Manutenções** preventivas e corretivas.

## Estoque de Combustível e Insumos
- Controle a entrada e saída de óleo diesel por tanque.
- Gerencie o estoque de produtos químicos e peças.
- Receba alertas de estoque baixo via IA.`,
  },
];
