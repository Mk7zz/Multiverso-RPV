import { Link } from 'react-router';
import { fmtDuration } from '../lib/format';
import { AREA_LABEL, GOAL_LABEL, JOB_TYPE_LABEL, MODALITY_LABEL, type Company, type JobMatch, type StudentJob, type TalentCard } from '../lib/partners';
import { Avatar } from './Avatar';
import { PixelIcon } from './PixelIcon';

/** "Logo" pixelado da empresa: iniciais sobre a cor escolhida no cadastro. */
export function CompanyLogo({ company, size = 44 }: { company: Pick<Company, 'name' | 'color'>; size?: number }) {
  const initials = company.name
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <span className="company-logo" style={{ width: size, height: size, background: company.color, fontSize: size * 0.42 }} aria-hidden>
      {initials || company.name[0]}
    </span>
  );
}

export function AreaPills({ areas }: { areas: string[] }) {
  if (!areas.length) return null;
  return (
    <span className="row" style={{ gap: 4 }}>
      {areas.map((a) => (
        <span key={a} className="pill">
          {AREA_LABEL[a] ?? a}
        </span>
      ))}
    </span>
  );
}

/** Card do talento na vitrine da empresa. */
export function TalentTile({ t, to, onSave }: { t: TalentCard; to: string; onSave?: () => void }) {
  return (
    <div className="card talent-tile">
      <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <Avatar config={t.avatar} name={t.name} size={56} />
        <div className="grow" style={{ minWidth: 0 }}>
          <Link to={to} className="talent-name truncate">
            {t.name}
          </Link>
          <div className="muted small">
            <PixelIcon name={t.level.icon} size={14} /> Nível {t.level.level} · {t.level.name}
          </div>
          <div className="muted small truncate">{[t.municipality, t.age ? `${t.age} anos` : null].filter(Boolean).join(' · ')}</div>
        </div>
        {onSave && (
          <button className={`icon-btn save-btn ${t.saved ? 'on' : ''}`} onClick={onSave} title={t.saved ? 'Remover dos salvos' : 'Salvar talento'} aria-pressed={!!t.saved}>
            <PixelIcon name="star" size={16} />
          </button>
        )}
      </div>
      {t.headline && <p className="talent-headline">"{t.headline}"</p>}
      <AreaPills areas={t.areas} />
      <div className="talent-proof">
        <span title="Cursos concluídos">
          <PixelIcon name="gradcap" size={14} /> {t.courses_completed} cursos
        </span>
        <span title="Certificados verificáveis">
          <PixelIcon name="scroll" size={14} /> {t.certificates} certif.
        </span>
        <span title="Tempo de estudo registrado">
          <PixelIcon name="clock" size={14} /> {fmtDuration(t.study_seconds)}
        </span>
      </div>
      <div className="row between">
        {t.goal ? <span className="pill gold">{GOAL_LABEL[t.goal] ?? t.goal}</span> : <span />}
        <Link to={to} className="btn secondary sm">
          Ver trajetória
        </Link>
      </div>
    </div>
  );
}

export function MatchMeter({ match, compact }: { match: JobMatch; compact?: boolean }) {
  const label = match.wanted ? `${match.have}/${match.wanted} cursos recomendados` : 'Sem cursos obrigatórios';
  return (
    <span className={`match ${match.score >= 80 ? 'high' : match.score >= 50 ? 'mid' : 'low'}`} title={label}>
      <span className="match-bar">
        <span style={{ width: `${match.score}%` }} />
      </span>
      <strong>{match.score}%</strong>
      {!compact && <span className="muted small">{label}</span>}
    </span>
  );
}

/** Card de oportunidade visto pelo aluno. */
export function JobTile({ job }: { job: StudentJob }) {
  return (
    <Link to={`/oportunidades/${job.id}`} className="card job-tile">
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <CompanyLogo company={job.company} />
        <div className="grow" style={{ minWidth: 0 }}>
          <strong className="truncate" style={{ display: 'block' }}>
            {job.title}
          </strong>
          <span className="muted small truncate" style={{ display: 'block' }}>
            {job.company.name} · {job.municipality ?? job.company.municipality}
          </span>
        </div>
      </div>
      <div className="row" style={{ gap: 4 }}>
        <span className="pill gold">{JOB_TYPE_LABEL[job.type] ?? job.type}</span>
        <span className="pill gray">{MODALITY_LABEL[job.modality] ?? job.modality}</span>
        <span className="pill">{AREA_LABEL[job.area] ?? job.area}</span>
      </div>
      <div className="row between">
        <MatchMeter match={job.match} compact />
        {job.application ? <span className="pill success">Candidatura enviada</span> : <span className="small muted">Ver detalhes ›</span>}
      </div>
    </Link>
  );
}
