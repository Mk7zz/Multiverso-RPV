import { useState } from 'react';
import { Loader, Pagination } from '../../components/ui';
import { fmtDateTime } from '../../lib/format';
import { useApi, useDebounced, useDocumentTitle } from '../../lib/hooks';

interface Log {
  id: number;
  action: string;
  entity: string | null;
  entity_id: number | null;
  details: string | null;
  ip: string | null;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
}

/** Logs de auditoria: quem fez o quê e quando. */
export function AdminLogs() {
  useDocumentTitle('Logs');
  const [action, setAction] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const query = useDebounced(q);
  const { data, error } = useApi<{ logs: Log[]; total: number; actions: string[]; page: number; pageSize: number }>(
    `/admin/logs?action=${encodeURIComponent(action)}&q=${encodeURIComponent(query)}&page=${page}`,
  );
  return (
    <>
      <h1>Logs de auditoria</h1>
      <div className="row mb">
        <input className="input" style={{ maxWidth: 280 }} placeholder="Usuário (nome ou e-mail)…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="input" style={{ maxWidth: 260 }} value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">Todas as ações</option>
          {data?.actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <Loader data={data} error={error}>
        {(d) => (
          <>
            <div className="card pad-0 table-wrap">
              <table className="table">
                <thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Alvo</th><th>Detalhes</th><th>IP</th></tr></thead>
                <tbody>
                  {d.logs.map((l) => (
                    <tr key={l.id}>
                      <td className="small nowrap">{fmtDateTime(l.created_at)}</td>
                      <td className="small">{l.user_name ?? <span className="muted">sistema/visitante</span>}</td>
                      <td><code className="small">{l.action}</code></td>
                      <td className="small">{l.entity ? `${l.entity}${l.entity_id ? ` #${l.entity_id}` : ''}` : '—'}</td>
                      <td className="small muted truncate" style={{ maxWidth: 280 }} title={l.details ?? ''}>{l.details ?? ''}</td>
                      <td className="small muted">{l.ip ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={d.page} pageSize={d.pageSize} total={d.total} onChange={setPage} />
          </>
        )}
      </Loader>
    </>
  );
}
