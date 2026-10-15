/**
 * Cataguases para crianças: os pontos turísticos do mapa, as perguntas de cada lugar e a
 * pontuação guardada no próprio navegador (não precisa de login).
 * Para liberar um lugar novo: troque o item "Em breve" por um lugar com `kind`/`to` próprios
 * e cadastre as perguntas dele em QUESTIONS.
 */
import type { Clip } from './vozes';
import { BRIDGE, MAIN_PATH, PLACES, riverX, type Place } from './world';

export interface Option {
  text: string;
  /** Figura de apoio para quem ainda está aprendendo a ler. */
  emoji: string;
}

export interface Question {
  id: string;
  text: string;
  /** Provocação do Mestre do Saber que já termina com a pergunta: é ela que ele fala em voz alta (só nas casas dos mestres). */
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
 * Pontos focais de Cataguases: cada um tem a sua cena (pages/cidade) e as suas perguntas.
 * - Ponte Metálica ("Ponte Velha"): é a própria ponte do mapa sobre o Rio Pomba.
 * - Museu Energisa: casarão art nouveau perto do rio, com a história da energia elétrica.
 */
const PONTE: CityPlace = {
  id: 'ponte',
  label: 'Ponte Metálica',
  title: 'Ponte Metálica',
  hint: 'A Ponte Velha sobre o Rio Pomba',
  intro: 'Chegamos na Ponte Metálica, a Ponte Velha! Ela atravessa o Rio Pomba desde 1915.',
  to: '/lugar/ponte',
  icon: 'map',
  kind: 'bridge',
  x: riverX(MAIN_PATH.y + 4),
  y: BRIDGE.y0,
};

const MUSEU: CityPlace = {
  id: 'museu',
  label: 'Museu Energisa',
  title: 'Museu Energisa',
  hint: 'A história da energia elétrica',
  intro: 'Chegamos no Museu Energisa! Aqui mora a história da energia elétrica de Cataguases.',
  to: '/lugar/museu',
  icon: 'star',
  kind: 'museum',
  x: 212,
  y: 98,
};

const LANDMARKS = [SANTA_RITA, PONTE, MUSEU];

/*
 * Mestres do Saber: pessoas da cultura popular que guardam histórias, músicas e costumes.
 * Cada um mora numa casinha da "Rua dos Mestres" (embaixo, no mapa) e recebe a criança
 * dentro de casa, com perguntas. Os visuais são provisórios: trocar quando a equipe definir
 * as características de cada mestre.
 *
 * Falas: escritas para quem ainda está aprendendo a ler. Frases curtas, palavras do dia a dia
 * e o jeitinho mineiro de cada um (o "uai", o "sô", o "trem bão"), sem exagerar no sotaque.
 * São poucas de propósito: crianças gravam as vozes (veja lib/vozes.ts). Cada mestre tem uma
 * entrada, um acerto, um erro e três perguntas (o Sektor tem mais porque já foi gravado).
 * Toda curiosidade diz a resposta certa, porque ela é a única coisa falada depois de um erro.
 * - Seu Zico: roceiro contador de causo, calmo e brincalhão.
 *   Recebe com "Ô de fora!", a resposta mineira ao "Ô de casa!".
 * - Sektor: MC e b-boy de Cataguases. Fala no ritmo, solta umas rimas e usa gíria leve.
 * - Dona Rosa: avó bordadeira, carinhosa ("minha flor", "meu anjo"). Tem o gato Novelo.
 * Os emojis aparecem na tela como apoio visual; a voz pula eles.
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
    enter: 'Ô de fora! Essa é a casa do Seu Zico. Bora jogar? 🏡',
    right: ['Ô trem bão! Acertou! 🎉'],
    wrong: ['Uai, quase! Escuta só.'],
    win: ['Ô trem bão!', 'Acertou, sô!', 'Nó, que beleza!'],
    oops: ['Quase, sô! 💪', 'Não foi dessa vez! 💪'],
    tell: 'Escuta o Seu Zico:',
    greetings: ['Ô de fora! Pode chegar! 👋', 'Vem prosear! ☕', 'Tem pão de queijo! 🧀', 'Quer ouvir um causo? 📜', 'Cadê a Pipoca? 🐶', 'Uai, sô! 😄'],
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
    enter: 'Oi! Você entrou no estúdio do Sektor. Bora pro desafio? 🎧',
    right: ['Acertou na batida, resposta garantida! 🎤', 'É nóis! Cê manja muito!'],
    wrong: ['Errar faz parte do rolê. Bora aprender!', 'Sem estresse! Se liga que eu te explico.'],
    win: ['É nóis!', 'Mandou bem!', 'Acertou na batida!'],
    oops: ['Quase! Bora de novo 💪', 'Faz parte do rolê! 💪'],
    tell: 'Papo reto do Sektor:',
    greetings: ['Oi! ✌️', 'Chega mais! 🎧', 'Bora dançar? 🕺', 'Tá no ritmo? 🎵', 'Solta o som! 🔊', 'É nóis! 🤙'],
  },
};

const DONA_ROSA: Place = {
  id: 'dona-rosa',
  label: 'Casa da Dona Rosa',
  hint: 'Conheça a Mestre do Saber do bordado',
  to: '/mestre/dona-rosa',
  icon: 'heart',
  kind: 'mestre',
  variant: 'bordado',
  x: 206,
  y: 164,
  wall: '#f6dc8a',
  roof: '#b5523b',
  master: {
    name: 'Dona Rosa',
    craft: 'Mestre do Saber · Bordado',
    room: 'Ateliê da Dona Rosa',
    color: '#12a3a0',
    soft: '#e2f6f5',
    enter: 'Oi, minha flor! Essa é a casa da Dona Rosa. Vamos brincar? 🌸',
    right: ['Muito bem, minha flor! 💛'],
    wrong: ['Quase, meu anjo! Escuta só.'],
    win: ['Que capricho!', 'Muito bem!', 'Que orgulho!'],
    oops: ['Quase, meu anjo! 💪', 'Devagarinho se aprende! 💪'],
    tell: 'A Dona Rosa ensina:',
    greetings: ['Entra, minha flor! 🌸', 'Vem bordar comigo! 🧵', 'Aceita um biscoitinho? 🍪', 'Um ponto de cada vez 💛', 'Cadê o Novelo? 🐱', 'Que dia bonito, uai! ☀️'],
  },
};

const MASTERS = [SEU_ZICO, SEKTOR, DONA_ROSA];

/** Os demais lugares do mapa ficam com cadeado até ganharem desenho e perguntas. */
export const CITY_PLACES: Place[] = [
  ...LANDMARKS,
  ...MASTERS,
  ...PLACES.filter((p) => !['academia', 'casa', 'correio', 'salao', 'quadro'].includes(p.id)).map((p) => ({ ...p, label: 'Em breve', hint: 'Este lugar ainda está em construção', soon: true })),
];

export const CITY_INFO: Record<string, CityPlace> = Object.fromEntries(LANDMARKS.map((p) => [p.id, p]));

/** Casas dos Mestres do Saber que já podem ser visitadas. */
export const MASTER_PLACES: Record<string, Place> = Object.fromEntries(MASTERS.map((m) => [m.id, m]));

// Textos provisórios: revisar com a equipe pedagógica antes de publicar.
// Curtos de propósito: tudo que é falado é gravado por crianças (veja lib/vozes.ts).
export const QUESTIONS: Record<string, Question[]> = {
  sektor: [
    {
      id: 'elementos',
      hook: 'O Hip Hop tem uns elementos que andam sempre juntos. Sabe um deles?',
      text: 'Qual destes é um elemento do Hip Hop?',
      options: [
        { text: 'Breaking, a dança', emoji: '🕺' },
        { text: 'Balé', emoji: '🩰' },
        { text: 'Futebol', emoji: '⚽' },
      ],
      fact: 'O Hip Hop tem DJ, MC, breaking e grafite. E o quinto elemento: o conhecimento!',
    },
    {
      id: 'grafite',
      hook: 'Olha esse muro colorido atrás de mim! Sabe o que é o grafite?',
      text: 'O que é o grafite do Hip Hop?',
      options: [
        { text: 'Arte pintada nos muros', emoji: '🎨' },
        { text: 'Um bichinho de jardim', emoji: '🐛' },
        { text: 'Um tipo de sorvete', emoji: '🍦' },
      ],
      fact: 'Grafite é arte pintada no muro! Mas antes tem que pedir licença pro dono do muro.',
    },
    {
      id: 'origem',
      hook: 'O Hip Hop rodou o mundo até chegar aqui. Sabe onde ele nasceu?',
      text: 'Onde o Hip Hop nasceu?',
      options: [
        { text: 'Nos bairros de Nova York', emoji: '🗽' },
        { text: 'No fundo do mar', emoji: '🐠' },
        { text: 'Na Lua', emoji: '🌙' },
      ],
      fact: 'Nasceu em Nova York, nas festas de rua, lá nos anos 1970. Depois chegou no Brasil!',
    },
    {
      id: 'freeze',
      hook: 'No breaking tem um passo em que a gente fica paradinho, igual estátua. Qual é?',
      text: 'Qual destes é um passo do breaking?',
      options: [
        { text: 'Freeze: congelar numa pose', emoji: '🧊' },
        { text: 'Embaixadinha', emoji: '⚽' },
        { text: 'Nado borboleta', emoji: '🏊' },
      ],
      fact: 'É o freeze: congelar numa pose! O breaking já foi até esporte nas Olimpíadas.',
    },
  ],
  'dona-rosa': [
    {
      id: 'agulha',
      hook: 'Pra bordar, a gente usa o quê?',
      text: 'Com o que a gente borda?',
      options: [
        { text: 'Agulha e linha', emoji: '🪡' },
        { text: 'Martelo e prego', emoji: '🔨' },
        { text: 'Garfo e faca', emoji: '🍴' },
      ],
      fact: 'Agulha e linha! Cada furinho vira um pontinho.',
    },
    {
      id: 'ponto-cruz',
      hook: 'Tem um ponto feito de xizinhos. Qual é?',
      text: 'Qual é o nome de um ponto de bordado?',
      options: [
        { text: 'Ponto cruz', emoji: '❌' },
        { text: 'Ponto de ônibus', emoji: '🚌' },
        { text: 'Ponto de exclamação', emoji: '❗' },
      ],
      fact: 'Ponto cruz! Feito de xizinhos.',
    },
    {
      id: 'aprender',
      hook: 'Como será que eu aprendi a bordar?',
      text: 'Como se aprende a bordar?',
      options: [
        { text: 'Com alguém que já sabe', emoji: '👵' },
        { text: 'Dormindo', emoji: '😴' },
        { text: 'Correndo', emoji: '🏃' },
      ],
      fact: 'Com quem já sabe! Eu aprendi com a minha avó.',
    },
  ],
  'seu-zico': [
    {
      id: 'causo',
      hook: 'Cê sabe o que é um causo?',
      text: 'O que é um causo?',
      options: [
        { text: 'Uma história contada de boca em boca', emoji: '🗣️' },
        { text: 'Um tipo de doce', emoji: '🍬' },
        { text: 'Uma pipa', emoji: '🪁' },
      ],
      fact: 'É uma história contada de boca em boca!',
    },
    {
      id: 'rio-pomba',
      hook: 'Que rio passa aqui em Cataguases?',
      text: 'Qual rio passa por Cataguases?',
      options: [
        { text: 'Rio Pomba', emoji: '🏞️' },
        { text: 'Rio Amazonas', emoji: '🐊' },
        { text: 'Rio Nilo', emoji: '🐫' },
      ],
      fact: 'O Rio Pomba! Eu pescava lambari nele.',
    },
    {
      id: 'pao-de-queijo',
      hook: 'Que cheirinho bom! Adivinha o que é?',
      text: 'Qual é a quitanda mais famosa de Minas Gerais?',
      options: [
        { text: 'Pão de queijo', emoji: '🧀' },
        { text: 'Sushi', emoji: '🍣' },
        { text: 'Taco', emoji: '🌮' },
      ],
      fact: 'Pão de queijo, uai! O orgulho de Minas.',
    },
  ],
  ponte: [
    {
      id: 'apelido',
      text: 'Como o povo chama esta ponte?',
      options: [
        { text: 'Ponte Velha', emoji: '🌉' },
        { text: 'Ponte do Arco-Íris', emoji: '🌈' },
        { text: 'Ponte de Chocolate', emoji: '🍫' },
      ],
      fact: 'Ponte Velha! Ela tem mais de cem anos.',
    },
    {
      id: 'rio',
      text: 'Qual rio passa embaixo da ponte?',
      options: [
        { text: 'Rio Pomba', emoji: '🏞️' },
        { text: 'Rio Amazonas', emoji: '🐊' },
        { text: 'Rio Nilo', emoji: '🐫' },
      ],
      fact: 'O Rio Pomba!',
    },
    {
      id: 'ferro',
      text: 'Do que a ponte é feita?',
      options: [
        { text: 'De ferro', emoji: '🔩' },
        { text: 'De madeira', emoji: '🪵' },
        { text: 'De papel', emoji: '📄' },
      ],
      fact: 'De ferro! E ela é bem forte.',
    },
  ],
  museu: [
    {
      id: 'historia',
      text: 'O museu conta a história de quê?',
      options: [
        { text: 'Da energia elétrica', emoji: '⚡' },
        { text: 'Dos dinossauros', emoji: '🦕' },
        { text: 'Dos piratas', emoji: '🦜' },
      ],
      fact: 'Da energia elétrica!',
    },
    {
      id: 'turbina',
      text: 'Como a água vira energia?',
      options: [
        { text: 'Girando uma turbina', emoji: '🌀' },
        { text: 'Esquentando no fogão', emoji: '🔥' },
        { text: 'Virando gelo', emoji: '🧊' },
      ],
      fact: 'Girando a turbina!',
    },
    {
      id: 'economizar',
      text: 'Como a gente economiza energia?',
      options: [
        { text: 'Apagar a luz ao sair', emoji: '💡' },
        { text: 'Deixar a TV ligada', emoji: '📺' },
        { text: 'Abrir a geladeira toda hora', emoji: '🧊' },
      ],
      fact: 'Apagando a luz ao sair!',
    },
  ],
  'santa-rita': [
    {
      id: 'nome-praca',
      text: 'Qual é o nome desta praça?',
      options: [
        { text: 'Santa Rita', emoji: '🌹' },
        { text: 'São João', emoji: '🔥' },
        { text: 'Santa Luzia', emoji: '🕯️' },
      ],
      fact: 'Santa Rita! A santa das rosas.',
    },
    {
      id: 'torre-cruz',
      text: 'O que tem no alto da torre?',
      options: [
        { text: 'Uma cruz', emoji: '✝️' },
        { text: 'Uma estrela', emoji: '⭐' },
        { text: 'Um balão', emoji: '🎈' },
      ],
      fact: 'Uma cruz! E lá dentro mora o sino.',
    },
    {
      id: 'espelho-agua',
      text: 'O que parece um espelho na frente da igreja?',
      options: [
        { text: 'Um laguinho', emoji: '💧' },
        { text: 'Uma praia', emoji: '🏖️' },
        { text: 'Uma montanha', emoji: '⛰️' },
      ],
      fact: 'O laguinho! A igreja aparece nele.',
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
  if (v) stopVoice();
}

/**
 * Jeito de falar de quem fala: voz de homem ou de mulher, velocidade e tom.
 * As vozes "naturais" (Edge: Francisca, Antonio, Thalita; Chrome: Google) soam bem mais
 * humanas que as do sistema e ganham prioridade quando existem.
 */
type Voice = { gender: 'm' | 'f'; rate: number; pitch: number };
const VOICES: Record<string, Voice> = {
  narrador: { gender: 'f', rate: 0.95, pitch: 1.1 },
  pomba: { gender: 'f', rate: 0.95, pitch: 1.1 },
  'seu-zico': { gender: 'm', rate: 0.86, pitch: 0.85 },
  sektor: { gender: 'm', rate: 1.02, pitch: 1 },
  'dona-rosa': { gender: 'f', rate: 0.88, pitch: 1.05 },
};
const MALE = /antonio|daniel|donato|fabio|humberto|julio|nicolau|valerio|ricardo|male|masculin/i;
const FEMALE = /francisca|thalita|maria|leila|leticia|manuela|yara|giovanna|brenda|elza|luciana|female|feminin/i;

let voiceList: SpeechSynthesisVoice[] = [];
if (typeof window !== 'undefined' && window.speechSynthesis) {
  const load = () => (voiceList = window.speechSynthesis.getVoices());
  load();
  window.speechSynthesis.addEventListener?.('voiceschanged', load);
}

/** A voz em português mais humana disponível, preferindo o gênero pedido. */
function pickVoice(gender: 'm' | 'f') {
  const pt = voiceList.filter((v) => v.lang.replace('_', '-').toLowerCase() === 'pt-br');
  const score = (v: SpeechSynthesisVoice) => {
    let s = 0;
    if (/natural|neural|online/i.test(v.name)) s += 10;
    else if (/google/i.test(v.name)) s += 6;
    if ((gender === 'm' ? MALE : FEMALE).test(v.name)) s += 4;
    else if ((gender === 'm' ? FEMALE : MALE).test(v.name)) s -= 4;
    return s;
  };
  return pt.sort((a, b) => score(b) - score(a))[0];
}

/** Tira os emojis (apoio visual na tela): a voz não lê o nome deles. */
export const clean = (text: string) => text.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '').replace(/\s+/g, ' ').trim();

/** Lê um texto com a voz do navegador, no jeito de falar de `who`. */
function tts(text: string, who: string, onEnd?: () => void) {
  const synth = window.speechSynthesis;
  if (!synth) return onEnd?.();
  const u = new SpeechSynthesisUtterance(clean(text));
  const style = VOICES[who] ?? VOICES.narrador;
  u.lang = 'pt-BR';
  u.rate = style.rate;
  u.pitch = style.pitch;
  const voice = pickVoice(style.gender);
  if (voice) u.voice = voice;
  if (onEnd) u.onend = onEnd;
  synth.speak(u);
}

let playing: HTMLAudioElement | null = null;
let turn = 0;
/** Gravações que não existem (não tenta baixar de novo). */
const missing = new Set<string>();
/** Formato que já funcionou para cada mestre: é o primeiro a tentar nas próximas falas dele. */
const foundExt: Record<string, string> = {};

/** Para qualquer fala em andamento (gravada ou do navegador). */
export function stopVoice() {
  turn++;
  if (playing) {
    // Solta os avisos antes de pausar: a fala interrompida não pode passar por gravação que falta.
    playing.onended = playing.onerror = null;
    playing.pause();
  }
  playing = null;
  window.speechSynthesis?.cancel();
}

/** Formatos aceitos para as gravações, na ordem em que o jogo procura (celular costuma gravar .m4a; WhatsApp, .opus). */
const AUDIO_EXT = ['mp3', 'm4a', 'opus', 'ogg', 'wav'];

/**
 * Fala uma sequência de trechos. Cada trecho com `id` toca a gravação de `who`
 * (web/public/vozes/<who>/<id>.mp3, ou .m4a/.opus/.ogg/.wav; veja lib/vozes.ts);
 * sem gravação, a voz do navegador lê.
 */
export function say(parts: Clip[], who = 'narrador') {
  stopVoice();
  if (isMuted()) return;
  const mine = turn;
  const next = (i: number) => {
    if (mine !== turn || i >= parts.length) return;
    const { id, text } = parts[i];
    const speakIt = () => tts(text, who, () => next(i + 1));
    if (!id) return speakIt();
    const base = `/vozes/${who}/${id}`;
    const exts = foundExt[who] ? [foundExt[who], ...AUDIO_EXT.filter((e) => e !== foundExt[who])] : AUDIO_EXT;
    const tryExt = (k: number) => {
      if (mine !== turn) return;
      if (k >= exts.length) return speakIt();
      const url = `${base}.${exts[k]}`;
      if (missing.has(url)) return tryExt(k + 1);
      const audio = new Audio(url);
      playing = audio;
      let failed = false;
      const fail = () => {
        if (failed || mine !== turn) return;
        failed = true;
        missing.add(url);
        tryExt(k + 1);
      };
      audio.onended = () => next(i + 1);
      audio.onerror = fail;
      audio.play().then(
        () => (foundExt[who] = exts[k]),
        (e: unknown) => {
          // Navegador bloqueou o som antes do primeiro toque (NotAllowed) ou a fala foi
          // interrompida por outra (Abort): a gravação existe, não é para cair na voz do navegador.
          if (!(e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'AbortError'))) fail();
        },
      );
    };
    tryExt(0);
  };
  next(0);
}

/** Lê o texto em voz alta (português do Brasil), para quem ainda não lê sozinho. `who` é o id do mestre. */
export function speak(text: string, who = 'narrador') {
  say([{ text }], who);
}

let ctx: AudioContext | null = null;

export type Sfx = 'ok' | 'oops' | 'pop' | 'bell' | 'splash' | 'rustle' | 'chirp' | 'honk' | 'clang' | 'zap' | 'whir' | 'creak';

/** Cada som: notas (Hz), duração de cada nota, forma de onda e volume. Pequenas variações a cada toque. */
const SOUNDS: Record<Sfx, { notes: number[]; step: number; wave: OscillatorType; vol: number; tail?: number }> = {
  ok: { notes: [523, 659, 784, 1047], step: 0.11, wave: 'square', vol: 0.06 },
  oops: { notes: [330, 247], step: 0.11, wave: 'square', vol: 0.06 },
  pop: { notes: [660], step: 0.06, wave: 'square', vol: 0.05 },
  bell: { notes: [784, 988, 784], step: 0.32, wave: 'triangle', vol: 0.09, tail: 3.5 },
  splash: { notes: [900, 620, 420], step: 0.04, wave: 'sine', vol: 0.07 },
  rustle: { notes: [220, 260, 200, 240], step: 0.035, wave: 'sawtooth', vol: 0.02 },
  chirp: { notes: [1800, 2300, 1900], step: 0.05, wave: 'sine', vol: 0.04 },
  honk: { notes: [392, 392], step: 0.16, wave: 'square', vol: 0.05, tail: 0.7 },
  clang: { notes: [1320, 990, 1480], step: 0.05, wave: 'triangle', vol: 0.06, tail: 7 },
  zap: { notes: [220, 440, 880, 1760], step: 0.04, wave: 'sawtooth', vol: 0.025 },
  whir: { notes: [98, 131, 175, 233, 311, 415], step: 0.09, wave: 'triangle', vol: 0.06 },
  creak: { notes: [190, 160, 175, 140], step: 0.1, wave: 'sawtooth', vol: 0.02 },
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
