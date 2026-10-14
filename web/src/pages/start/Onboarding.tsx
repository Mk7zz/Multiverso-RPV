import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { BRAND } from '../../brand';
import { Avatar, DEFAULT_AVATAR } from '../../components/Avatar';
import { AvatarEditor } from '../../components/AvatarEditor';
import { Dialogue } from '../../components/Dialogue';
import { ErrorBox, Field } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { MUNICIPALITIES } from '../../lib/format';
import { useDocumentTitle } from '../../lib/hooks';
import type { AvatarConfig } from '../../lib/types';
import { GameShell } from './TitleScreen';

const STEPS = ['Nome', 'Personagem', 'Origem', 'Salvar'] as const;
const DRAFT_KEY = 'mv:onboarding';

interface Draft {
  step: number;
  name: string;
  avatar: AvatarConfig;
  municipality: string;
  school: string;
  birth_date: string;
  email: string;
}

function loadDraft(): Draft {
  const empty: Draft = { step: 0, name: '', avatar: DEFAULT_AVATAR, municipality: '', school: '', birth_date: '', email: '' };
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
  } catch {
    return empty;
  }
}

function saveDraft(d: Draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    /* navegação privada: segue sem rascunho */
  }
}

const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? '';

function Steps({ step }: { step: number }) {
  return (
    <ol className="quest-steps" aria-label={`Etapa ${step + 1} de ${STEPS.length}`}>
      {STEPS.map((s, i) => (
        <li key={s} className={i < step ? 'done' : i === step ? 'current' : ''}>
          <span className="quest-step-dot">{i + 1}</span>
          <span className="quest-step-label">{s}</span>
        </li>
      ))}
    </ol>
  );
}

/** Onboarding em forma de jogo: nome → personagem → origem → conta. */
export function Onboarding() {
  useDocumentTitle('Novo jogo');
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [d, setD] = useState<Draft>(loadDraft);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const patch = (p: Partial<Draft>) => setD((cur) => ({ ...cur, ...p }));

  useEffect(() => saveDraft(d), [d]);
  useEffect(() => setError(null), [d.step]);

  if (user) return <Navigate to="/painel" replace />;

  const go = (step: number) => patch({ step });
  const first = firstName(d.name);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError('As senhas não conferem.');
    setBusy(true);
    setError(null);
    try {
      await register({ name: d.name.trim(), email: d.email, password, municipality: d.municipality, school: d.school, birth_date: d.birth_date, avatar: d.avatar });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignorado */
      }
      const next = params.get('next');
      navigate(next && next.startsWith('/') && !next.startsWith('//') ? next : '/painel?bemvindo=1', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GameShell wide={d.step === 1}>
      <div className="onboarding">
        <Steps step={d.step} />

        {d.step === 0 && (
          <form
            className="px-panel stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (d.name.trim().split(/\s+/).length < 2) return setError('Escreva nome e sobrenome. É assim que ele vai aparecer nos seus certificados.');
              go(1);
            }}
          >
            <Dialogue text={`Oi! Eu sou a ${BRAND.guide.name}, ${BRAND.guide.role}. Antes de abrir os portões, preciso te conhecer. Qual é o seu nome completo?`} />
            <label className="name-input">
              <span className="sr-only">Nome completo</span>
              <input
                className="input px-input"
                autoFocus
                required
                minLength={3}
                maxLength={120}
                autoComplete="name"
                placeholder="Digite seu nome"
                value={d.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </label>
            <ErrorBox error={error} />
            <div className="row between">
              <Link to="/" className="btn ghost">
                ‹ Voltar
              </Link>
              <button className="btn accent lg" disabled={!d.name.trim()}>
                Confirmar ›
              </button>
            </div>
          </form>
        )}

        {d.step === 1 && (
          <div className="px-panel stack">
            <Dialogue compact text={`Prazer, ${first}! Agora monte o seu personagem. É com ele que você vai andar pelo ${BRAND.world.name}.`} />
            <AvatarEditor value={d.avatar} onChange={(avatar) => patch({ avatar })} name={d.name} />
            <div className="row between">
              <button type="button" className="btn ghost" onClick={() => go(0)}>
                ‹ Voltar
              </button>
              <button type="button" className="btn accent lg" onClick={() => go(2)}>
                Ficou ótimo ›
              </button>
            </div>
          </div>
        )}

        {d.step === 2 && (
          <form
            className="px-panel stack"
            onSubmit={(e) => {
              e.preventDefault();
              go(3);
            }}
          >
            <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <Avatar config={d.avatar} name={d.name} size={72} />
              <Dialogue compact text={`De onde você vem, ${first}? Assim eu te mostro quem está explorando perto de você.`} />
            </div>
            <div className="form-grid">
              <Field label="Município">
                <input className="input" required minLength={2} list="ob-municipios" value={d.municipality} onChange={(e) => patch({ municipality: e.target.value })} />
                <datalist id="ob-municipios">
                  {MUNICIPALITIES.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </Field>
              <Field label="Data de nascimento">
                <input className="input" type="date" value={d.birth_date} onChange={(e) => patch({ birth_date: e.target.value })} />
              </Field>
              <Field label="Escola (opcional)" className="full">
                <input className="input" value={d.school} onChange={(e) => patch({ school: e.target.value })} />
              </Field>
            </div>
            <div className="row between">
              <button type="button" className="btn ghost" onClick={() => go(1)}>
                ‹ Voltar
              </button>
              <button className="btn accent lg">Continuar ›</button>
            </div>
          </form>
        )}

        {d.step === 3 && (
          <form className="px-panel stack" onSubmit={submit}>
            <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <Avatar config={d.avatar} name={d.name} size={72} />
              <Dialogue compact text="Última etapa: crie seu acesso para salvar o progresso, os pontos e os certificados." />
            </div>
            <Field label="E-mail">
              <input className="input" type="email" required autoComplete="email" value={d.email} onChange={(e) => patch({ email: e.target.value })} />
            </Field>
            <div className="form-grid">
              <Field label="Senha" hint="Mínimo de 8 caracteres">
                <input className="input" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
              <Field label="Confirmar senha">
                <input className="input" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </Field>
            </div>
            <ErrorBox error={error} />
            <div className="row between">
              <button type="button" className="btn ghost" onClick={() => go(2)}>
                ‹ Voltar
              </button>
              <button className="btn accent lg" disabled={busy}>
                {busy ? 'Abrindo os portões…' : `Entrar ${BRAND.world.withPrep} ›`}
              </button>
            </div>
            <p className="center small muted" style={{ margin: 0 }}>
              Já tem uma conta? <Link to="/entrar">Continuar jornada</Link>
            </p>
          </form>
        )}
      </div>
    </GameShell>
  );
}
