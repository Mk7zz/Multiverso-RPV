import { Link } from 'react-router';
import { fmtDateTime } from '../lib/format';
import type { Announcement, EventItem } from '../lib/types';
import { PixelIcon } from './PixelIcon';

export function AnnouncementList({ items }: { items: Announcement[] }) {
  if (!items.length) return null;
  return (
    <div className="stack">
      {items.map((a) => (
        <div key={a.id} className={`alert ${a.level === 'important' ? 'warning' : 'info'}`}>
          <strong>
            <PixelIcon name={a.pinned ? 'pin' : 'megaphone'} size={16} /> {a.title}
          </strong>
          <div style={{ color: 'var(--text)', whiteSpace: 'pre-line' }}>{a.body}</div>
        </div>
      ))}
    </div>
  );
}

export function EventCard({ e }: { e: EventItem }) {
  const d = new Date(e.starts_at);
  return (
    <div className="card flat row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
      <div className="event-date">
        <strong>{d.getDate()}</strong>
        <span>{d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
      </div>
      <div className="grow">
        <strong>{e.title}</strong>
        <div className="small muted">
          {fmtDateTime(e.starts_at)}
          {e.location && ` · ${e.location}`}
        </div>
        {e.description && <p className="small text-2" style={{ margin: '4px 0 0' }}>{e.description}</p>}
        <div className="row small" style={{ marginTop: 4 }}>
          {e.url && (
            <a href={e.url} target="_blank" rel="noreferrer">
              Acessar link ↗
            </a>
          )}
          {e.course_slug && <Link to={`/cursos/${e.course_slug}`}>{e.course_title}</Link>}
        </div>
      </div>
    </div>
  );
}
