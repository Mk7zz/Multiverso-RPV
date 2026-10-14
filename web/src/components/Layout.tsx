import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../lib/auth';
import { useGame } from '../lib/game';
import { useNotifications } from '../lib/notifications';
import { Avatar } from './Avatar';
import { BRAND } from '../brand';
import { HudChip, LevelUpModal, RpvMark, ValleyScene, XpFloats } from './Game';
import { PixelIcon } from './PixelIcon';

export function Header() {
  const { user, logout } = useAuth();
  const { summary } = useGame();
  const { unreadNotifications, unreadMessages } = useNotifications();
  const [menu, setMenu] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenu(false);
    setUserMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setUserMenu(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <header className="header">
      <div className="container header-inner">
        <button className="icon-btn menu-toggle" onClick={() => setMenu(!menu)} aria-label="Abrir menu">
          <PixelIcon name="menu" size={16} />
        </button>
        <Link to={user?.role === 'company' ? '/empresa' : '/'} className="logo">
          <RpvMark size={40} />
          <span>
            {BRAND.name}
            <small>{BRAND.place}</small>
          </span>
        </Link>
        <nav className={`nav ${menu ? 'open' : ''}`}>
          {user?.role === 'company' ? (
            <>
              <NavLink to="/empresa" end>
                Painel
              </NavLink>
              <NavLink to="/empresa/talentos">Talentos</NavLink>
              <NavLink to="/empresa/vagas">Oportunidades</NavLink>
              <NavLink to="/empresa/convites">Convites</NavLink>
            </>
          ) : user ? (
            <>
              <NavLink to="/painel">{BRAND.world.name}</NavLink>
              <NavLink to="/jornada">Mapa</NavLink>
              <NavLink to="/missoes">
                Missões
                {!!summary?.claimableQuests && <span className="nav-count">{summary.claimableQuests}</span>}
              </NavLink>
              <NavLink to="/cursos">Cursos</NavLink>
              <NavLink to="/ranking">Ranking</NavLink>
              <NavLink to="/conexoes">Conexões</NavLink>
              {user.role === 'student' && <NavLink to="/oportunidades">Oportunidades</NavLink>}
              <NavLink to="/eventos">Eventos</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/cursos">Cursos</NavLink>
              <NavLink to="/eventos">Eventos</NavLink>
              <NavLink to="/validar">Validar certificado</NavLink>
              <NavLink to="/empresas">Para empresas</NavLink>
            </>
          )}
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <HudChip />
              {user.role !== 'company' && (
                <Link to="/mensagens" className="icon-btn" aria-label={`Mensagens (${unreadMessages} não lidas)`} title="Mensagens">
                  <PixelIcon name="mail" size={18} />
                  {unreadMessages > 0 && <span className="dot-count">{unreadMessages}</span>}
                </Link>
              )}
              <Link to="/notificacoes" className="icon-btn" aria-label={`Notificações (${unreadNotifications} não lidas)`} title="Notificações">
                <PixelIcon name="bell" size={18} />
                {unreadNotifications > 0 && <span className="dot-count">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}
              </Link>
              <div className="dropdown" ref={ref}>
                <button className="icon-btn" style={{ padding: 0, overflow: 'hidden' }} onClick={() => setUserMenu(!userMenu)} aria-label="Menu do usuário">
                  <Avatar config={user.avatar} name={user.name} size={38} />
                </button>
                {userMenu && (
                  <div className="dropdown-menu">
                    <div style={{ padding: '8px 12px' }}>
                      <strong className="truncate" style={{ display: 'block' }}>
                        {user.name}
                      </strong>
                      <span className="muted small">
                        {user.role === 'company' ? (
                          <>
                            <PixelIcon name="building" size={14} /> Empresa parceira
                          </>
                        ) : (
                          <>
                            <PixelIcon name={user.level.icon} size={14} /> Nível {user.level.level} · {user.points} XP
                          </>
                        )}
                      </span>
                    </div>
                    <hr style={{ margin: '4px 0' }} />
                    {user.role === 'company' ? (
                      <>
                        <Link to="/empresa">Área da empresa</Link>
                        <Link to="/empresa/perfil">Dados da empresa</Link>
                        <Link to="/notificacoes">Notificações</Link>
                      </>
                    ) : (
                      <>
                        <Link to="/painel">Voltar ao {BRAND.world.name}</Link>
                        <Link to="/perfil">Perfil, medalhas e avatar</Link>
                        <Link to="/certificados">Meus certificados</Link>
                        {user.role === 'student' && <Link to="/oportunidades?aba=vitrine">Minha vitrine para empresas</Link>}
                      </>
                    )}
                    {user.role === 'admin' && <Link to="/admin">Painel administrativo</Link>}
                    <hr style={{ margin: '4px 0' }} />
                    <button
                      onClick={() => {
                        logout();
                        navigate('/');
                      }}
                    >
                      Sair
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/entrar" className="btn ghost">
                Entrar
              </Link>
              <Link to="/comecar" className="btn accent">
                Começar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function Toasts() {
  const { toasts, dismiss } = useNotifications();
  const navigate = useNavigate();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast"
          onClick={() => {
            dismiss(t.id);
            if (t.link) navigate(t.link);
          }}
        >
          <strong>{t.title}</strong>
          {t.body && <div className="small text-2">{t.body}</div>}
        </div>
      ))}
    </div>
  );
}

export function Layout() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <footer className="footer">
        <ValleyScene className="footer-scene" />
        <div className="container row between">
          <span className="row" style={{ gap: 10 }}>
            <RpvMark size={30} />
            <span>
              {BRAND.fullName} · <em>{BRAND.motto}</em>
              <br />
              uma iniciativa do <strong>{BRAND.organization}</strong>
            </span>
          </span>
          <span className="row">
            <Link to="/cursos">Cursos</Link>
            <Link to="/validar">Validar certificado</Link>
            <Link to="/empresas">Para empresas</Link>
            <a href={BRAND.site.url} target="_blank" rel="noreferrer">
              {BRAND.site.label} ↗
            </a>
          </span>
        </div>
      </footer>
      <Toasts />
      <XpFloats />
      <LevelUpModal />
    </>
  );
}
