import { Link } from 'react-router';
import { BRAND } from '../../brand';
import { CompanyLogo } from '../../components/Partners';
import { PixelIcon } from '../../components/PixelIcon';
import { PixelValley } from '../../components/Scene';
import { useAuth } from '../../lib/auth';
import { fmtNum } from '../../lib/format';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import { AREA_LABEL, type Company } from '../../lib/partners';

interface Showcase {
  stats: { students: number; talents: number; certificates: number; studyHours: number; courses: number; municipalities: number; partners: number; openJobs: number };
  areas: { area: string; count: number }[];
  partners: Pick<Company, 'id' | 'name' | 'sector' | 'municipality' | 'color'>[];
}

const WHY = [
  {
    icon: 'scroll',
    title: 'Trajetória comprovada',
    text: 'Em vez de um currículo em branco, você vê o que a pessoa fez de verdade: cursos concluídos, notas, horas de estudo, constância e certificados com código de validação.',
  },
  {
    icon: 'location',
    title: 'Talentos da sua região',
    text: `Jovens e adultos do ${BRAND.place} se qualificando perto de você. Contrate quem já mora aqui e ajude a manter o talento ${BRAND.world.withPrep}.`,
  },
  {
    icon: 'shield',
    title: 'Privacidade em primeiro lugar',
    text: 'Só aparece na vitrine quem escolheu aparecer. O contato é liberado apenas quando o talento aceita o seu convite ou se candidata à sua vaga. Menores, só com autorização do responsável.',
  },
];

const STEPS = [
  { icon: 'building', title: 'Cadastre a empresa', text: 'CNPJ, setor e um(a) responsável. Leva poucos minutos.' },
  { icon: 'check', title: 'Aprovação da equipe', text: `A equipe do ${BRAND.name} confere o cadastro e libera o acesso.` },
  { icon: 'search', title: 'Encontre e publique', text: 'Filtre talentos por curso, nível, área e cidade. Publique vagas de estágio, aprendiz e emprego.' },
  { icon: 'users', title: 'Convide e converse', text: 'O talento aceita o convite e o contato aparece para os dois lados.' },
];

export function ForCompanies() {
  useDocumentTitle('Para empresas');
  const { user } = useAuth();
  const { data } = useApi<Showcase>('/partners/showcase');
  const s = data?.stats;
  const maxArea = Math.max(1, ...(data?.areas.map((a) => a.count) ?? [1]));

  return (
    <div className="partners-page">
      <section className="partner-hero">
        <PixelValley className="full" />
        <div className="container partner-hero-inner">
          <span className="title-kicker">
            <PixelIcon name="briefcase" size={18} /> Empresas parceiras
          </span>
          <h1>
            Encontre talentos que você <em>viu aprender</em>.
          </h1>
          <p className="partner-hero-sub">
            O {BRAND.fullName} é a ponte entre quem está se qualificando na região e as empresas que precisam de gente preparada. Cadastre sua empresa, conheça a
            trajetória real de cada pessoa e convide para uma conversa.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            {user?.role === 'company' ? (
              <Link to="/empresa" className="title-option primary">
                <PixelIcon name="briefcase" size={18} /> Ir para a área da empresa
              </Link>
            ) : (
              <>
                <Link to="/empresas/cadastro" className="title-option primary">
                  <PixelIcon name="building" size={18} /> Cadastrar minha empresa
                </Link>
                <Link to="/entrar?next=/empresa" className="title-option">
                  <PixelIcon name="door" size={18} /> Já sou parceira
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="partner-numbers" aria-label="A plataforma em números">
        <div className="container partner-numbers-grid">
          <StatNumber icon="backpack" value={s?.students} label="pessoas aprendendo" />
          <StatNumber icon="star" value={s?.talents} label="talentos na vitrine" />
          <StatNumber icon="scroll" value={s?.certificates} label="certificados verificáveis" />
          <StatNumber icon="clock" value={s?.studyHours} label="horas de estudo" />
          <StatNumber icon="location" value={s?.municipalities} label="municípios" />
          <StatNumber icon="building" value={s?.partners} label="empresas parceiras" />
        </div>
      </section>

      <div className="container page">
        <section>
          <div className="section-head">
            <h2>Por que contratar pelo {BRAND.name}</h2>
          </div>
          <div className="grid grid-3">
            {WHY.map((w) => (
              <div key={w.title} className="card why-card">
                <PixelIcon name={w.icon} size={36} />
                <h3>{w.title}</h3>
                <p className="text-2">{w.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Como funciona</h2>
          </div>
          <ol className="partner-steps">
            {STEPS.map((st, i) => (
              <li key={st.title} className="card">
                <span className="step-num">{i + 1}</span>
                <PixelIcon name={st.icon} size={28} />
                <strong>{st.title}</strong>
                <span className="small text-2">{st.text}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="section split">
          <div className="card">
            <div className="card-title">
              <span>
                <PixelIcon name="chart" size={18} /> Interesses de quem está na vitrine
              </span>
            </div>
            {data?.areas.length ? (
              <div className="stack" style={{ gap: 8 }}>
                {data.areas.slice(0, 8).map((a) => (
                  <div key={a.area} className="area-bar">
                    <span>{AREA_LABEL[a.area] ?? a.area}</span>
                    <span className="area-track">
                      <span style={{ width: `${(a.count / maxArea) * 100}%` }} />
                    </span>
                    <strong>{a.count}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">Os interesses aparecem aqui conforme os talentos ativam a vitrine.</p>
            )}
          </div>
          <div className="card">
            <div className="card-title">
              <span>
                <PixelIcon name="network" size={18} /> Quem já está no {BRAND.world.name}
              </span>
            </div>
            {data?.partners.length ? (
              <div className="stack" style={{ gap: 10 }}>
                {data.partners.map((p) => (
                  <div key={p.id} className="row" style={{ flexWrap: 'nowrap' }}>
                    <CompanyLogo company={p} size={36} />
                    <div style={{ minWidth: 0 }}>
                      <strong className="truncate" style={{ display: 'block' }}>
                        {p.name}
                      </strong>
                      <span className="muted small">
                        {p.sector} · {p.municipality}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">Seja a primeira empresa parceira.</p>
            )}
          </div>
        </section>

        <section className="section card partner-cta">
          <div>
            <h2 style={{ margin: 0 }}>Sua próxima contratação pode estar estudando agora.</h2>
            <p className="text-2" style={{ margin: '6px 0 0' }}>
              O cadastro leva poucos minutos. {s ? `${fmtNum(s.openJobs)} oportunidades abertas no momento.` : ''}
            </p>
          </div>
          {user?.role !== 'company' && (
            <Link to="/empresas/cadastro" className="btn accent lg">
              Cadastrar minha empresa
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}

function StatNumber({ icon, value, label }: { icon: string; value?: number; label: string }) {
  return (
    <div className="partner-number">
      <PixelIcon name={icon} size={26} />
      <strong>{value == null ? '…' : fmtNum(value)}</strong>
      <span>{label}</span>
    </div>
  );
}
