/**
 * Cataguases para crianças: os pontos turísticos do mapa, as perguntas de cada lugar e a
 * pontuação guardada no próprio navegador (não precisa de login).
 * Para liberar um lugar novo: troque o item "Em breve" por um lugar com `kind`/`to` próprios
 * e cadastre as perguntas dele em QUESTIONS.
 */
import type { Clip } from './vozes';
import { PLACES, type Place } from './world';

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
 * Mestres do Saber: pessoas da cultura popular que guardam histórias, músicas e costumes.
 * Cada um mora numa casinha da "Rua dos Mestres" (embaixo, no mapa) e recebe a criança
 * dentro de casa, com perguntas. Visuais e o nome da bordadeira são provisórios:
 * trocar quando a equipe definir as características de cada mestre.
 *
 * Falas: escritas para quem ainda está aprendendo a ler. Frases curtas, palavras do dia a dia
 * e o jeitinho mineiro de cada um (o "uai", o "sô", o "trem bão"), sem exagerar no sotaque.
 * São poucas de propósito: crianças gravam as vozes (veja lib/vozes.ts). Ao entrar, o mestre
 * diz uma frase só, dizendo de quem é a casa e chamando para o jogo. Toda curiosidade
 * diz a resposta certa, porque ela é a única coisa falada depois de um erro.
 * - Seu Zico: roceiro contador de causo, calmo e brincalhão.
 *   Recebe com "Ô de fora!", a resposta mineira ao "Ô de casa!".
 * - Sektor: MC e b-boy de Cataguases. Fala no ritmo, solta umas rimas e usa gíria leve.
 * - Dona Cida: avó bordadeira, carinhosa ("minha flor", "meu anjo"). Tem o gato Novelo.
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
    enter: 'Ô de fora! Você entrou na casa do Seu Zico. Bora jogar? 🏡',
    right: ['Ô trem bão! Acertou em cheio! 🎉', 'Nó, cê sabe das coisas, hein!'],
    wrong: ['Ih, quase! Mas não esquenta, não.', 'Uai, errar faz parte! Escuta só...'],
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
    enter: 'Oi, minha flor! Você entrou na casa da Dona Cida. Vamos brincar? 🌸',
    right: ['Muito bem, minha flor! Que orgulho! 💛', 'Nossa, que capricho! Acertou!'],
    wrong: ['Quase! Devagarinho a gente aprende.', 'Não tem problema, meu anjo. Eu te explico.'],
    win: ['Que capricho!', 'Muito bem!', 'Que orgulho!'],
    oops: ['Quase, meu anjo! 💪', 'Devagarinho se aprende! 💪'],
    tell: 'A Dona Cida ensina:',
    greetings: ['Entra, minha flor! 🌸', 'Vem bordar comigo! 🧵', 'Aceita um biscoitinho? 🍪', 'Um ponto de cada vez 💛', 'Cadê o Novelo? 🐱', 'Que dia bonito, uai! ☀️'],
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
      id: 'dj',
      hook: 'Tá vendo esses toca-discos girando aqui do lado? Sabe quem mexe neles?',
      text: 'Quem solta o som e mexe nos discos?',
      options: [
        { text: 'O DJ', emoji: '🎧' },
        { text: 'O goleiro', emoji: '🧤' },
        { text: 'O padeiro', emoji: '🥖' },
      ],
      fact: 'É o DJ! Ele escolhe as músicas e mexe o disco pra lá e pra cá: zigue-zigue!',
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
  'dona-cida': [
    {
      id: 'agulha',
      hook: 'Pra bordar, a gente precisa de duas coisinhas. Sabe quais são?',
      text: 'Com o que a gente borda?',
      options: [
        { text: 'Agulha e linha', emoji: '🪡' },
        { text: 'Martelo e prego', emoji: '🔨' },
        { text: 'Garfo e faca', emoji: '🍴' },
      ],
      fact: 'Agulha e linha! A agulha leva a linha pra lá e pra cá, e cada furinho vira um pontinho.',
    },
    {
      id: 'bastidor',
      hook: 'Tá vendo esse aro de madeira na minha mão? É o bastidor. Sabe pra que ele serve?',
      text: 'Para que serve o bastidor?',
      options: [
        { text: 'Deixar o pano esticadinho', emoji: '⭕' },
        { text: 'Guardar comida', emoji: '🍲' },
        { text: 'Jogar bola', emoji: '⚽' },
      ],
      fact: 'O bastidor deixa o pano esticadinho, igual um tamborzinho. Aí o bordado fica retinho!',
    },
    {
      id: 'ponto-cruz',
      hook: 'Tem um ponto feito de xizinhos, um do ladinho do outro. Adivinha o nome!',
      text: 'Qual é o nome de um ponto de bordado?',
      options: [
        { text: 'Ponto cruz', emoji: '❌' },
        { text: 'Ponto de ônibus', emoji: '🚌' },
        { text: 'Ponto de exclamação', emoji: '❗' },
      ],
      fact: 'É o ponto cruz! Cada xizinho é um quadradinho colorido, igual à pixel arte deste jogo.',
    },
    {
      id: 'pano-de-prato',
      hook: 'Na casa da vó sempre tem bordado escondido em algum lugar. Sabe onde?',
      text: 'Onde a gente costuma ver bordado?',
      options: [
        { text: 'Em pano de prato e toalha', emoji: '🧺' },
        { text: 'No asfalto da rua', emoji: '🛣️' },
        { text: 'Nas nuvens', emoji: '☁️' },
      ],
      fact: 'Em pano de prato e toalha! Aqui em Minas, a gente borda flor, bichinho e até nome.',
    },
    {
      id: 'aprender',
      hook: 'Eu aprendi a bordar quando era pequenininha. Sabe como?',
      text: 'Como se aprende a bordar?',
      options: [
        { text: 'Com alguém que já sabe', emoji: '👵' },
        { text: 'Dormindo', emoji: '😴' },
        { text: 'Correndo', emoji: '🏃' },
      ],
      fact: 'Com alguém que já sabe! Eu aprendi com a minha avó, e ela aprendeu com a mãe dela.',
    },
    {
      id: 'novelo',
      hook: 'Meu gato tem o nome de uma coisa desta cesta. Sabe o que é um novelo?',
      text: 'O que é um novelo?',
      options: [
        { text: 'Uma bolinha de linha enrolada', emoji: '🧶' },
        { text: 'Um passarinho', emoji: '🐦' },
        { text: 'Uma fruta', emoji: '🍎' },
      ],
      fact: 'Novelo é a linha enroladinha numa bola. Por isso meu gato se chama Novelo!',
    },
  ],
  'seu-zico': [
    {
      id: 'causo',
      hook: 'Aqui em casa todo mundo gosta de causo. Mas cê sabe o que é um causo?',
      text: 'O que é um causo?',
      options: [
        { text: 'Uma história contada de boca em boca', emoji: '🗣️' },
        { text: 'Um tipo de doce', emoji: '🍬' },
        { text: 'Uma pipa', emoji: '🪁' },
      ],
      fact: 'Causo é uma história contada de boca em boca. E cada um que conta aumenta um pouquinho!',
    },
    {
      id: 'rio-pomba',
      hook: 'Lá do quintal dá pra ouvir o barulhinho da água. Sabe qual rio é?',
      text: 'Qual rio passa por Cataguases?',
      options: [
        { text: 'Rio Pomba', emoji: '🏞️' },
        { text: 'Rio Amazonas', emoji: '🐊' },
        { text: 'Rio Nilo', emoji: '🐫' },
      ],
      fact: 'É o Rio Pomba! Ele atravessa a cidade. Quando eu era menino, pescava lambari nele.',
    },
    {
      id: 'pao-de-queijo',
      hook: 'Hum, que cheirinho bom saindo do forno! Adivinha o que é?',
      text: 'Qual é a quitanda mais famosa de Minas Gerais?',
      options: [
        { text: 'Pão de queijo', emoji: '🧀' },
        { text: 'Sushi', emoji: '🍣' },
        { text: 'Taco', emoji: '🌮' },
      ],
      fact: 'Pão de queijo! Em Minas, bolo, biscoito e pão de queijo têm um nome só: quitanda!',
    },
    {
      id: 'folia',
      hook: 'Todo começo de ano, a Folia de Reis bate aqui na porta. Sabe o que é a Folia de Reis?',
      text: 'O que é a Folia de Reis?',
      options: [
        { text: 'Um grupo que canta visitando as casas', emoji: '🎶' },
        { text: 'Um jogo de futebol', emoji: '⚽' },
        { text: 'Uma corrida de carro', emoji: '🏎️' },
      ],
      fact: 'É a Folia de Reis! Eles cantam de casa em casa, com viola e sanfona, até 6 de janeiro.',
    },
    {
      id: 'piao',
      hook: 'No meu tempo de menino não tinha videogame, não. Sabe do que a gente brincava?',
      text: 'Qual destas é uma brincadeira de antigamente?',
      options: [
        { text: 'Pião', emoji: '🪀' },
        { text: 'Videogame', emoji: '🎮' },
        { text: 'Celular', emoji: '📱' },
      ],
      fact: 'Pião, peteca, bola de gude e pipa! E a gente mesmo fazia os brinquedos.',
    },
    {
      id: 'fogao-lenha',
      hook: 'A comida aqui de casa tem um gostinho especial. Sabe onde ela é feita?',
      text: 'Onde se cozinha na roça de Minas?',
      options: [
        { text: 'No fogão a lenha', emoji: '🔥' },
        { text: 'Na geladeira', emoji: '🧊' },
        { text: 'Na máquina de lavar', emoji: '🧺' },
      ],
      fact: 'No fogão a lenha! A comida fica com gostinho de fumaça. Por isso sai fumaça da chaminé!',
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
  'seu-zico': { gender: 'm', rate: 0.86, pitch: 0.85 },
  sektor: { gender: 'm', rate: 1.02, pitch: 1 },
  'dona-cida': { gender: 'f', rate: 0.88, pitch: 1.05 },
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

/** Para qualquer fala em andamento (gravada ou do navegador). */
export function stopVoice() {
  turn++;
  playing?.pause();
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
    const tryExt = (k: number) => {
      if (mine !== turn) return;
      const url = `${base}.${AUDIO_EXT[k]}`;
      if (k >= AUDIO_EXT.length) return speakIt();
      if (missing.has(url)) return tryExt(k + 1);
      const audio = new Audio(url);
      playing = audio;
      let failed = false;
      const fail = () => {
        if (failed) return;
        failed = true;
        missing.add(url);
        tryExt(k + 1);
      };
      audio.onended = () => next(i + 1);
      audio.onerror = fail;
      audio.play().catch((e: unknown) => {
        // Navegador bloqueou o som antes do primeiro toque: não insiste.
        if (!(e instanceof DOMException && e.name === 'NotAllowedError')) fail();
      });
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
