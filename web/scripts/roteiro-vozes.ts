/**
 * Gera docs/ROTEIRO-VOZES.md: todas as falas gravadas por crianças (Mestres do Saber e a Pomba,
 * que narra os pontos focais), separadas entre falas de menina e de menino, com o nome do
 * arquivo de cada gravação. Rodar com `npm run roteiro -w web` sempre que mudar alguma fala.
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { clean, MASTER_PLACES } from '../src/lib/cidade';
import { allClips, POMBA, pombaClips, type Clip } from '../src/lib/vozes';

// O npm roda o script de dentro de web/.
const OUT = resolve(process.cwd(), '../docs/ROTEIRO-VOZES.md');
const VOZES = resolve(process.cwd(), 'public/vozes');

interface Voice {
  folder: string;
  name: string;
  /** Como o personagem fala (para quem vai gravar). */
  how: string;
  blocks: { title: string; clips: Clip[] }[];
}

const master = (folder: string, how: string): Voice => ({ folder, name: MASTER_PLACES[folder].master!.name, how, blocks: allClips(folder) });

const GROUPS: { title: string; voices: Voice[] }[] = [
  {
    title: 'Falas para gravar com menina',
    voices: [
      master('dona-rosa', 'Uma vovó carinhosa. Fala devagar e com doçura, como quem conversa com um netinho.'),
      { folder: POMBA, name: 'Pomba (narradora dos lugares)', how: 'A pombinha guia, alegre e animada, que passeia com a criança pela cidade.', blocks: pombaClips() },
    ],
  },
  {
    title: 'Falas para gravar com menino',
    voices: [
      master('seu-zico', 'Um vovô da roça, calmo e brincalhão. Pode engrossar um pouquinho a voz e falar devagar, sem pressa.'),
      master('sektor', 'Um rapaz animado do Hip Hop. Fala com ritmo e alegria, como quem está numa roda de dança.'),
    ],
  },
];

/** Gravações que já estão na pasta (qualquer formato aceito). */
function recorded(folder: string) {
  try {
    return new Set(readdirSync(resolve(VOZES, folder)).map((f) => f.replace(/\.(mp3|m4a|opus|ogg|wav)$/, '')));
  } catch {
    return new Set<string>();
  }
}

const count = (vs: Voice[]) => vs.reduce((n, v) => n + v.blocks.reduce((k, b) => k + b.clips.length, 0), 0);
const total = count(GROUPS.flatMap((g) => g.voices));

const parts: string[] = [
  '# Roteiro de vozes',
  '',
  '> Gerado a partir do jogo (`npm run roteiro -w web`). Não edite à mão: mude a fala no código e gere de novo.',
  '',
  `São ${total} falas curtas, gravadas por crianças: ${GROUPS.map((g) => `${count(g.voices)} ${g.title.replace('Falas para gravar com ', 'com ')}`).join(' e ')}. Não precisa gravar tudo de uma vez: o que ainda não tiver gravação continua sendo lido pela voz do computador.`,
  '',
  '## Como gravar',
  '',
  '- **Um arquivo por fala**, com o nome exato da coluna "Arquivo" (ex.: `entrada.mp3`). Vale `.mp3`, `.m4a` (gravador do Windows e iPhone), `.opus` (áudio do WhatsApp), `.ogg` ou `.wav`.',
  '- Coloque os arquivos na pasta de quem fala: `web/public/vozes/<pasta>/`. O nome da pasta aparece no título de cada personagem, abaixo.',
  '- Pode gravar no celular, num lugar silencioso, com o aparelho a um palmo da boca.',
  '- Fale **devagar e bem claro**: quem escuta também são crianças aprendendo a ler.',
  '- Deixe só um respiro de silêncio no começo e no fim. Se errar, grave a fala inteira de novo.',
  '- Os emojis foram tirados do roteiro. A coluna "Gravada" mostra o que já está na pasta.',
  '',
];

for (const g of GROUPS) {
  parts.push(`## ${g.title}`, '');
  for (const v of g.voices) {
    const done = recorded(v.folder);
    parts.push(`### ${v.name} (pasta \`${v.folder}\`)`, '', `**Como fala:** ${v.how}`, '');
    for (const block of v.blocks) {
      parts.push(`#### ${block.title}`, '', '| Arquivo | Fala | Gravada |', '| --- | --- | --- |');
      for (const c of block.clips) parts.push(`| \`${c.id}.mp3\` | ${clean(c.text).replace(/\|/g, '\\|')} | ${done.has(c.id!) ? 'sim' : ''} |`);
      parts.push('');
    }
  }
}

writeFileSync(OUT, parts.join('\n'));
console.log(`Roteiro gerado: ${total} falas → docs/ROTEIRO-VOZES.md`);
