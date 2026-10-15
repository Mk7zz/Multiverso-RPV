/**
 * Vozes gravadas dos Mestres do Saber (gravadas por crianças).
 *
 * Cada fala tem um nome de arquivo fixo. Quando existe a gravação em
 * `web/public/vozes/<mestre>/<nome>.mp3` (ou .m4a, .opus, .ogg, .wav), o jogo toca ela; quando não existe, lê o texto
 * com a voz do navegador. Dá para gravar aos poucos: o que ainda não foi gravado continua
 * funcionando.
 *
 * Por mestre: 1 fala de entrada, 2 de acerto, 2 de erro e, para cada pergunta dele,
 * a pergunta e a curiosidade.
 * O roteiro sai de `npm run roteiro -w web` (docs/ROTEIRO-VOZES.md). Mudou o texto, regrave.
 */
import { MASTER_PLACES, QUESTIONS, type Question } from './cidade';
import type { Master } from './world';

export interface Clip {
  /** Nome do arquivo (sem .mp3). Sem nome, a fala é sempre lida pela voz do navegador. */
  id?: string;
  text: string;
}

/** O que o mestre diz quando a criança entra na casa. */
export const enterClip = (m: Master): Clip => ({ id: 'entrada', text: m.enter });

export const rightClip = (m: Master, k: number): Clip => ({ id: `acerto-${k + 1}`, text: m.right[k] });
export const wrongClip = (m: Master, k: number): Clip => ({ id: `erro-${k + 1}`, text: m.wrong[k] });

/** A pergunta falada é o gancho (que já termina perguntando); a curiosidade sempre diz a resposta certa. */
export function questionClips(q: Question) {
  return {
    ask: { id: `${q.id}-pergunta`, text: q.hook ?? q.text } as Clip,
    fact: { id: `${q.id}-curiosidade`, text: q.fact } as Clip,
  };
}

/** Todas as falas de um mestre, em blocos, para o roteiro de gravação. */
export function allClips(placeId: string): { title: string; clips: Clip[] }[] {
  const m = MASTER_PLACES[placeId].master!;
  return [
    { title: 'Quando a criança entra', clips: [enterClip(m)] },
    { title: 'Quando acerta', clips: m.right.map((_, k) => rightClip(m, k)) },
    { title: 'Quando erra', clips: m.wrong.map((_, k) => wrongClip(m, k)) },
    { title: 'Perguntas e curiosidades', clips: (QUESTIONS[placeId] ?? []).flatMap((q) => Object.values(questionClips(q))) },
  ];
}
