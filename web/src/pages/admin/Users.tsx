import { useRef, useState } from 'react';
import { PixelIcon } from '../../components/PixelIcon';
import { ErrorBox, Field, Loader, Modal, Pagination } from '../../components/ui';
import { api, download } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDate, fmtDateTime, fmtDuration, timeAgo } from '../../lib/format';
import { useApi, useDebounced, useDocumentTitle } from '../../lib/hooks';
import { useNotifications } from '../../lib/notifications';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'admin' | 'company';
  municipality: string | null;
  school: string | null;
  points: number;
  is_active: number;
  is_demo: number;
  created_at: string;
  last_login_at: string | null;
  last_seen_at: string | null;
  enrollments: number;
  completed: number;
  study_seconds: number;
}

export function AdminUsers() {
  useDocumentTitle('Usuários');
  const me = useAuth().user;
  const { toast } = useNotifications();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const query = useDebounced(q);
  const { data, error, reload } = useApi<{ users: AdminUser[]; total: number; page: number; pageSize: number }>(
    `/admin/users?q=${encodeURIComponent(query)}&role=${role}&status=${status}&page=${page}`,
  );
  const [detail, setDetail] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  async function patch(u: AdminUser, body: Record<string, unknown>, msg: string) {
    try {
      await api.patch(`/admin/users/${u.id}`, body);
      toast(msg);
      reload();
    } catch (e) {
      toast((e as Error).message);
    }
  }

  return (
    <>
      <div className="section-head">
        <h1 style={{ margin: 0 }}>Usuários e acessos</h1>
        <div className="row">
          <button className="btn secondary" onClick={() => setImporting(true)}>
            ⬆ Importar CSV
          </button>
          <button className="btn secondary" onClick={() => download('/admin/users/export.csv', 'usuarios.csv')}>
            ⬇ Exportar CSV
          </button>
          <button className="btn" onClick={() => setCreating(true)}>
            + Novo usuário
          </button>
        </div>
      </div>
      <div className="row mb">
        <input className="input" style={{ maxWidth: 320 }} placeholder="Buscar nome, e-mail, município…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="input" style={{ width: 170 }} value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">Todos os perfis</option>
          <option value="student">Alunos</option>
          <option value="admin">Administradores</option>
          <option value="company">Empresas parceiras</option>
        </select>
        <select className="input" style={{ width: 150 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Desativados</option>
        </select>
      </div>
      <Loader data={data} error={error}>
        {(d) => (
          <>
            <div className="card pad-0 table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Município</th>
                    <th>Perfil</th>
                    <th className="num">Cursos</th>
                    <th className="num">Estudo</th>
                    <th>Último acesso</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d.users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <button className="btn ghost sm" style={{ padding: 0, minHeight: 0 }} onClick={() => setDetail(u.id)}>
                          {u.name}
                        </button>
                        <div className="muted small">{u.email}</div>
                      </td>
                      <td>{u.municipality ?? '—'}</td>
                      <td>
                        {u.role === 'company' ? (
                          <span className="pill info">Empresa</span>
                        ) : (
                          <select
                            className="input"
                            style={{ minHeight: 32, padding: '4px 8px', width: 140 }}
                            value={u.role}
                            disabled={u.id === me?.id}
                            onChange={(e) => patch(u, { role: e.target.value }, 'Perfil atualizado')}
                          >
                            <option value="student">Aluno</option>
                            <option value="admin">Administrador</option>
                          </select>
                        )}
                      </td>
                      <td className="num">
                        {u.completed}/{u.enrollments}
                      </td>
                      <td className="num">{fmtDuration(u.study_seconds)}</td>
                      <td className="small">{u.last_seen_at ? timeAgo(u.last_seen_at) : '—'}</td>
                      <td>
                        {u.is_active ? <span className="pill success">Ativo</span> : <span className="pill danger">Desativado</span>}{' '}
                        {!!u.is_demo && <span className="pill gray">demo</span>}
                      </td>
                      <td className="nowrap">
                        {u.id !== me?.id && (
                          <button className="btn ghost sm" onClick={() => patch(u, { is_active: !u.is_active }, u.is_active ? 'Usuário desativado' : 'Usuário reativado')}>
                            {u.is_active ? 'Desativar' : 'Reativar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={d.page} pageSize={d.pageSize} total={d.total} onChange={setPage} />
          </>
        )}
      </Loader>
      {detail && <UserDetail id={detail} onClose={() => setDetail(null)} />}
      {creating && <CreateUser onClose={() => setCreating(false)} onDone={reload} />}
      {importing && <ImportUsers onClose={() => setImporting(false)} onDone={reload} />}
    </>
  );
}

function UserDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, error } = useApi<any>(`/admin/users/${id}`);
  const { toast } = useNotifications();
  return (
    <Modal title="Detalhes do usuário" onClose={onClose} wide>
      <Loader data={data} error={error}>
        {(d) => (
          <div className="stack">
            <div className="row between">
              <div>
                <h3 style={{ margin: 0 }}>{d.user.name}</h3>
                <span className="muted small">
                  {d.user.email} · cadastro {fmtDate(d.user.created_at)} · último login {fmtDateTime(d.user.last_login_at)}
                </span>
              </div>
              <button
                className="btn secondary sm"
                onClick={async () => {
                  await api.post(`/admin/users/${id}/send-reset`);
                  toast('Link de redefinição enviado por e-mail');
                }}
              >
                Enviar link de nova senha
              </button>
            </div>
            <h4>Matrículas</h4>
            <table className="table">
              <thead>
                <tr><th>Curso</th><th>Status</th><th className="num">Progresso</th><th className="num">Nota</th></tr>
              </thead>
              <tbody>
                {d.enrollments.map((e: any) => (
                  <tr key={e.id}>
                    <td>{e.title}</td>
                    <td>{e.status === 'completed' ? 'Concluído' : 'Em andamento'}</td>
                    <td className="num">{Math.round(e.progress)}%</td>
                    <td className="num">{e.final_grade ?? '—'}</td>
                  </tr>
                ))}
                {!d.enrollments.length && <tr><td colSpan={4} className="muted">Sem matrículas.</td></tr>}
              </tbody>
            </table>
            <h4>Certificados</h4>
            {d.certificates.length ? d.certificates.map((c: any) => <div key={c.code} className="small"><PixelIcon name="scroll" size={14} /> {c.course_title} · {c.code} · {fmtDate(c.issued_at)}</div>) : <p className="muted small">Nenhum.</p>}
            <h4>Atividade recente (logs)</h4>
            {d.logs.map((l: any, i: number) => (
              <div key={i} className="small row between">
                <code>{l.action}</code>
                <span className="muted">{fmtDateTime(l.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Loader>
    </Modal>
  );
}

function CreateUser({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'student', municipality: '', school: '' });
  const [error, setError] = useState<string | null>(null);
  const { toast } = useNotifications();
  async function save() {
    try {
      await api.post('/admin/users', form);
      toast('Usuário criado', 'Um convite para definir a senha foi enviado por e-mail.');
      onDone();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  return (
    <Modal title="Novo usuário" onClose={onClose} footer={<><button className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn" onClick={save}>Criar e enviar convite</button></>}>
      <div className="form-grid">
        <Field label="Nome"><input className="input" value={form.name} onChange={set('name')} /></Field>
        <Field label="E-mail"><input className="input" type="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="Perfil">
          <select className="input" value={form.role} onChange={set('role')}>
            <option value="student">Aluno</option>
            <option value="admin">Administrador</option>
          </select>
        </Field>
        <Field label="Município"><input className="input" value={form.municipality} onChange={set('municipality')} /></Field>
        <Field label="Escola" className="full"><input className="input" value={form.school} onChange={set('school')} /></Field>
      </div>
      <div className="mt"><ErrorBox error={error} /></div>
    </Modal>
  );
}

function ImportUsers({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [report, setReport] = useState<{ created: number; skipped: number; errors: { line: number; error: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function send() {
    const file = fileRef.current?.files?.[0];
    if (!file) return setError('Selecione um arquivo CSV.');
    const fd = new FormData();
    fd.append('file', file);
    setBusy(true);
    try {
      setReport(await api.post('/admin/users/import', fd));
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const template = () => {
    const blob = new Blob(['﻿nome;email;municipio;escola;perfil;nascimento\nMaria Souza;maria@exemplo.com;Rio Pomba;E.E. Exemplo;aluno;2008-05-10\n'], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'modelo-importacao.csv';
    a.click();
  };
  return (
    <Modal title="Importar usuários (CSV)" onClose={onClose} footer={<><button className="btn secondary" onClick={onClose}>Fechar</button>{!report && <button className="btn" onClick={send} disabled={busy}>Importar</button>}</>}>
      <div className="stack">
        <p className="small text-2" style={{ margin: 0 }}>
          Colunas aceitas: <code>nome; email; municipio; escola; perfil; nascimento (AAAA-MM-DD)</code>. Separador <code>;</code> ou <code>,</code>. E-mails já
          cadastrados são ignorados. Cada novo usuário recebe um e-mail para definir a senha.
        </p>
        <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={template}>⬇ Baixar modelo</button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="input" />
        <ErrorBox error={error} />
        {report && (
          <div className="alert success">
            {report.created} criados · {report.skipped} já existentes · {report.errors.length} com erro
            {report.errors.slice(0, 10).map((e) => (
              <div key={e.line} className="small">Linha {e.line}: {e.error}</div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
