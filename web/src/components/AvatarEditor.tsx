import { useState } from 'react';
import type { AvatarConfig } from '../lib/types';
import { Avatar, AVATAR_OPTIONS, AVATAR_PALETTES, DEFAULT_AVATAR } from './Avatar';
import { PixelIcon } from './PixelIcon';

type OptionKey = keyof typeof AVATAR_OPTIONS;
type ColorKey = keyof typeof AVATAR_PALETTES;

const TABS: { key: string; label: string; icon: string; options: OptionKey[]; colors: [ColorKey, string][] }[] = [
  { key: 'corpo', label: 'Corpo', icon: 'user', options: [], colors: [['skin', 'Tom de pele']] },
  { key: 'cabelo', label: 'Cabelo', icon: 'sprout', options: ['hair'], colors: [['hairColor', 'Cor']] },
  { key: 'rosto', label: 'Rosto', icon: 'star', options: ['eyes', 'mouth'], colors: [] },
  { key: 'roupa', label: 'Roupa', icon: 'backpack', options: ['outfit'], colors: [['shirt', 'Parte de cima'], ['pants', 'Calça']] },
  { key: 'extra', label: 'Extras', icon: 'crown', options: ['accessory'], colors: [['background', 'Fundo do cartão']] },
];

const OPTION_LABEL: Record<OptionKey, string> = { hair: 'Estilo', eyes: 'Olhos', mouth: 'Boca', outfit: 'Modelo', accessory: 'Acessório' };

export function randomAvatar(): AvatarConfig {
  const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
  return {
    skin: pick(AVATAR_PALETTES.skin),
    hair: pick(AVATAR_OPTIONS.hair)[0],
    hairColor: pick(AVATAR_PALETTES.hairColor),
    eyes: pick(AVATAR_OPTIONS.eyes)[0],
    mouth: pick(AVATAR_OPTIONS.mouth)[0],
    shirt: pick(AVATAR_PALETTES.shirt),
    pants: pick(AVATAR_PALETTES.pants),
    outfit: pick(AVATAR_OPTIONS.outfit)[0],
    accessory: pick(AVATAR_OPTIONS.accessory)[0],
    background: pick(AVATAR_PALETTES.background),
  };
}

/** Seletor estilo videogame: ‹ valor › */
function Cycler({ k, cfg, onChange }: { k: OptionKey; cfg: AvatarConfig; onChange: (v: string) => void }) {
  const opts = AVATAR_OPTIONS[k] as readonly (readonly [string, string])[];
  const current = (cfg[k] as string | undefined) ?? opts[0][0];
  const i = Math.max(0, opts.findIndex(([v]) => v === current));
  const go = (d: number) => onChange(opts[(i + d + opts.length) % opts.length][0]);
  return (
    <div className="cycler">
      <span className="cycler-label">{OPTION_LABEL[k]}</span>
      <div className="cycler-control">
        <button type="button" className="px-arrow" onClick={() => go(-1)} aria-label={`${OPTION_LABEL[k]} anterior`}>
          ‹
        </button>
        <span className="cycler-value" aria-live="polite">
          {opts[i][1]}
        </span>
        <button type="button" className="px-arrow" onClick={() => go(1)} aria-label={`Próximo ${OPTION_LABEL[k].toLowerCase()}`}>
          ›
        </button>
      </div>
    </div>
  );
}

/** Criador de personagem: prévia animada à esquerda, abas de customização à direita. */
export function AvatarEditor({ value, onChange, name }: { value: AvatarConfig; onChange: (c: AvatarConfig) => void; name?: string }) {
  const [tab, setTab] = useState(TABS[0].key);
  const [walking, setWalking] = useState(false);
  const cfg = { ...DEFAULT_AVATAR, ...value };
  const set = (k: keyof AvatarConfig, v: string) => onChange({ ...cfg, [k]: v } as AvatarConfig);
  const t = TABS.find((x) => x.key === tab)!;

  return (
    <div className="creator">
      <div className="creator-stage">
        <div className="creator-spot">
          <Avatar config={cfg} name={name} size={220} variant="full" walking={walking} />
        </div>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn secondary sm" onClick={() => setWalking(!walking)}>
            <PixelIcon name="boot" size={16} /> {walking ? 'Parar' : 'Andar'}
          </button>
          <button type="button" className="btn secondary sm" onClick={() => onChange(randomAvatar())}>
            <PixelIcon name="dice" size={16} /> Sortear
          </button>
        </div>
      </div>
      <div className="creator-panel">
        <div className="creator-tabs" role="tablist">
          {TABS.map((x) => (
            <button key={x.key} type="button" role="tab" aria-selected={tab === x.key} className={tab === x.key ? 'on' : ''} onClick={() => setTab(x.key)}>
              <PixelIcon name={x.icon} size={18} />
              <span>{x.label}</span>
            </button>
          ))}
        </div>
        <div className="creator-body">
          {t.options.map((k) => (
            <Cycler key={k} k={k} cfg={cfg} onChange={(v) => set(k, v)} />
          ))}
          {t.colors.map(([k, label]) => (
            <div key={k} className="cycler">
              <span className="cycler-label">{label}</span>
              <div className="swatches">
                {AVATAR_PALETTES[k].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`swatch ${cfg[k] === c ? 'on' : ''}`}
                    style={{ background: c }}
                    onClick={() => set(k, c)}
                    aria-label={`${label} ${c}`}
                    aria-pressed={cfg[k] === c}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
