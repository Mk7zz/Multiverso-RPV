import { useEffect, type ReactNode } from 'react';
import { PixelIcon } from './PixelIcon';

export function Spinner() {
  return (
    <div className="spinner" role="status" aria-label="Carregando">
      <span />
      <span />
      <span />
    </div>
  );
}

export function ErrorBox({ error }: { error: string | null | undefined }) {
  if (!error) return null;
  return (
    <div className="alert error" role="alert">
      {error}
    </div>
  );
}

export function Empty({ icon = 'seed', title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="big">
        <PixelIcon name={icon} size={48} />
      </div>
      <p>
        <strong>{title}</strong>
      </p>
      {children}
    </div>
  );
}

/** Wrapper para páginas que dependem de useApi. */
export function Loader<T>({ data, error, children }: { data: T | null; error: string | null; children: (d: T) => ReactNode }) {
  if (error && !data) return <ErrorBox error={error} />;
  if (!data) return <Spinner />;
  return <>{children(data)}</>;
}

export function Progress({ value, gold }: { value: number; gold?: boolean }) {
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className={`progress ${gold ? 'gold' : ''}`} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${v}%` }} />
    </div>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`field ${className ?? ''}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <PixelIcon name="close" size={14} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[] }) {
  return (
    <div className="tabs" role="tablist">
      {items.map((i) => (
        <button key={i.value} role="tab" aria-selected={value === i.value} className={value === i.value ? 'active' : ''} onClick={() => onChange(i.value)}>
          {i.label}
        </button>
      ))}
    </div>
  );
}

export function StatCard({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: ReactNode; icon?: string }) {
  return (
    <div className="card stat">
      <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <span className="stat-label">{label}</span>
        {icon && <PixelIcon name={icon} size={24} className="stat-icon" />}
      </div>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

export function Pagination({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="row end mt">
      <span className="muted small">
        Página {page} de {pages} · {total} registros
      </span>
      <button className="btn secondary sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ‹ Anterior
      </button>
      <button className="btn secondary sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Próxima ›
      </button>
    </div>
  );
}
