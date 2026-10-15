/**
 * Cataguases para crianças: os pontos turísticos do mapa, as perguntas de cada lugar e a
 * pontuação guardada no próprio navegador (não precisa de login).
 * Para liberar um lugar novo: troque o item "Em breve" por um lugar com `kind`/`to` próprios
 * e cadastre as perguntas dele em QUESTIONS.
 */
import { PLACES, type Place } from './world';

export interface Option {
  text: string;
  /** Figura de apoio para quem ainda está aprendendo a ler. */
  emoji: string;
}

export interface Question {
  id: string;
  text: string;
  /** Provocação do Mestre do Saber antes da pergunta (só nas casas dos mestres). */
  hook?: string;
  /** A primeira opção é sempre a certa; a ordem é embaralhada na tela. */
  options: [Option, Option, Option];
  /** Curiosidade mostrada depois do acerto. */
  fact: string;
}

export interface CityPlace extends Place {
  /** Nome falado/curto do lugar, usado nas falas da pomba. */
  title: string;
  intro: string;
}

const SANTA_RITA: CityPlace = {
  id: 'santa-rita',
  label: 'Praça Santa Rita',
  title: 'Praça Santa Rita',
  hint: 'Toque para visitar!',
  intro: 'Chegamos na Praça Santa Rita! Olha que igreja bonita. Vamos ver se você sabe a resposta?',
  to: '/lugar/santa-rita',
  icon: 'bell',
  kind: 'church',
  x: 74,
  y: 86,
};

/*
 * Mestres do Saber: pessoas da cultura popular que guardam histórias, músicas e costumes.
 * Cada um mora numa casinha da "Rua dos Mestres" (embaixo, no mapa) e recebe a criança
 * dentro de casa, com perguntas. Falas, visuais e o nome da bordadeira são provisórios:
 * trocar quando a equipe definir as características de cada mestre.
 */
const SEU_ZICO: Place = {
  id: 'seu-zico',
  label: 'Casa do Seu Zico',
  hint: 'Converse com o Mestre do Saber',
  to: '/mestre/seu-zico',
  icon: 'scroll',
  kind: 'mestre',
  variant: 'roca',
  x: 36,
  y: 142,
  wall: '#f4a3c4',
  roof: '#c4553a',
  master: {
    name: 'Seu Zico',
    craft: 'Mestre do Saber · Causos e costumes',
    room: 'Cozinha do Seu Zico',
    color: '#d6538a',
    soft: '#ffe1ec',
    intro: [
      'Ô de casa! Entra, entra! Repara não, que o café tá passando no fogão a lenha.',
      'Eu sou o Seu Zico, Mestre do Saber aqui de Cataguases. Guardo as histórias e os costumes do nosso povo.',
      'E eu sei umas coisas que pouca gente sabe... Quer descobrir comigo?',
    ],
    greetings: ['Ô de casa! 👋', 'Vem prosear! ☕', 'Eu sou o Seu Zico!', 'Quer ouvir um causo? 📜', 'Tem café quentinho! ☕'],
  },
};

const SEKTOR: Place = {
  id: 'sektor',
  label: 'Casa do Sektor',
  hint: 'Conheça o Mestre do Saber do Hip Hop',
  to: '/mestre/sektor',
  icon: 'play',
  kind: 'mestre',
  variant: 'hiphop',
  x: 96,
  y: 164,
  master: {
    name: 'Sektor',
    craft: 'Mestre do Saber · Hip Hop',
    room: 'Estúdio do Sektor',
    color: '#6b4fa0',
    soft: '#ece4fb',
    intro: [
      'E aí, chega mais! Bem-vindo ao estúdio! Eu sou o Sektor, Mestre do Saber da cultura Hip Hop.',
      'O Hip Hop é música, dança, arte nos muros e muito conhecimento. Tudo junto e misturado!',
      'Aqui a gente aprende no ritmo. Bora ver se você manja?',
    ],
    greetings: ['E aí! ✌️', 'Bora dançar? 🕺', 'Chega mais! 🎧', 'Tá no ritmo? 🎵', 'Solta o som! 🔊'],
  },
};

const DONA_CIDA: Place = {
  id: 'dona-cida',
  label: 'Casa da Dona Cida',
  hint: 'Conheça a Mestre do Saber do bordado',
  to: '/mestre/dona-cida',
  icon: 'heart',
  kind: 'mestre',
  variant: 'bordado',
  x: 206,
  y: 164,
  wall: '#f6dc8a',
  roof: '#b5523b',
  master: {
    name: 'Dona Cida',
    craft: 'Mestre do Saber · Bordado',
    room: 'Ateliê da Dona Cida',
    color: '#12a3a0',
    soft: '#e2f6f5',
    intro: [
      'Entra, minha flor! Eu sou a Dona Cida, a Mestre do Saber do bordado.',
      'Com agulha, linha e paciência, a gente transforma um pano simples numa obra de arte.',
      'Senta aqui do meu ladinho que eu vou te ensinar umas coisinhas!',
    ],
    greetings: ['Entra, minha flor! 🌸', 'Vem bordar comigo! 🧵', 'Olha que bonito! 🪡', 'Um ponto de cada vez 💛'],
  },
};

const MASTERS = [SEU_ZICO, SEKTOR, DONA_CIDA];

/** Os demais lugares do mapa ficam com cadeado até ganharem desenho e perguntas. */
export const CITY_PLACES: Place[] = [
  SANTA_RITA,
  ...MASTERS,
  ...PLACES.filter((p) => !['academia', 'casa', 'correio', 'salao'].includes(p.id)).map((p) => ({ ...p, label: 'Em breve', hint: 'Este lugar ainda está em construção', soon: true })),
];

export const CITY_INFO: Record<string, CityPlace> = { [SANTA_RITA.id]: SANTA_RITA };

/** Casas dos Mestres do Saber que já podem ser visitadas. */
export const MASTER_PLACES: Record<string, Place> = Object.fromEntries(MASTERS.map((m) => [m.id, m]));

// Textos provisórios: revisar com a equipe pedagógica antes de publicar.
export const QUESTIONS: Record<string, Question[]> = {
  sektor: [
    {
      id: 'elementos',
      hook: 'O Hip Hop tem uns elementos que andam sempre juntos. Duvido você acertar um!',
      text: 'Qual destes é um elemento do Hip Hop?',
      options: [
        { text: 'Breaking, a dança', emoji: '🕺' },
        { text: 'Balé', emoji: '🩰' },
        { text: 'Futebol', emoji: '⚽' },
      ],
      fact: 'O Hip Hop tem o DJ, o MC (o rap), o breaking (a dança) e o grafite. E tem o quinto elemento: o conhecimento!',
    },
    {
      id: 'dj',
      hook: 'Tá vendo esses dois toca-discos aqui do lado? Quem mexe neles tem um nome especial!',
      text: 'Quem solta o som e mexe nos discos?',
      options: [
        { text: 'O DJ', emoji: '🎧' },
        { text: 'O goleiro', emoji: '🧤' },
        { text: 'O padeiro', emoji: '🥖' },
      ],
      fact: 'O DJ escolhe as músicas e faz o scratch: aquele zigui-zigui de mexer o disco pra frente e pra trás!',
    },
    {
      id: 'grafite',
      hook: 'Olha esse muro colorido atrás de mim. Sabe como se chama essa arte?',
      text: 'O que é o grafite do Hip Hop?',
      options: [
        { text: 'Arte pintada nos muros', emoji: '🎨' },
        { text: 'Um bichinho de jardim', emoji: '🐛' },
        { text: 'Um tipo de sorvete', emoji: '🍦' },
      ],
      fact: 'O grafite leva cor e mensagens para a cidade. E o grafiteiro sempre pede autorização para pintar o muro!',
    },
    {
      id: 'mc',
      hook: 'Pega esse microfone aqui! Quem canta rimando no rap é chamado de...',
      text: 'Como se chama quem canta rimando no rap?',
      options: [
        { text: 'MC', emoji: '🎤' },
        { text: 'Juiz', emoji: '⚖️' },
        { text: 'Piloto', emoji: '✈️' },
      ],
      fact: 'MC quer dizer mestre de cerimônias. É quem rima, conta histórias e anima a galera!',
    },
    {
      id: 'origem',
      hook: 'O Hip Hop veio de longe até chegar aqui em Cataguases. Sabe onde ele nasceu?',
      text: 'Onde o Hip Hop nasceu?',
      options: [
        { text: 'Nos bairros de Nova York', emoji: '🗽' },
        { text: 'No fundo do mar', emoji: '🐠' },
        { text: 'Na Lua', emoji: '🌙' },
      ],
      fact: 'Nasceu nos anos 1970, nas festas de rua do Bronx, em Nova York. No Brasil, cresceu nos anos 1980, em São Paulo!',
    },
    {
      id: 'freeze',
      hook: 'No breaking tem um passo em que o dançarino fica paradinho numa pose. Qual é?',
      text: 'Qual destes é um passo do breaking?',
      options: [
        { text: 'Freeze: congelar numa pose', emoji: '🧊' },
        { text: 'Embaixadinha', emoji: '⚽' },
        { text: 'Nado borboleta', emoji: '🏊' },
      ],
      fact: 'Quem dança breaking é b-boy ou b-girl. O breaking ficou tão famoso que foi esporte nas Olimpíadas de Paris, em 2024!',
    },
  ],
  'dona-cida': [
    {
      id: 'agulha',
      hook: 'Pra bordar a gente precisa de duas coisinhas. Você sabe quais são?',
      text: 'Com o que a gente borda?',
      options: [
        { text: 'Agulha e linha', emoji: '🪡' },
        { text: 'Martelo e prego', emoji: '🔨' },
        { text: 'Garfo e faca', emoji: '🍴' },
      ],
      fact: 'A agulha leva a linha pra lá e pra cá no pano. Cada furinho vira um pontinho do desenho!',
    },
    {
      id: 'bastidor',
      hook: 'Tá vendo esse aro de madeira na minha mão? Ele tem um trabalho importante!',
      text: 'Para que serve o bastidor?',
      options: [
        { text: 'Deixar o pano esticadinho', emoji: '⭕' },
        { text: 'Guardar comida', emoji: '🍲' },
        { text: 'Jogar bola', emoji: '⚽' },
      ],
      fact: 'O bastidor prende o pano bem esticado, igual a um tamborzinho. Assim o bordado fica retinho!',
    },
    {
      id: 'ponto-cruz',
      hook: 'Tem um ponto de bordado que é feito de xizinhos, um do lado do outro. Adivinha o nome!',
      text: 'Qual é o nome de um ponto de bordado?',
      options: [
        { text: 'Ponto cruz', emoji: '❌' },
        { text: 'Ponto de ônibus', emoji: '🚌' },
        { text: 'Ponto de exclamação', emoji: '❗' },
      ],
      fact: 'No ponto cruz, cada xizinho é como um quadradinho colorido. É igualzinho a pixel arte, que nem este jogo!',
    },
    {
      id: 'pano-de-prato',
      hook: 'Na casa da vovó sempre tem bordado escondido em algum lugar. Sabe onde?',
      text: 'Onde a gente costuma ver bordado?',
      options: [
        { text: 'Em pano de prato e toalha', emoji: '🧺' },
        { text: 'No asfalto da rua', emoji: '🛣️' },
        { text: 'Nas nuvens', emoji: '☁️' },
      ],
      fact: 'Em Minas, pano de prato, toalha e roupinha de bebê ganham flores, bichinhos e nomes bordados à mão.',
    },
    {
      id: 'aprender',
      hook: 'Eu aprendi a bordar quando era menina. Sabe como?',
      text: 'Como se aprende a bordar?',
      options: [
        { text: 'Com alguém que já sabe', emoji: '👵' },
        { text: 'Dormindo', emoji: '😴' },
        { text: 'Correndo', emoji: '🏃' },
      ],
      fact: 'Eu aprendi com a minha avó, que aprendeu com a mãe dela. É assim que um saber passa de geração em geração!',
    },
    {
      id: 'novelo',
      hook: 'Olha essa cesta cheia de bolinhas coloridas. Sabe o nome delas?',
      text: 'O que é um novelo?',
      options: [
        { text: 'Uma bolinha de linha enrolada', emoji: '🧶' },
        { text: 'Um passarinho', emoji: '🐦' },
        { text: 'Uma fruta', emoji: '🍎' },
      ],
      fact: 'O novelo guarda a linha enroladinha, sem embolar. Mas cuidado: gato adora brincar com ele!',
    },
  ],
  'seu-zico': [
    {
      id: 'causo',
      hook: 'Lá em casa a gente fala muito em causo. Mas você sabe o que é?',
      text: 'O que é um causo?',
      options: [
        { text: 'Uma história contada de boca em boca', emoji: '🗣️' },
        { text: 'Um tipo de doce', emoji: '🍬' },
        { text: 'Uma pipa', emoji: '🪁' },
      ],
      fact: 'Causo é uma história contada na roda de conversa, passando dos avós para os netos. Cada um que conta, aumenta um pouquinho!',
    },
    {
      id: 'rio-pomba',
      hook: 'Da minha janela eu escuto o barulhinho da água. Duvido você saber de onde vem!',
      text: 'Qual rio passa por Cataguases?',
      options: [
        { text: 'Rio Pomba', emoji: '🏞️' },
        { text: 'Rio Amazonas', emoji: '🐊' },
        { text: 'Rio Nilo', emoji: '🐫' },
      ],
      fact: 'O Rio Pomba atravessa a cidade. Antigamente era nele que muita gente pescava, lavava roupa e se refrescava no calor!',
    },
    {
      id: 'pao-de-queijo',
      hook: 'Tem um cheirinho saindo do meu forno agora mesmo... Adivinha o que é?',
      text: 'Qual é a quitanda mais famosa de Minas Gerais?',
      options: [
        { text: 'Pão de queijo', emoji: '🧀' },
        { text: 'Sushi', emoji: '🍣' },
        { text: 'Taco', emoji: '🌮' },
      ],
      fact: 'Em Minas, bolo, biscoito e pão de queijo se chamam quitanda. E o pão de queijo vai pro forno quentinho, pro café da tarde!',
    },
    {
      id: 'folia',
      hook: 'No comecinho do ano, uma festa bate na porta de casa cantando. Você conhece?',
      text: 'O que é a Folia de Reis?',
      options: [
        { text: 'Um grupo que canta visitando as casas', emoji: '🎶' },
        { text: 'Um jogo de futebol', emoji: '⚽' },
        { text: 'Uma corrida de carro', emoji: '🏎️' },
      ],
      fact: 'Os foliões andam com bandeira, viola e sanfona, cantando de casa em casa entre o Natal e o Dia de Reis, 6 de janeiro.',
    },
    {
      id: 'piao',
      hook: 'Quando eu era menino não tinha videogame, não. Mas a gente brincava muito! Sabe de quê?',
      text: 'Qual destas é uma brincadeira de antigamente?',
      options: [
        { text: 'Pião', emoji: '🪀' },
        { text: 'Videogame', emoji: '🎮' },
        { text: 'Celular', emoji: '📱' },
      ],
      fact: 'Pião, peteca, bola de gude e pipa! A gente mesmo fazia os brinquedos, com madeira, palha e papel.',
    },
    {
      id: 'fogao-lenha',
      hook: 'A comida da minha casa é feita de um jeitinho especial. Será que você descobre?',
      text: 'Onde se cozinha na roça de Minas?',
      options: [
        { text: 'No fogão a lenha', emoji: '🔥' },
        { text: 'Na geladeira', emoji: '🧊' },
        { text: 'Na máquina de lavar', emoji: '🧺' },
      ],
      fact: 'O fogão a lenha esquenta a casa toda e deixa a comida com um gostinho de fumaça. É por isso que sai fumaça da minha chaminé!',
    },
  ],
  'santa-rita': [
    {
      id: 'azulejo-cor',
      text: 'Qual é a cor dos azulejos na frente da igreja?',
      options: [
        { text: 'Azul e branco', emoji: '🔵' },
        { text: 'Vermelho', emoji: '🔴' },
        { text: 'Verde', emoji: '🟢' },
      ],
      fact: 'Azulejos são plaquinhas de cerâmica pintadas. Juntinhas, elas formam um desenho bem grande!',
    },
    {
      id: 'torre-cruz',
      text: 'O que tem lá no alto da torre da igreja?',
      options: [
        { text: 'Uma cruz', emoji: '✝️' },
        { text: 'Uma estrela', emoji: '⭐' },
        { text: 'Um balão', emoji: '🎈' },
      ],
      fact: 'Dentro da torre mora o sino. Ele toca para avisar a hora da missa: blém, blém!',
    },
    {
      id: 'nome-praca',
      text: 'Qual é o nome desta praça?',
      options: [
        { text: 'Santa Rita', emoji: '🌹' },
        { text: 'São João', emoji: '🔥' },
        { text: 'Santa Luzia', emoji: '🕯️' },
      ],
      fact: 'Santa Rita é conhecida como a santa das rosas. Por isso, a rosa é o símbolo dela!',
    },
    {
      id: 'espelho-agua',
      text: 'O que fica na frente da igreja e parece um espelho?',
      options: [
        { text: 'Um laguinho', emoji: '💧' },
        { text: 'Uma praia', emoji: '🏖️' },
        { text: 'Uma montanha', emoji: '⛰️' },
      ],
      fact: 'Quando a água fica paradinha, a igreja aparece de cabeça para baixo nela. Isso se chama reflexo!',
    },
    {
      id: 'torre-forma',
      text: 'Como é a torre da igreja?',
      options: [
        { text: 'Pontuda', emoji: '🔺' },
        { text: 'Redonda', emoji: '⚪' },
        { text: 'Quadrada', emoji: '🟦' },
      ],
      fact: 'A torre é pontuda e branquinha. Tem gente que acha que ela parece um foguete!',
    },
    {
      id: 'brincar-praca',
      text: 'O que as crianças podem fazer na praça?',
      options: [
        { text: 'Andar de bicicleta', emoji: '🚲' },
        { text: 'Nadar no laguinho', emoji: '🏊' },
        { text: 'Dirigir um carro', emoji: '🚗' },
      ],
      fact: 'A praça é lugar de brincar, passear e encontrar os amigos. Mas no laguinho não se nada, tá?',
    },
  ],
};

/* ---- Progresso no navegador ---- */

const KEY = 'cidade:progresso';

interface Progress {
  points: number;
  /** Perguntas já vistas por lugar (zera quando todas forem vistas). */
  seen: Record<string, string[]>;
}

function load(): Progress {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (raw && typeof raw.points === 'number') return { points: raw.points, seen: raw.seen ?? {} };
  } catch {
    /* sem armazenamento: começa do zero */
  }
  return { points: 0, seen: {} };
}

function save(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignorado */
  }
}

export function getPoints() {
  return load().points;
}

export function addPoints(n: number) {
  const p = load();
  p.points += n;
  save(p);
  return p.points;
}

/** Próxima pergunta ainda não vista do lugar (sem gravar nada; repetível). */
export function nextQuestion(placeId: string, avoid?: string): Question | null {
  const list = QUESTIONS[placeId] ?? [];
  if (!list.length) return null;
  const seen = load().seen[placeId] ?? [];
  const fresh = list.filter((q) => !seen.includes(q.id) && q.id !== avoid);
  const pool = fresh.length ? fresh : list.filter((q) => q.id !== avoid);
  return pool[Math.floor(Math.random() * pool.length)] ?? list[0];
}

/** Marca a pergunta como vista. Idempotente; quando todas foram vistas, recomeça o ciclo. */
export function markSeen(placeId: string, questionId: string) {
  const p = load();
  const total = QUESTIONS[placeId]?.length ?? 0;
  let seen = p.seen[placeId] ?? [];
  if (seen.includes(questionId)) return;
  if (seen.length >= total) seen = [];
  p.seen[placeId] = [...seen, questionId];
  save(p);
}

/* ---- Descobertas: coisas da cena do lugar que a criança já tocou ---- */

const FOUND_KEY = 'cidade:descobertas';

export function getFound(placeId: string): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(FOUND_KEY) ?? 'null');
    if (raw && Array.isArray(raw[placeId])) return raw[placeId].filter((k: unknown) => typeof k === 'string');
  } catch {
    /* sem armazenamento: começa do zero */
  }
  return [];
}

export function saveFound(placeId: string, found: string[]) {
  try {
    const raw = JSON.parse(localStorage.getItem(FOUND_KEY) ?? 'null');
    localStorage.setItem(FOUND_KEY, JSON.stringify({ ...(raw && typeof raw === 'object' ? raw : {}), [placeId]: found }));
  } catch {
    /* ignorado */
  }
}

export function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---- Voz e sons ---- */

const MUTE_KEY = 'cidade:mudo';

export function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(v: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, v ? '1' : '0');
  } catch {
    /* ignorado */
  }
  if (v) window.speechSynthesis?.cancel();
}

/** Lê o texto em voz alta (português do Brasil), para quem ainda não lê sozinho. */
export function speak(text: string) {
  const synth = window.speechSynthesis;
  if (!synth || isMuted()) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'pt-BR';
  u.rate = 0.9;
  u.pitch = 1.15;
  const voice = synth.getVoices().find((v) => v.lang.replace('_', '-').toLowerCase() === 'pt-br');
  if (voice) u.voice = voice;
  synth.speak(u);
}

let ctx: AudioContext | null = null;

type Sfx = 'ok' | 'oops' | 'pop' | 'bell' | 'splash' | 'rustle' | 'chirp';

/** Cada som: notas (Hz), duração de cada nota, forma de onda e volume. Pequenas variações a cada toque. */
const SOUNDS: Record<Sfx, { notes: number[]; step: number; wave: OscillatorType; vol: number; tail?: number }> = {
  ok: { notes: [523, 659, 784, 1047], step: 0.11, wave: 'square', vol: 0.06 },
  oops: { notes: [330, 247], step: 0.11, wave: 'square', vol: 0.06 },
  pop: { notes: [660], step: 0.06, wave: 'square', vol: 0.05 },
  bell: { notes: [784, 988, 784], step: 0.32, wave: 'triangle', vol: 0.09, tail: 3.5 },
  splash: { notes: [900, 620, 420], step: 0.04, wave: 'sine', vol: 0.07 },
  rustle: { notes: [220, 260, 200, 240], step: 0.035, wave: 'sawtooth', vol: 0.02 },
  chirp: { notes: [1800, 2300, 1900], step: 0.05, wave: 'sine', vol: 0.04 },
};

/** Sons de videogame gerados na hora (sem arquivos de áudio). */
export function sfx(kind: Sfx) {
  if (isMuted()) return;
  try {
    ctx ??= new AudioContext();
    const { notes, step, wave, vol, tail = 1.6 } = SOUNDS[kind];
    const detune = kind === 'ok' || kind === 'oops' ? 1 : 0.92 + Math.random() * 0.16;
    notes.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = wave;
      o.frequency.value = f * detune;
      const t = ctx!.currentTime + i * step;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + step * tail);
      o.connect(g).connect(ctx!.destination);
      o.start(t);
      o.stop(t + step * tail + 0.05);
    });
  } catch {
    /* navegador sem áudio */
  }
}
