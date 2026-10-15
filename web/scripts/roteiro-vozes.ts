/**
 * Gera docs/ROTEIRO-VOZES.md: todas as falas dos Mestres do Saber, com o nome do arquivo de
 * cada gravação. Rodar com `npm run roteiro -w web` sempre que mudar alguma fala.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { clean, MASTER_PLACES } from '../src/lib/cidade';
import { allClips } from '../src/lib/vozes';

// O npm roda o script de dentro de web/.
const OUT = resolve(process.cwd(), '../docs/ROTEIRO-VOZES.md');

/** Como cada personagem fala (para quem vai gravar). */
const DIRECTION: Record<string, string> = {
  'seu-zico': 'Um vovô da roça, calmo e brincalhão. Pode engrossar um pouquinho a voz e falar devagar, sem pressa.',
  sektor: 'Um rapaz animado do Hip Hop. Fala com ritmo e alegria, como quem está numa roda de dança.',
  'dona-cida': 'Uma vovó carinhosa. Fala devagar e com doçura, como quem conversa com um netinho.',
};

const total = Object.keys(MASTER_PLACES).reduce((n, id) => n + allClips(id).reduce((k, b) => k + b.clips.length, 0), 0);

const parts: string[] = [
  '# Roteiro de vozes dos Mestres do Saber',
  '',
  '> Gerado a partir do jogo (`npm run roteiro -w web`). Não edite à mão: mude a fala no código e gere de novo.',
  '',
  `São ${total} falas curtas, divididas entre os três mestres e gravadas por crianças. Não precisa gravar tudo de uma vez: o que ainda não tiver gravação continua sendo lido pela voz do computador.`,
  '',
  '## Como gravar',
  '',
  '- **Um arquivo por fala**, com o nome exato da coluna "Arquivo" e terminando em `.mp3` (ex.: `entrada.mp3`).',
  '- Coloque os arquivos na pasta do mestre: `web/public/vozes/<pasta>/` (crie a pasta se ainda não existir). O nome da pasta de cada um aparece no título dele, abaixo.',
  '- Pode gravar no celular, num lugar silencioso, com o aparelho a um palmo da boca.',
  '- Fale **devagar e bem claro**: quem escuta também são crianças aprendendo a ler.',
  '- Deixe só um respiro de silêncio no começo e no fim. Se errar, grave a fala inteira de novo.',
  '- Leia o texto como está escrito, com o jeitinho de cada personagem. Os emojis foram tirados do roteiro.',
  '- Vale fazer voz de personagem (vovô, vovó, rapaz do Hip Hop), mas o mais importante é dar para entender cada palavra.',
  '- Se alguma palavra soar estranha na boca do personagem, anote. A gente ajusta o texto e gera o roteiro de novo.',
  '',
];

for (const [id, place] of Object.entries(MASTER_PLACES)) {
  const m = place.master!;
  parts.push(`## ${m.name} (pasta \`${id}\`)`, '', `**Como fala:** ${DIRECTION[id] ?? m.craft}`, '');
  for (const block of allClips(id)) {
    parts.push(`### ${block.title}`, '', '| Arquivo | Fala |', '| --- | --- |');
    for (const c of block.clips) parts.push(`| \`${c.id}.mp3\` | ${clean(c.text).replace(/\|/g, '\\|')} |`);
    parts.push('');
  }
}

writeFileSync(OUT, parts.join('\n'));
console.log(`Roteiro gerado: ${total} falas → docs/ROTEIRO-VOZES.md`);
