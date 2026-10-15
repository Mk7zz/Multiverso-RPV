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
  'seu-zico':
    'Senhor da roça, uns 70 anos. Fala calma, sem pressa, com sotaque mineiro do interior. Bem-humorado e acolhedor, como um avô contando causo na porta de casa.',
  sektor:
    'Jovem MC e dançarino de breaking de Cataguases. Animado, com ritmo na fala, quase rimando. Gíria leve e muito positivo: nunca faz a criança se sentir mal por errar.',
  'dona-cida':
    'Avó bordadeira, carinhosa e paciente. Fala devagar e com doçura, sorrindo. Sotaque mineiro. Trata a criança como neta ("minha flor", "meu anjo").',
};

const total = Object.keys(MASTER_PLACES).reduce((n, id) => n + allClips(id).reduce((k, b) => k + b.clips.length, 0), 0);

const parts: string[] = [
  '# Roteiro de vozes dos Mestres do Saber',
  '',
  '> Gerado a partir do jogo (`npm run roteiro -w web`). Não edite à mão: mude a fala no código e gere de novo.',
  '',
  `São ${total} falas curtas, divididas entre os três mestres. Não precisa gravar tudo de uma vez: o que ainda não tiver gravação continua sendo lido pela voz do computador.`,
  '',
  '## Como gravar',
  '',
  '- **Um arquivo por fala**, com o nome exato da coluna "Arquivo" e terminando em `.mp3` (ex.: `intro-1-dia.mp3`).',
  '- Coloque os arquivos na pasta do mestre: `web/public/vozes/<pasta>/` (crie a pasta se ainda não existir). O nome da pasta de cada um aparece no título dele, abaixo.',
  '- Pode gravar no celular, num lugar silencioso, com o aparelho a um palmo da boca.',
  '- Fale **devagar e bem claro**: quem escuta são crianças aprendendo a ler.',
  '- Deixe só um respiro de silêncio no começo e no fim. Se errar, grave a fala inteira de novo.',
  '- Leia o texto como está escrito, com o jeitinho de cada personagem. Os emojis foram tirados do roteiro.',
  '- Falas que começam com Bom dia, Boa tarde ou Boa noite têm três versões. O jogo escolhe pela hora.',
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
