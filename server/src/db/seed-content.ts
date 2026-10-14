// Estrutura inicial dos 5 cursos oferecidos em parceria com a Microsoft.
// Títulos de módulos/aulas, cargas horárias e questões são EXEMPLOS para a demonstração:
// substitua pelo conteúdo real ao migrar os vídeos da plataforma atual (Sapienza).

export interface SeedQuestion {
  statement: string;
  options: [string, boolean][];
  explanation?: string;
  type?: 'single' | 'multiple';
}

export interface SeedCourse {
  title: string;
  summary: string;
  description: string;
  workload_hours: number;
  level: string;
  modules: { title: string; lessons: { title: string; minutes: number; content: string }[] }[];
  questions: SeedQuestion[];
}

const lesson = (title: string, minutes: number, content: string) => ({ title, minutes, content });

export const TRAIL = {
  title: 'Trilha Carreira e Inteligência Artificial',
  description:
    'Cinco cursos desenvolvidos em parceria com a Microsoft para estudantes do ensino médio da rede pública da Zona da Mata: tecnologia, inteligência artificial e preparação para o mercado de trabalho.',
};

export const COURSES: SeedCourse[] = [
  {
    title: 'Empregabilidade com Microsoft Copilot',
    summary: 'Use o Copilot para montar currículo, se preparar para entrevistas e se organizar na busca por emprego.',
    description:
      'Neste curso você aprende a usar o Microsoft Copilot como apoio na sua jornada profissional: da construção do currículo à simulação de entrevistas, sempre com senso crítico sobre as respostas geradas por IA.',
    workload_hours: 8,
    level: 'Iniciante',
    modules: [
      {
        title: 'Conhecendo o Copilot',
        lessons: [
          lesson('O que é o Microsoft Copilot', 8, 'Visão geral do assistente, onde ele está disponível e o que ele consegue (e não consegue) fazer.'),
          lesson('Escrevendo bons prompts', 10, 'Contexto, objetivo, formato e tom: os quatro elementos de um bom pedido para a IA.'),
        ],
      },
      {
        title: 'Currículo e perfil profissional',
        lessons: [
          lesson('Montando o currículo com apoio da IA', 12, 'Como transformar experiências escolares, voluntárias e cursos em competências no currículo.'),
          lesson('Revisando e personalizando para cada vaga', 10, 'Adaptando o currículo à descrição da vaga e conferindo cada informação gerada.'),
        ],
      },
      {
        title: 'Entrevistas',
        lessons: [
          lesson('Simulando entrevistas com o Copilot', 12, 'Peça perguntas típicas, responda e solicite feedback sobre clareza e objetividade.'),
          lesson('Uso ético e responsável', 8, 'Por que a IA é apoio e não substituta: veracidade, privacidade e autoria.'),
        ],
      },
    ],
    questions: [
      {
        statement: 'Qual destes elementos torna um prompt mais eficaz?',
        options: [['Ser o mais curto possível', false], ['Informar contexto, objetivo e formato desejado', true], ['Usar apenas palavras-chave soltas', false], ['Repetir o pedido várias vezes', false]],
        explanation: 'Contexto, objetivo e formato ajudam a IA a entregar uma resposta útil.',
      },
      {
        statement: 'Ao usar a IA para escrever o currículo, o que você deve sempre fazer?',
        options: [['Copiar o texto sem alterações', false], ['Conferir se todas as informações são verdadeiras', true], ['Inventar experiências para impressionar', false], ['Usar o mesmo currículo para todas as vagas', false]],
      },
      {
        statement: 'Uma boa forma de se preparar para entrevistas com o Copilot é:',
        options: [['Pedir perguntas típicas da vaga e treinar respostas', true], ['Pedir para a IA participar da entrevista no seu lugar', false], ['Decorar respostas prontas sem entender', false], ['Evitar falar sobre suas experiências', false]],
      },
      {
        statement: 'Quais informações NÃO devem ser compartilhadas em um prompt? (marque todas as corretas)',
        type: 'multiple',
        options: [['Senhas', true], ['Número de documentos pessoais', true], ['A descrição pública de uma vaga', false], ['Dados bancários', true]],
      },
      {
        statement: 'Personalizar o currículo para cada vaga significa:',
        options: [['Destacar as competências mais relacionadas à vaga', true], ['Mudar seu nome', false], ['Trocar experiências reais por fictícias', false], ['Remover a formação escolar', false]],
      },
      {
        statement: 'O Copilot pode cometer erros nas respostas.',
        options: [['Verdadeiro', true], ['Falso', false]],
        explanation: 'Modelos de IA podem gerar informações imprecisas; sempre revise.',
      },
    ],
  },
  {
    title: 'Fluência em Inteligência Artificial',
    summary: 'Entenda como a IA funciona, onde ela já está no seu dia a dia e como usá-la com responsabilidade.',
    description:
      'Um curso para desmistificar a inteligência artificial: conceitos fundamentais, aplicações reais, limitações, vieses e o papel humano nas decisões apoiadas por IA.',
    workload_hours: 10,
    level: 'Iniciante',
    modules: [
      {
        title: 'Fundamentos',
        lessons: [
          lesson('O que é inteligência artificial', 10, 'Definições, breve história e diferença entre IA, aprendizado de máquina e IA generativa.'),
          lesson('Como uma IA aprende', 12, 'Dados, padrões e treinamento explicados sem matemática complicada.'),
        ],
      },
      {
        title: 'IA no cotidiano',
        lessons: [
          lesson('Onde a IA já está', 9, 'Recomendações, tradutores, mapas, assistentes de voz e filtros de spam.'),
          lesson('IA generativa: textos, imagens e mais', 11, 'Como funcionam os assistentes que criam conteúdo a partir de instruções.'),
        ],
      },
      {
        title: 'Responsabilidade',
        lessons: [
          lesson('Vieses e limitações', 10, 'Por que a IA pode reproduzir preconceitos presentes nos dados.'),
          lesson('IA responsável', 9, 'Transparência, privacidade, segurança e supervisão humana.'),
        ],
      },
    ],
    questions: [
      {
        statement: 'Aprendizado de máquina é:',
        options: [['Uma área da IA em que sistemas aprendem padrões a partir de dados', true], ['Um tipo de hardware', false], ['Uma linguagem de programação', false], ['Um aplicativo de mensagens', false]],
      },
      {
        statement: 'Qual exemplo usa inteligência artificial no dia a dia?',
        options: [['Recomendação de vídeos em uma plataforma de streaming', true], ['Uma calculadora simples', false], ['Um interruptor de luz', false], ['Um relógio de ponteiro', false]],
      },
      {
        statement: 'Vieses em sistemas de IA geralmente surgem:',
        options: [['Dos dados usados no treinamento', true], ['Da cor da tela do computador', false], ['Da velocidade da internet', false], ['Do tamanho do teclado', false]],
      },
      {
        statement: 'IA generativa é capaz de:',
        options: [['Criar textos e imagens a partir de instruções', true], ['Garantir que toda informação gerada é verdadeira', false], ['Funcionar sem nenhum dado de treinamento', false], ['Substituir totalmente o julgamento humano', false]],
      },
      {
        statement: 'São princípios de uma IA responsável (marque todas as corretas):',
        type: 'multiple',
        options: [['Transparência', true], ['Privacidade e segurança', true], ['Ausência de supervisão humana', false], ['Equidade', true]],
      },
      {
        statement: 'Uma decisão importante sugerida por IA deve ser revisada por uma pessoa.',
        options: [['Verdadeiro', true], ['Falso', false]],
      },
    ],
  },
  {
    title: 'Inteligência Artificial para Estudantes',
    summary: 'Aprenda a estudar melhor com a IA: resumos, planos de estudo e tira-dúvidas — sem colar.',
    description:
      'Como usar ferramentas de IA para organizar os estudos, revisar conteúdos e aprofundar o aprendizado, respeitando as regras da escola e a autoria dos trabalhos.',
    workload_hours: 8,
    level: 'Iniciante',
    modules: [
      {
        title: 'IA como parceira de estudos',
        lessons: [
          lesson('Montando um plano de estudos', 10, 'Use a IA para organizar rotina, metas semanais e revisões.'),
          lesson('Pedindo explicações do seu jeito', 9, 'Peça exemplos, analogias e explicações em diferentes níveis.'),
        ],
      },
      {
        title: 'Pesquisa e checagem',
        lessons: [
          lesson('Pesquisando com IA', 10, 'Como fazer boas perguntas e pedir fontes.'),
          lesson('Checando informações', 11, 'Compare fontes, desconfie de dados sem referência e verifique datas.'),
        ],
      },
      {
        title: 'Autoria e ética',
        lessons: [
          lesson('Colar não é aprender', 8, 'A diferença entre usar a IA para aprender e para terceirizar a tarefa.'),
          lesson('Citando o uso de IA', 7, 'Como informar ao professor que você usou IA no processo.'),
        ],
      },
    ],
    questions: [
      {
        statement: 'Qual é um uso adequado da IA nos estudos?',
        options: [['Pedir explicações e exemplos sobre um conteúdo difícil', true], ['Entregar como seu um trabalho inteiro gerado pela IA', false], ['Responder provas durante a avaliação', false], ['Copiar respostas sem ler', false]],
      },
      {
        statement: 'Ao receber uma informação da IA, você deve:',
        options: [['Checar em outras fontes confiáveis', true], ['Aceitar sempre, pois a IA não erra', false], ['Ignorar as datas', false], ['Compartilhar imediatamente', false]],
      },
      {
        statement: 'Um plano de estudos feito com apoio da IA deve considerar:',
        options: [['Sua rotina e seus objetivos', true], ['Apenas o que a IA acha mais fácil', false], ['Estudar tudo em um único dia', false], ['Nenhuma revisão', false]],
      },
      {
        statement: 'Quais atitudes demonstram uso ético da IA na escola? (marque todas as corretas)',
        type: 'multiple',
        options: [['Informar ao professor quando usou IA', true], ['Seguir as regras da escola sobre IA', true], ['Usar a IA para revisar seu próprio texto', true], ['Apresentar texto gerado como se fosse seu', false]],
      },
      {
        statement: 'Pedir para a IA explicar "como se eu tivesse 12 anos" é uma forma de:',
        options: [['Ajustar o nível da explicação', true], ['Enganar a IA', false], ['Desativar a IA', false], ['Obter respostas proibidas', false]],
      },
      {
        statement: 'Respostas de IA sempre trazem as fontes corretas.',
        options: [['Verdadeiro', false], ['Falso', true]],
      },
    ],
  },
  {
    title: 'Letramento Digital e Produtividade',
    summary: 'Ferramentas digitais, organização de arquivos, segurança on-line e produtividade no dia a dia.',
    description:
      'Desenvolva habilidades digitais essenciais: uso de e-mail e nuvem, editores de texto e planilhas, organização, segurança da informação e cidadania digital.',
    workload_hours: 10,
    level: 'Iniciante',
    modules: [
      {
        title: 'Fundamentos digitais',
        lessons: [
          lesson('E-mail profissional', 9, 'Criando um endereço adequado e escrevendo mensagens claras.'),
          lesson('Arquivos e nuvem', 10, 'Pastas, nomes de arquivos e armazenamento na nuvem.'),
        ],
      },
      {
        title: 'Ferramentas de produtividade',
        lessons: [
          lesson('Editor de texto', 12, 'Formatação, estilos e revisão de documentos.'),
          lesson('Planilhas básicas', 14, 'Tabelas, fórmulas simples e gráficos.'),
        ],
      },
      {
        title: 'Segurança e cidadania digital',
        lessons: [
          lesson('Senhas e golpes', 10, 'Senhas fortes, verificação em duas etapas e como reconhecer golpes.'),
          lesson('Pegada digital', 8, 'O que você publica constrói sua reputação on-line.'),
        ],
      },
    ],
    questions: [
      {
        statement: 'Qual destas é a senha mais segura?',
        options: [['123456', false], ['seu nome + ano de nascimento', false], ['Uma frase longa com letras, números e símbolos', true], ['senha', false]],
      },
      {
        statement: 'A verificação em duas etapas serve para:',
        options: [['Adicionar uma camada extra de proteção à conta', true], ['Deixar o login mais rápido', false], ['Compartilhar a senha com amigos', false], ['Apagar arquivos antigos', false]],
      },
      {
        statement: 'Um e-mail profissional deve ter:',
        options: [['Assunto claro e linguagem adequada', true], ['Apenas emojis', false], ['Nenhum assunto', false], ['Texto todo em letras maiúsculas', false]],
      },
      {
        statement: 'São sinais comuns de golpe on-line (marque todas as corretas):',
        type: 'multiple',
        options: [['Urgência exagerada para agir', true], ['Pedido de senha ou código por mensagem', true], ['Link com endereço estranho', true], ['Mensagem de um site oficial que você acessou digitando o endereço', false]],
      },
      {
        statement: 'Em uma planilha, a fórmula =SOMA(A1:A5) faz o quê?',
        options: [['Soma os valores das células A1 até A5', true], ['Multiplica A1 por A5', false], ['Apaga as células', false], ['Ordena a coluna A', false]],
      },
      {
        statement: 'O que você publica na internet pode ser visto por recrutadores no futuro.',
        options: [['Verdadeiro', true], ['Falso', false]],
      },
    ],
  },
  {
    title: 'Preparação para o Mercado de Trabalho',
    summary: 'Competências socioemocionais, comunicação, primeiro emprego e planejamento de carreira.',
    description:
      'Prepare-se para o primeiro emprego: autoconhecimento, comunicação, trabalho em equipe, direitos do jovem trabalhador e construção de um plano de carreira.',
    workload_hours: 8,
    level: 'Iniciante',
    modules: [
      {
        title: 'Autoconhecimento',
        lessons: [
          lesson('Interesses e talentos', 9, 'Ferramentas para mapear o que você gosta e no que se destaca.'),
          lesson('Competências socioemocionais', 10, 'Comunicação, empatia, resiliência e colaboração.'),
        ],
      },
      {
        title: 'Primeiro emprego',
        lessons: [
          lesson('Jovem Aprendiz e estágio', 11, 'Como funcionam os programas e quais são seus direitos.'),
          lesson('Onde encontrar vagas', 8, 'Sites, redes profissionais e networking.'),
        ],
      },
      {
        title: 'Plano de carreira',
        lessons: [
          lesson('Metas de curto, médio e longo prazo', 10, 'Transformando objetivos em passos concretos.'),
          lesson('Aprendizado contínuo', 8, 'Cursos, certificados e a importância de seguir aprendendo.'),
        ],
      },
    ],
    questions: [
      {
        statement: 'Qual destas é uma competência socioemocional?',
        options: [['Trabalho em equipe', true], ['Digitar rápido', false], ['Saber a tabuada', false], ['Ter um celular novo', false]],
      },
      {
        statement: 'O programa Jovem Aprendiz:',
        options: [['Combina formação teórica com atividade prática na empresa', true], ['Não tem nenhum direito trabalhista', false], ['É apenas para maiores de 30 anos', false], ['Dispensa frequência escolar', false]],
      },
      {
        statement: 'Networking significa:',
        options: [['Construir uma rede de contatos profissionais', true], ['Instalar uma rede Wi-Fi', false], ['Jogar on-line', false], ['Trocar de emprego todo mês', false]],
      },
      {
        statement: 'Boas metas de carreira são (marque todas as corretas):',
        type: 'multiple',
        options: [['Específicas', true], ['Com prazo definido', true], ['Impossíveis de medir', false], ['Realistas', true]],
      },
      {
        statement: 'Aprendizado contínuo é importante porque:',
        options: [['O mercado de trabalho muda constantemente', true], ['Depois do ensino médio não é preciso estudar mais', false], ['Certificados não têm valor', false], ['A tecnologia nunca muda', false]],
      },
      {
        statement: 'Autoconhecimento ajuda a escolher caminhos profissionais.',
        options: [['Verdadeiro', true], ['Falso', false]],
      },
    ],
  },
];
