import { useEffect, useState } from 'react';
import { Avatar, DEFAULT_AVATAR } from '../../components/Avatar';
import { AvatarEditor as Creator } from '../../components/AvatarEditor';
import { PixelIcon } from '../../components/PixelIcon';
import { BadgeTile, LevelBadge, XpBar } from '../../components/Game';
import { ErrorBox, Field, Loader, StatCard, Tabs } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDate, fmtDuration, MUNICIPALITIES, timeAgo } from '../../lib/format';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import { useNotifications } from '../../lib/notifications';
import type { AvatarConfig, Badge, User, UserStats } from '../../lib/types';

const REASONS: Record<string, string> = {
  lesson: 'Aula concluída',
  exercise: 'Exercício realizado',
  quiz_pass: 'Avaliação aprovada',
  course_complete: 'Curso concluído',
  daily_study: 'Dia de estudo',
  quest: 'Missão cumprida',
};

export function Profile() {
  useDocumentTitle('Perfil');
  const [tab, setTab] = useState<'conquistas' | 'avatar' | 'dados' | 'conta'>('conquistas');
  const { data, error, reload } = useApi<{ user: User; stats: UserStats; badges: Badge[]; rank: number | null; recentPoints: { points: number; reason: string; created_at: string }[] }>(
    '/profile',
  );
  const allBadges = useApi<{ badges: Badge[] }>('/gamification/badges', [data]);
  const levels = useApi<{ levels: { level: number; name: string; icon: string; min: number }[] }>('/gamification/levels');

  return (
    <div className="container page">
      <Loader data={data} error={error}>
        {(d) => (
          <>
            <div className="row mb">
              <div className="player-avatar">
                <Avatar config={d.user.avatar} name={d.user.name} size={88} />
                <LevelBadge level={d.user.level} />
              </div>
              <div className="grow">
                <h1 style={{ margin: 0 }}>{d.user.name}</h1>
                <div className="player-level">
                  <PixelIcon name={d.user.level.icon} size={16} /> Nível {d.user.level.level} · <strong>{d.user.level.name}</strong>
                </div>
                <span className="muted">
                  {[d.user.municipality, d.user.school].filter(Boolean).join(' · ')} · membro desde {fmtDate(d.user.created_at)}
                </span>
                {d.user.bio && <p className="text-2" style={{ margin: '4px 0 0' }}>{d.user.bio}</p>}
              </div>
            </div>
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                { value: 'conquistas', label: <><PixelIcon name="medal" size={16} /> Conquistas</> },
                { value: 'avatar', label: <><PixelIcon name="palette" size={16} /> Personagem</> },
                { value: 'dados', label: <><PixelIcon name="user" size={16} /> Meus dados</> },
                { value: 'conta', label: <><PixelIcon name="lock" size={16} /> Conta e segurança</> },
              ]}
            />
            {tab === 'conquistas' && (
              <>
                <div className="grid grid-4">
                  <StatCard label="XP" value={d.stats.points} sub={d.rank ? `#${d.rank} no ranking` : undefined} icon="coin" />
                  <StatCard label="Sequência atual" value={`${d.stats.currentStreak} dias`} sub={`Recorde: ${d.stats.bestStreak} dias`} icon="flame" />
                  <StatCard label="Cursos concluídos" value={d.stats.coursesCompleted} sub={`${d.stats.coursesInProgress} em andamento`} icon="gradcap" />
                  <StatCard label="Tempo de estudo" value={fmtDuration(d.stats.studySeconds)} sub={`${d.stats.lessonsCompleted} aulas · ${d.stats.questsCompleted} missões`} icon="clock" />
                </div>
                <div className="section card">
                  <div className="card-title">
                    <span>
                      <PixelIcon name="mountain" size={18} /> Subida da serra
                    </span>
                  </div>
                  <XpBar level={d.user.level} points={d.user.points} />
                  <div className="level-track mt">
                    {levels.data?.levels.map((l) => (
                      <div key={l.level} className={`level-step ${d.user.points >= l.min ? 'reached' : ''} ${d.user.level.level === l.level ? 'current' : ''}`}>
                        <PixelIcon name={l.icon} size={28} className="level-step-icon" />
                        <strong className="small">
                          {l.level}. {l.name}
                        </strong>
                        <span className="muted small">{l.min.toLocaleString('pt-BR')} XP</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="section">
                  <div className="section-head">
                    <h2>Coleção de medalhas</h2>
                    <span className="muted small">
                      {allBadges.data?.badges.filter((b) => b.awarded_at).length ?? 0}/{allBadges.data?.badges.length ?? 0} conquistadas
                    </span>
                  </div>
                  <div className="grid grid-4">
                    {allBadges.data?.badges.map((b) => <BadgeTile key={b.code} b={b} />)}
                  </div>
                </div>
                <div className="section card">
                  <div className="card-title">Pontos recentes</div>
                  {d.recentPoints.length ? (
                    d.recentPoints.map((p, i) => (
                      <div key={i} className="row between small" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                        <span>{REASONS[p.reason] ?? p.reason}</span>
                        <span>
                          <strong style={{ color: 'var(--brand)' }}>+{p.points} XP</strong> <span className="muted">{timeAgo(p.created_at)}</span>
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="muted small">Conclua aulas e avaliações para ganhar pontos.</p>
                  )}
                </div>
              </>
            )}
            {tab === 'avatar' && <AvatarEditor initial={d.user.avatar} name={d.user.name} onSaved={reload} />}
            {tab === 'dados' && <ProfileForm user={d.user} onSaved={reload} />}
            {tab === 'conta' && <AccountSecurity user={d.user} />}
          </>
        )}
      </Loader>
    </div>
  );
}

function AvatarEditor({ initial, name, onSaved }: { initial: AvatarConfig | null; name: string; onSaved: () => void }) {
  const { setUser, user } = useAuth();
  const { toast } = useNotifications();
  const [cfg, setCfg] = useState<AvatarConfig>(initial ?? DEFAULT_AVATAR);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const r = await api.put<{ user: User }>('/profile/avatar', cfg);
      if (user) setUser({ ...user, avatar: r.user.avatar });
      toast('Personagem salvo');
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card stack">
      <Creator value={cfg} onChange={setCfg} name={name} />
      <div className="row end">
        <button className="btn accent" onClick={save} disabled={busy}>
          Salvar personagem
        </button>
      </div>
    </div>
  );
}
function ProfileForm({ user, onSaved }: { user: User; onSaved: () => void }) {
  const auth = useAuth();
  const { toast } = useNotifications();
  const [form, setForm] = useState({ name: user.name, municipality: user.municipality ?? '', school: user.school ?? '', birth_date: user.birth_date ?? '', bio: user.bio ?? '' });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setError(null), [form]);

  async function save() {
    try {
      const r = await api.put<{ user: User }>('/profile', form);
      auth.setUser(r.user);
      toast('Dados atualizados');
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="card stack" style={{ maxWidth: 720 }}>
      <div className="form-grid">
        <Field label="Nome completo"><input className="input" value={form.name} onChange={set('name')} /></Field>
        <Field label="Município">
          <input className="input" list="mun" value={form.municipality} onChange={set('municipality')} />
          <datalist id="mun">{MUNICIPALITIES.map((m) => <option key={m} value={m} />)}</datalist>
        </Field>
        <Field label="Escola"><input className="input" value={form.school} onChange={set('school')} /></Field>
        <Field label="Data de nascimento"><input className="input" type="date" value={form.birth_date} onChange={set('birth_date')} /></Field>
        <Field label="Sobre mim" hint="Visível para seus amigos (até 280 caracteres)" className="full">
          <textarea className="input" maxLength={280} value={form.bio} onChange={set('bio')} />
        </Field>
      </div>
      <ErrorBox error={error} />
      <div className="row end">
        <button className="btn" onClick={save}>Salvar</button>
      </div>
    </div>
  );
}

function AccountSecurity({ user }: { user: User }) {
  const auth = useAuth();
  const { toast } = useNotifications();
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' });
  const [em, setEm] = useState({ email: user.email, password: '' });
  const [error, setError] = useState<string | null>(null);

  async function changePassword() {
    setError(null);
    if (pw.new_password !== pw.confirm) return setError('As senhas não conferem.');
    try {
      await api.post('/auth/change-password', { current_password: pw.current_password, new_password: pw.new_password });
      setPw({ current_password: '', new_password: '', confirm: '' });
      toast('Senha alterada com sucesso');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function changeEmail() {
    setError(null);
    try {
      const r = await api.post<{ user: User }>('/auth/change-email', em);
      auth.setUser(r.user);
      setEm({ email: r.user.email, password: '' });
      toast('E-mail alterado', 'Enviamos um aviso para o e-mail anterior.');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="grid grid-2">
      <ErrorBox error={error} />
      <div className="card stack">
        <h3>Alterar senha</h3>
        <Field label="Senha atual"><input className="input" type="password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} /></Field>
        <Field label="Nova senha"><input className="input" type="password" minLength={8} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} /></Field>
        <Field label="Confirmar nova senha"><input className="input" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
        <button className="btn" onClick={changePassword}>Alterar senha</button>
      </div>
      <div className="card stack">
        <h3>Alterar e-mail de acesso</h3>
        <Field label="Novo e-mail"><input className="input" type="email" value={em.email} onChange={(e) => setEm({ ...em, email: e.target.value })} /></Field>
        <Field label="Confirme com sua senha"><input className="input" type="password" value={em.password} onChange={(e) => setEm({ ...em, password: e.target.value })} /></Field>
        <button className="btn" onClick={changeEmail}>Alterar e-mail</button>
      </div>
    </div>
  );
}
