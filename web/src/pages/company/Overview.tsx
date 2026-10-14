import { Link } from 'react-router';
import { Avatar } from '../../components/Avatar';
import { PendingNotice, useCompany } from '../../components/CompanyLayout';
import { PixelIcon } from '../../components/PixelIcon';
import { Empty, StatCard } from '../../components/ui';
import { timeAgo } from '../../lib/format';
import { useDocumentTitle } from '../../lib/hooks';
import { APPLICATION_STATUS } from '../../lib/partners';

export function CompanyOverview() {
  useDocumentTitle('Área da empresa');
  const { me } = useCompany();
  const s = me.stats;
  const approved = me.company.status === 'approved';
  const firstName = me.user.name.split(' ')[0];

  return (
    <>
      <div className="section-head">
        <div>
          <h1 style={{ margin: 0 }}>Olá, {firstName}</h1>
          <span className="muted">Área da {me.company.name}</span>
        </div>
        {approved && (
          <div className="row">
            <Link to="/empresa/vagas?nova=1" className="btn secondary">
              <PixelIcon name="briefcase" size={16} /> Publicar oportunidade
            </Link>
            <Link to="/empresa/talentos" className="btn">
              <PixelIcon name="search" size={16} /> Buscar talentos
            </Link>
          </div>
        )}
      </div>

      {!approved && <PendingNotice company={me.company} />}

      <div className="grid grid-4 mt">
        <StatCard label="Talentos na vitrine" value={s.talentsAvailable} sub="pessoas abertas a propostas" icon="star" />
        <StatCard label="Oportunidades abertas" value={s.openJobs} sub={`${s.applications} candidaturas no total`} icon="briefcase" />
        <StatCard label="Candidaturas novas" value={s.newApplications} sub="ainda não vistas" icon="bell" />
        <StatCard label="Convites aceitos" value={`${s.invitesAccepted}/${s.invitesSent}`} sub={`${s.saved} talentos salvos`} icon="users" />
      </div>

      <div className="section split">
        <div className="card">
          <div className="card-title">
            <span>
              <PixelIcon name="list" size={18} /> Candidaturas recentes
            </span>
            {approved && (
              <Link to="/empresa/vagas" className="small">
                Ver oportunidades
              </Link>
            )}
          </div>
          {me.recentApplications.length ? (
            me.recentApplications.map((a) => (
              <div key={a.id} className="row between list-row">
                <span className="row" style={{ flexWrap: 'nowrap', minWidth: 0 }}>
                  <Avatar config={a.avatar} name={a.name} size={36} />
                  <span style={{ minWidth: 0 }}>
                    <Link to={`/empresa/talentos/${a.user_id}`} className="truncate" style={{ display: 'block', fontWeight: 600 }}>
                      {a.name}
                    </Link>
                    <span className="muted small truncate" style={{ display: 'block' }}>
                      {a.job_title} · {timeAgo(a.created_at)}
                    </span>
                  </span>
                </span>
                <span className={`pill ${APPLICATION_STATUS[a.status]?.pill}`}>{APPLICATION_STATUS[a.status]?.label}</span>
              </div>
            ))
          ) : (
            <Empty icon="briefcase" title="Nenhuma candidatura ainda">
              <p className="small muted">Publique uma oportunidade e ela aparece para os alunos na Feira de Talentos do mundo.</p>
            </Empty>
          )}
        </div>
        <div className="card stack">
          <div className="card-title" style={{ margin: 0 }}>
            <span>
              <PixelIcon name="bulb" size={18} /> Como aproveitar melhor
            </span>
          </div>
          <Tip icon="search" text="Filtre a vitrine pelo curso que mais importa para a vaga: quem concluiu já passou por avaliação e tem certificado verificável." />
          <Tip icon="briefcase" text="Indique cursos recomendados na oportunidade. Os alunos veem a compatibilidade e se preparam antes de se candidatar." />
          <Tip icon="mail" text="Convites com mensagem pessoal têm mais aceite. Conte por que aquela trajetória chamou atenção." />
          <Tip icon="shield" text="O contato só aparece depois do aceite ou da candidatura. Use os dados apenas para recrutamento." />
        </div>
      </div>
    </>
  );
}

function Tip({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
      <PixelIcon name={icon} size={20} />
      <span className="small text-2">{text}</span>
    </div>
  );
}
