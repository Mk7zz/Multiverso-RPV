/**
 * Vozes gravadas dos Mestres do Saber.
 *
 * Cada fala tem um nome de arquivo fixo. Quando existe a gravação em
 * `web/public/vozes/<mestre>/<nome>.mp3`, o jogo toca ela; quando não existe, lê o texto
 * com a voz do navegador. Dá para gravar aos poucos: o que ainda não foi gravado continua
 * funcionando.
 *
 * O roteiro com todas as falas e os nomes dos arquivos sai de `npm run roteiro -w web`
 * (fica em docs/ROTEIRO-VOZES.md). Se mudar um texto aqui no código, regrave a fala.
 */
import { hello, MASTER_PLACES, QUESTIONS, type Question } from './cidade';
import type { Master } from './world';

export interface Clip {
  /** Nome do arquivo (sem .mp3). Sem nome, a fala é sempre lida pela voz do navegador. */
  id?: string;
  text: string;
}

export const voiceUrl = (who: string, id: string) => `/vozes/${who}/${id}.mp3`;

/** Falas com `{oi}` são gravadas três vezes: de manhã, de tarde e de noite. */
export const PERIODS = { dia: 'Bom dia', tarde: 'Boa tarde', noite: 'Boa noite' } as const;
type Period = keyof typeof PERIODS;
const periodOf = (oi: string) => (Object.keys(PERIODS) as Period[]).find((k) => PERIODS[k] === oi) ?? 'dia';

function line(base: string, text: string, oi: string): Clip {
  return text.includes('{oi}') ? { id: `${base}-${periodOf(oi)}`, text: text.replaceAll('{oi}', oi) } : { id: base, text };
}

/** Boas-vindas: a apresentação (`back` nulo) ou um dos jeitos de receber quem volta. */
export const welcomeClips = (m: Master, back: number | null, oi = hello()): Clip[] =>
  back === null ? m.intro.map((t, i) => line(`intro-${i + 1}`, t, oi)) : m.back[back].map((t, i) => line(`volta-${back + 1}-${i + 1}`, t, oi));

export const rightClip = (m: Master, k: number): Clip => ({ id: `acerto-${k + 1}`, text: m.right[k] });
export const wrongClip = (m: Master, k: number): Clip => ({ id: `erro-${k + 1}`, text: m.wrong[k] });
export const STARS: Clip = { id: 'estrelas', text: 'Você ganhou dez estrelas!' };

export function questionClips(q: Question) {
  return {
    hook: q.hook ? ({ id: `${q.id}-gancho`, text: q.hook } as Clip) : null,
    text: { id: `${q.id}-pergunta`, text: q.text } as Clip,
    answer: { id: `${q.id}-resposta`, text: `A resposta certa é: ${q.options[0].text}.` } as Clip,
    fact: { id: `${q.id}-curiosidade`, text: q.fact } as Clip,
  };
}

/** Todas as falas de um mestre, em blocos, para o roteiro de gravação. */
export function allClips(placeId: string): { title: string; clips: Clip[] }[] {
  const m = MASTER_PLACES[placeId].master!;
  const periods = Object.values(PERIODS);
  // Versões de bom dia/boa tarde/boa noite ficam juntas, logo depois da primeira.
  const withPeriods = (make: (oi: string) => Clip[]) => {
    const [first, ...rest] = periods.map(make);
    return first.flatMap((c, i) => [c, ...rest.map((r) => r[i]).filter((r) => r.id !== c.id)]);
  };
  return [
    { title: 'Primeira visita', clips: withPeriods((oi) => welcomeClips(m, null, oi)) },
    ...m.back.map((_, b) => ({ title: `Quando a criança volta (jeito ${b + 1})`, clips: withPeriods((oi) => welcomeClips(m, b, oi)) })),
    { title: 'Quando acerta', clips: [...m.right.map((_, k) => rightClip(m, k)), STARS] },
    { title: 'Quando erra', clips: m.wrong.map((_, k) => wrongClip(m, k)) },
    ...(QUESTIONS[placeId] ?? []).map((q) => {
      const c = questionClips(q);
      return { title: `Pergunta: ${q.text}`, clips: [c.hook, c.text, c.answer, c.fact].filter((x): x is Clip => !!x) };
    }),
  ];
}
