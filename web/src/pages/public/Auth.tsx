import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { ErrorBox, Field } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useDocumentTitle } from '../../lib/hooks';
import { GameShell } from '../start/TitleScreen';

function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function safeNext(next: string | null, fallback: string) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

export function Login() {
  useDocumentTitle('Entrar');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { busy, error, run } = useSubmit();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      const user = await login(email, password);
      navigate(safeNext(params.get('next'), user.role === 'admin' ? '/admin' : '/painel'), { replace: true });
    });
  };

  return (
    <GameShell>
      <form className="px-panel auth-card stack" onSubmit={submit}>
        <h1 style={{ fontSize: '1.5rem' }}>Continuar jornada</h1>
        <p className="muted" style={{ margin: 0 }}>
          Bom te ver de novo. Entre para continuar de onde parou.
        </p>
        <ErrorBox error={error} />
        <Field label="E-mail">
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Senha">
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="row end">
          <Link to="/esqueci-senha" className="small">
            Esqueci minha senha
          </Link>
        </div>
        <button className="btn block lg" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="center small" style={{ margin: 0 }}>
          Primeira vez aqui? <Link to={`/comecar${params.get('next') ? `?next=${encodeURIComponent(params.get('next')!)}` : ''}`}>Começar um novo jogo</Link>
        </p>
      </form>
    </GameShell>
  );
}

/** O cadastro agora acontece no onboarding em forma de jogo (/comecar). */
export function Register() {
  const [params] = useSearchParams();
  const next = params.get('next');
  return <Navigate to={`/comecar${next ? `?next=${encodeURIComponent(next)}` : ''}`} replace />;
}

export function ForgotPassword() {
  useDocumentTitle('Recuperar senha');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const { busy, error, run } = useSubmit();
  return (
    <GameShell>
      <form
        className="px-panel auth-card stack"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => setSent((await api.post('/auth/forgot-password', { email })).message));
        }}
      >
        <h1 style={{ fontSize: '1.5rem' }}>Recuperar senha</h1>
        <p className="muted" style={{ margin: 0 }}>
          Informe seu e-mail e enviaremos um link para criar uma nova senha.
        </p>
        <ErrorBox error={error} />
        {sent ? (
          <div className="alert success">{sent}</div>
        ) : (
          <>
            <Field label="E-mail">
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <button className="btn block" disabled={busy}>
              Enviar link
            </button>
          </>
        )}
        <Link to="/entrar" className="center small">
          Voltar para o login
        </Link>
      </form>
    </GameShell>
  );
}

export function ResetPassword() {
  useDocumentTitle('Nova senha');
  const [params] = useSearchParams();
  const { acceptToken } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const { busy, error, run } = useSubmit();
  const token = params.get('token') ?? '';
  return (
    <GameShell>
      <form
        className="px-panel auth-card stack"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            if (password !== confirm) throw new Error('As senhas não conferem.');
            const r = await api.post('/auth/reset-password', { token, password });
            acceptToken(r.token, r.user);
            navigate(r.user.role === 'admin' ? '/admin' : '/painel', { replace: true });
          });
        }}
      >
        <h1 style={{ fontSize: '1.5rem' }}>Definir nova senha</h1>
        {!token && <div className="alert error">Link inválido. Solicite uma nova redefinição.</div>}
        <ErrorBox error={error} />
        <Field label="Nova senha" hint="Mínimo de 8 caracteres">
          <input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Confirmar senha">
          <input className="input" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <button className="btn block" disabled={busy || !token}>
          Salvar e entrar
        </button>
      </form>
    </GameShell>
  );
}
