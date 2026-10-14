import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Spinner } from '../../components/ui';
import { api } from '../../lib/api';
import { fmtDate } from '../../lib/format';
import { useDocumentTitle } from '../../lib/hooks';
import type { Certificate } from '../../lib/types';

/** Página pública de validação de certificados. */
export function ValidateCertificate() {
  useDocumentTitle('Validar certificado');
  const { code } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(code ?? '');
  const [result, setResult] = useState<{ valid: boolean; certificate?: Certificate } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!code) {
      setResult(null);
      return;
    }
    setInput(code);
    setLoading(true);
    api
      .get(`/certificates/validate/${encodeURIComponent(code)}`)
      .then(setResult)
      .catch(() => setResult({ valid: false }))
      .finally(() => setLoading(false));
  }, [code]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim()) navigate(`/validar/${input.trim().toUpperCase()}`);
  };

  return (
    <div className="container page" style={{ maxWidth: 720 }}>
      <h1>Validar certificado</h1>
      <p className="text-2">Confira a autenticidade de um certificado emitido pelo Multiverso Rio Pomba Valley informando o código impresso no documento.</p>
      <form className="row mb" onSubmit={submit}>
        <input className="input grow" placeholder="Ex.: RPV-7KQ2-M9XA" value={input} onChange={(e) => setInput(e.target.value)} aria-label="Código do certificado" />
        <button className="btn">Validar</button>
      </form>
      {loading && <Spinner />}
      {!loading && result?.valid && result.certificate && (
        <div className="card" style={{ borderColor: 'var(--success)' }}>
          <div className="row" style={{ marginBottom: 12 }}>
            <span className="pill success" style={{ fontSize: '0.9rem' }}>
              ✓ Certificado válido
            </span>
            <span className="muted small">Código {result.certificate.code}</span>
          </div>
          <dl className="form-grid" style={{ margin: 0 }}>
            <div>
              <dt className="muted small">Aluno(a)</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>{result.certificate.student_name}</dd>
            </div>
            <div>
              <dt className="muted small">Curso</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>{result.certificate.course_title}</dd>
            </div>
            <div>
              <dt className="muted small">Carga horária</dt>
              <dd style={{ margin: 0 }}>{result.certificate.workload_hours}h</dd>
            </div>
            <div>
              <dt className="muted small">Emitido em</dt>
              <dd style={{ margin: 0 }}>{fmtDate(result.certificate.issued_at)}</dd>
            </div>
            {result.certificate.final_grade != null && (
              <div>
                <dt className="muted small">Nota final</dt>
                <dd style={{ margin: 0 }}>{result.certificate.final_grade}</dd>
              </div>
            )}
          </dl>
          <a className="btn secondary mt" href={`/api/certificates/${result.certificate.code}/pdf`} target="_blank" rel="noreferrer">
            Ver certificado (PDF)
          </a>
        </div>
      )}
      {!loading && result && !result.valid && <div className="alert error">Nenhum certificado encontrado com o código informado.</div>}
    </div>
  );
}
