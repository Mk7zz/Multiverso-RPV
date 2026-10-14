import { useEffect, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { BRAND } from '../../brand';
import { PixelIcon } from '../../components/PixelIcon';
import { GuideSprite, PixelValley, RpvMark, useDayTime } from '../../components/Scene';
import { Spinner } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { fmtNum } from '../../lib/format';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import { homeFor } from '../../lib/partners';

/** Moldura de tela cheia com o cenário do Vale ao fundo (início, cadastro e login). */
export function GameShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const time = useDayTime();
  return (
    <div className={`game-shell time-${time}`}>
      <PixelValley time={time} />
      <GuideSprite className="shell-guide" size={46} flying />
      <Link to="/" className="shell-logo" aria-label={`${BRAND.fullName}: início`}>
        <RpvMark size={30} />
        <span>{BRAND.name}</span>
      </Link>
      <div className={`shell-content ${wide ? 'wide' : ''}`}>{children}</div>
    </div>
  );
}

interface HomeStats {
  stats: { students: number; courses: number; certificates: number; municipalities: number };
}

export function TitleScreen() {
  useDocumentTitle('');
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const time = useDayTime();
  const { data } = useApi<HomeStats>(user ? null : '/catalog/home');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement)) navigate('/comecar');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  if (!ready) return <Spinner />;
  if (user) return <Navigate to={homeFor(user.role)} replace />;

  return (
    <div className={`title-screen time-${time}`}>
      <PixelValley time={time} />
      <GuideSprite className="title-guide" size={72} flying />
      <main className="title-center">
        <span className="title-kicker">
          <RpvMark size={22} /> {BRAND.place} · {BRAND.organization}
        </span>
        <p className="title-welcome">Seja bem-vindo(a) ao</p>
        <h1 className="title-logo" aria-label={BRAND.name}>
          {BRAND.name.split('').map((ch, i) => (
            <span key={i} style={{ animationDelay: `${i * 0.06}s` }}>
              {ch}
            </span>
          ))}
        </h1>
        <p className="title-sub">Uma jornada de aprendizado para {BRAND.audience}. Crie seu personagem, explore o {BRAND.world.name} e suba de nível estudando.</p>
        <nav className="title-menu" aria-label="Menu inicial">
          <Link to="/comecar" className="title-option primary" autoFocus>
            <PixelIcon name="star" size={18} /> Novo jogo
          </Link>
          <Link to="/entrar" className="title-option">
            <PixelIcon name="door" size={18} /> Continuar jornada
          </Link>
          <Link to="/cursos" className="title-option">
            <PixelIcon name="books" size={18} /> Ver cursos
          </Link>
          <Link to="/empresas" className="title-option">
            <PixelIcon name="briefcase" size={18} /> Sou empresa
          </Link>
        </nav>
        <p className="press-start" aria-hidden>
          Pressione ENTER para começar
        </p>
      </main>
      {data && (
        <footer className="title-stats">
          <span>
            <PixelIcon name="backpack" size={16} /> {fmtNum(data.stats.students)} exploradores
          </span>
          <span>
            <PixelIcon name="books" size={16} /> {fmtNum(data.stats.courses)} cursos gratuitos
          </span>
          <span>
            <PixelIcon name="scroll" size={16} /> {fmtNum(data.stats.certificates)} certificados
          </span>
          <span>
            <PixelIcon name="location" size={16} /> {fmtNum(data.stats.municipalities)} municípios
          </span>
          <Link to="/validar">Validar certificado</Link>
        </footer>
      )}
    </div>
  );
}
