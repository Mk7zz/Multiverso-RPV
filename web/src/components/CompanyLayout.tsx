import type { ReactNode } from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router';
import { BRAND } from '../brand';
import { useApi } from '../lib/hooks';
import { COMPANY_STATUS, type Company } from '../lib/partners';
import type { User } from '../lib/types';
import { Header, Toasts } from './Layout';
import { CompanyLogo } from './Partners';
import { PixelIcon } from './PixelIcon';
import { Loader } from './ui';

export interface CompanyMe {
  user: User;
  company: Company & { status: string; cnpj: string };
  stats: {
    talentsAvailable: number;
    openJobs: number;
    applications: number;
    newApplications: number;
    invitesSent: number;
    invitesAccepted: number;
    saved: number;
    hired: number;
  };
  recentApplications: { id: number; status: string; created_at: string; user_id: number; name: string; avatar: User['avatar']; level: User['level']; job_id: number; job_title: string }[];
}

interface Ctx {
  me: CompanyMe;
  reload: () => void;
}

const LINKS = [
  { to: '/empresa', label: 'Painel', icon: 'chart', end: true },
  { to: '/empresa/talentos', label: 'Vitrine de talentos', icon: 'search' },
  { to: '/empresa/vagas', label: 'Oportunidades', icon: 'briefcase' },
  { to: '/empresa/convites', label: 'Convites', icon: 'mail' },
  { to: '/empresa/perfil', label: 'Dados da empresa', icon: 'building' },
];

export function CompanyLayout() {
  const { data, error, reload } = useApi<CompanyMe>('/company/me');
  return (
    <>
      <Header />
      <div className="admin-shell">
        <aside className="admin-side">
          {data && (
            <div className="company-side-head">
              <CompanyLogo company={data.company} size={40} />
              <div style={{ minWidth: 0 }}>
                <strong className="truncate" style={{ display: 'block' }}>
                  {data.company.name}
                </strong>
                <span className={`pill ${COMPANY_STATUS[data.company.status]?.pill ?? 'gray'}`}>{COMPANY_STATUS[data.company.status]?.label}</span>
              </div>
            </div>
          )}
          <div className="group">Empresa parceira</div>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              <PixelIcon name={l.icon} size={18} /> {l.label}
              {l.to === '/empresa/vagas' && !!data?.stats.newApplications && <span className="nav-count">{data.stats.newApplications}</span>}
            </NavLink>
          ))}
        </aside>
        <div className="admin-main">
          <Loader data={data} error={error}>
            {(me) => <Outlet context={{ me, reload } satisfies Ctx} />}
          </Loader>
        </div>
      </div>
      <Toasts />
    </>
  );
}

export const useCompany = () => useOutletContext<Ctx>();

/** Bloqueia as telas da vitrine enquanto a empresa não estiver aprovada. */
export function ApprovedOnly({ children }: { children: ReactNode }) {
  const { me } = useCompany();
  if (me.company.status === 'approved') return <>{children}</>;
  return <PendingNotice company={me.company} />;
}

export function PendingNotice({ company }: { company: CompanyMe['company'] }) {
  const pending = company.status === 'pending';
  return (
    <div className="card pending-card">
      <PixelIcon name={pending ? 'clock' : 'lock'} size={44} />
      <div>
        <h2 style={{ margin: 0 }}>{pending ? 'Cadastro em análise' : 'Acesso não liberado'}</h2>
        <p className="text-2" style={{ margin: '6px 0 0' }}>
          {pending
            ? `A equipe do ${BRAND.name} está conferindo os dados da ${company.name}. Você recebe um aviso por e-mail e aqui na plataforma assim que a vitrine for liberada.`
            : `O acesso da ${company.name} à vitrine de talentos não está ativo. Fale com a equipe do ${BRAND.name}.`}
        </p>
        {company.review_note && <p className="small muted">Observação da equipe: {company.review_note}</p>}
      </div>
    </div>
  );
}
