import { useState } from 'react';
import { PixelIcon } from '../../components/PixelIcon';
import { Loader, Tabs } from '../../components/ui';
import { fmtDate, fmtDateTime } from '../../lib/format';
import { useApi, useDebounced, useDocumentTitle } from '../../lib/hooks';
import type { Certificate } from '../../lib/types';

export function AdminCertificates() {
  useDocumentTitle('Certificados e feedback');
  const [tab, setTab] = useState<'certificados' | 'feedback'>('certificados');
  const [q, setQ] = useState('');
  const query = useDebounced(q);
  const certs = useApi<{ certificates: Certificate[] }>(`/admin/certificates?q=${encodeURIComponent(query)}`);
  const fb = useApi<{ summary: any[]; recent: any[] }>('/admin/feedback');

  return (
    <>
      <h1>Certificados e feedback</h1>
      <Tabs value={tab} onChange={setTab} items={[{ value: 'certificados', label: <><PixelIcon name="scroll" size={16} /> Certificados emitidos</> }, { value: 'feedback', label: <><PixelIcon name="star" size={16} /> Feedback dos cursos</> }]} />
      {tab === 'certificados' && (
        <>
          <input className="input mb" style={{ maxWidth: 360 }} placeholder="Buscar por código, aluno ou curso…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Loader data={certs.data} error={certs.error}>
            {(d) => (
              <div className="card pad-0 table-wrap">
                <table className="table">
                  <thead><tr><th>Código</th><th>Aluno</th><th>Curso</th><th className="num">Nota</th><th>Emissão</th><th /></tr></thead>
                  <tbody>
                    {d.certificates.map((c) => (
                      <tr key={c.id}>
                        <td><code>{c.code}</code></td>
                        <td>{c.student_name}</td>
                        <td>{c.course_title}</td>
                        <td className="num">{c.final_grade ?? '—'}</td>
                        <td>{fmtDate(c.issued_at)}</td>
                        <td><a href={`/api/certificates/${c.code}/pdf`} target="_blank" rel="noreferrer">PDF ↗</a></td>
                      </tr>
                    ))}
                    {!d.certificates.length && <tr><td colSpan={6} className="muted center">Nenhum certificado.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </Loader>
        </>
      )}
      {tab === 'feedback' && (
        <Loader data={fb.data} error={fb.error}>
          {(d) => (
            <>
              <div className="card pad-0 table-wrap mb">
                <table className="table">
                  <thead><tr><th>Curso</th><th className="num">Respostas</th><th className="num">Nota geral</th><th className="num">Conteúdo</th><th className="num">Recomendação (0-10)</th></tr></thead>
                  <tbody>
                    {d.summary.map((s) => (
                      <tr key={s.id}>
                        <td>{s.title}</td>
                        <td className="num">{s.responses}</td>
                        <td className="num">{s.rating ?? '—'}</td>
                        <td className="num">{s.content_rating ?? '—'}</td>
                        <td className="num">{s.recommend ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h3>Comentários recentes</h3>
              <div className="stack">
                {d.recent.filter((r) => r.comment).map((r) => (
                  <div key={r.id} className="card flat">
                    <div className="row between small">
                      <strong>{r.course_title}</strong>
                      <span className="muted">{'★'.repeat(r.rating)} · {r.name} · {fmtDateTime(r.created_at)}</span>
                    </div>
                    <p style={{ margin: '6px 0 0' }}>{r.comment}</p>
                  </div>
                ))}
                {!d.recent.some((r) => r.comment) && <p className="muted">Nenhum comentário ainda.</p>}
              </div>
            </>
          )}
        </Loader>
      )}
    </>
  );
}
