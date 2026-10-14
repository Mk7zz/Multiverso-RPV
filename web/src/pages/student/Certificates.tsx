import { Link } from 'react-router';
import { PixelIcon } from '../../components/PixelIcon';
import { Empty, Loader } from '../../components/ui';
import { fmtDate } from '../../lib/format';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import type { Certificate } from '../../lib/types';

export function Certificates() {
  useDocumentTitle('Meus certificados');
  const { data, error } = useApi<{ certificates: Certificate[] }>('/certificates/mine');
  return (
    <div className="container page">
      <h1>Meus certificados</h1>
      <Loader data={data} error={error}>
        {(d) =>
          d.certificates.length ? (
            <div className="grid grid-2">
              {d.certificates.map((c) => (
                <div key={c.id} className="card stack" style={{ borderTop: '4px solid var(--accent)' }}>
                  <div className="row between">
                    <span className="pill gold"><PixelIcon name="scroll" size={14} /> Certificado</span>
                    <span className="muted small">{fmtDate(c.issued_at)}</span>
                  </div>
                  <h3 style={{ margin: 0 }}>{c.course_title}</h3>
                  <span className="small text-2">
                    {c.workload_hours}h{c.final_grade != null && ` · nota final ${c.final_grade}`} · código <strong>{c.code}</strong>
                  </span>
                  <div className="row">
                    <a className="btn" href={`/api/certificates/${c.code}/pdf?download=1`}>
                      Baixar PDF
                    </a>
                    <a className="btn secondary" href={`/api/certificates/${c.code}/pdf`} target="_blank" rel="noreferrer">
                      Visualizar
                    </a>
                    <button
                      className="btn ghost"
                      onClick={() => navigator.clipboard?.writeText(`${location.origin}/validar/${c.code}`)}
                      title="Copiar link de validação"
                    >
                      <PixelIcon name="network" size={14} /> Copiar link
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty icon="scroll" title="Você ainda não tem certificados">
              <p className="muted">Conclua um curso para receber seu primeiro certificado.</p>
              <Link to="/painel" className="btn">
                Ir para meus cursos
              </Link>
            </Empty>
          )
        }
      </Loader>
    </div>
  );
}
