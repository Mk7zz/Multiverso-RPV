import { NavLink, Outlet } from 'react-router';
import { Header, Toasts } from './Layout';
import { PixelIcon } from './PixelIcon';

const LINKS: { group?: string; to: string; label: string; icon: string; end?: boolean }[] = [
  { group: 'Visão geral', to: '/admin', label: 'Dashboard', icon: 'chart', end: true },
  { to: '/admin/relatorios', label: 'Relatórios', icon: 'folder' },
  { group: 'Conteúdo', to: '/admin/conteudo', label: 'Trilhas e cursos', icon: 'gradcap' },
  { to: '/admin/questoes', label: 'Banco de questões', icon: 'question' },
  { to: '/admin/avaliacoes', label: 'Avaliações', icon: 'pencil' },
  { to: '/admin/certificados', label: 'Certificados e feedback', icon: 'scroll' },
  { group: 'Pessoas', to: '/admin/usuarios', label: 'Usuários e acessos', icon: 'users' },
  { to: '/admin/empresas', label: 'Empresas parceiras', icon: 'building' },
  { to: '/admin/comunicacao', label: 'Comunicação', icon: 'megaphone' },
  { group: 'Sistema', to: '/admin/logs', label: 'Logs de auditoria', icon: 'list' },
  { to: '/admin/emails', label: 'E-mails enviados', icon: 'mail' },
  { to: '/admin/configuracoes', label: 'Configurações', icon: 'gear' },
];

export function AdminLayout() {
  return (
    <>
      <Header />
      <div className="admin-shell">
        <aside className="admin-side">
          {LINKS.map((l) => (
            <div key={l.to} style={{ display: 'contents' }}>
              {l.group && <div className="group">{l.group}</div>}
              <NavLink to={l.to} end={l.end}>
                <PixelIcon name={l.icon} size={18} /> {l.label}
              </NavLink>
            </div>
          ))}
        </aside>
        <div className="admin-main">
          <Outlet />
        </div>
      </div>
      <Toasts />
    </>
  );
}
