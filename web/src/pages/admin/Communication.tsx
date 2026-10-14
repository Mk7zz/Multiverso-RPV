import { useState } from 'react';
import { PixelIcon } from '../../components/PixelIcon';
import { ErrorBox, Field, Loader, Modal, Tabs } from '../../components/ui';
import { api } from '../../lib/api';
import { fmtDateTime, fromLocalInput, toLocalInput } from '../../lib/format';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import { useNotifications } from '../../lib/notifications';
import type { Announcement, EventItem } from '../../lib/types';

/** Avisos, eventos e mensagens internas. */
export function AdminCommunication() {
  useDocumentTitle('Comunicação');
  const [tab, setTab] = useState<'mensagens' | 'avisos' | 'eventos'>('mensagens');
  return (
    <>
      <h1>Comunicação</h1>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'mensagens', label: <><PixelIcon name="mail" size={16} /> Mensagens internas</> },
          { value: 'avisos', label: <><PixelIcon name="megaphone" size={16} /> Avisos</> },
          { value: 'eventos', label: <><PixelIcon name="calendar" size={16} /> Eventos</> },
        ]}
      />
      {tab === 'mensagens' && <MessagesTab />}
      {tab === 'avisos' && <AnnouncementsTab />}
      {tab === 'eventos' && <EventsTab />}
    </>
  );
}

function MessagesTab() {
  const { data, error, reload } = useApi<{ messages: any[] }>('/admin/messages');
  const courses = useApi<{ courses: { id: number; title: string }[] }>('/admin/content/courses');
  const { toast } = useNotifications();
  const [f, setF] = useState({ subject: '', body: '', audience: 'all', course_id: '', send_email: false });
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    setErr(null);
    try {
      const r = await api.post('/admin/messages', { ...f, course_id: f.course_id ? Number(f.course_id) : undefined });
      toast(`Mensagem enviada para ${r.recipients} aluno(s)`);
      setF({ subject: '', body: '', audience: 'all', course_id: '', send_email: false });
      reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="split">
      <Loader data={data} error={error}>
        {(d) => (
          <div className="card pad-0 table-wrap">
            <table className="table">
              <thead>
                <tr><th>Assunto</th><th>Destinatários</th><th className="num">Lidas</th><th>Enviada</th></tr>
              </thead>
              <tbody>
                {d.messages.map((m) => (
                  <tr key={m.id}>
                    <td><strong>{m.subject}</strong><div className="muted small truncate" style={{ maxWidth: 320 }}>{m.body}</div></td>
                    <td className="small">{m.audience === 'all' ? 'Todos os alunos' : m.audience === 'course' ? `Curso: ${m.course_title}` : 'Selecionados'}</td>
                    <td className="num">{m.read_count}/{m.recipients}</td>
                    <td className="small">{fmtDateTime(m.created_at)}</td>
                  </tr>
                ))}
                {!d.messages.length && <tr><td colSpan={4} className="muted center">Nenhuma mensagem enviada.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Loader>
      <div className="card stack">
        <h3 style={{ margin: 0 }}>Nova mensagem</h3>
        <Field label="Destinatários">
          <select className="input" value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>
            <option value="all">Todos os alunos</option>
            <option value="course">Alunos de um curso</option>
          </select>
        </Field>
        {f.audience === 'course' && (
          <Field label="Curso">
            <select className="input" value={f.course_id} onChange={(e) => setF({ ...f, course_id: e.target.value })}>
              <option value="">Selecione…</option>
              {courses.data?.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </Field>
        )}
        <Field label="Assunto"><input className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
        <Field label="Mensagem"><textarea className="input" style={{ minHeight: 140 }} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
        <label className="check"><input type="checkbox" checked={f.send_email} onChange={(e) => setF({ ...f, send_email: e.target.checked })} /> Avisar também por e-mail</label>
        <ErrorBox error={err} />
        <button className="btn" onClick={send}>Enviar</button>
      </div>
    </div>
  );
}

function AnnouncementsTab() {
  const { data, error, reload } = useApi<{ announcements: (Announcement & { author: string | null })[] }>('/admin/announcements');
  const [edit, setEdit] = useState<Partial<Announcement> | null>(null);
  return (
    <>
      <div className="row end mb"><button className="btn" onClick={() => setEdit({ level: 'info' })}>+ Novo aviso</button></div>
      <Loader data={data} error={error}>
        {(d) => (
          <div className="stack">
            {d.announcements.map((a) => (
              <div key={a.id} className="card flat row between" style={{ alignItems: 'flex-start' }}>
                <div className="grow">
                  <strong>{a.pinned && <><PixelIcon name="pin" size={14} /> </>}{a.title}</strong> {a.level === 'important' && <span className="pill warning">Importante</span>}
                  <p className="small text-2" style={{ margin: '4px 0', whiteSpace: 'pre-line' }}>{a.body}</p>
                  <span className="muted small">
                    {a.starts_at || a.ends_at ? `Exibição: ${a.starts_at ? fmtDateTime(a.starts_at) : 'agora'} → ${a.ends_at ? fmtDateTime(a.ends_at) : 'sem fim'}` : 'Sempre visível'} · por {a.author ?? '—'}
                  </span>
                </div>
                <div className="row">
                  <button className="btn ghost sm" onClick={() => setEdit(a)}>Editar</button>
                  <button className="btn ghost sm" onClick={async () => { if (confirm('Excluir aviso?')) { await api.del(`/admin/announcements/${a.id}`); reload(); } }}>Excluir</button>
                </div>
              </div>
            ))}
            {!d.announcements.length && <p className="muted">Nenhum aviso.</p>}
          </div>
        )}
      </Loader>
      {edit && <AnnouncementModal item={edit} onClose={() => setEdit(null)} onDone={reload} />}
    </>
  );
}

function AnnouncementModal({ item, onClose, onDone }: { item: Partial<Announcement>; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    title: item.title ?? '',
    body: item.body ?? '',
    level: item.level ?? 'info',
    pinned: !!item.pinned,
    starts_at: toLocalInput(item.starts_at),
    ends_at: toLocalInput(item.ends_at),
    notify_students: false,
  });
  const [err, setErr] = useState<string | null>(null);
  async function save() {
    try {
      const body = { ...f, starts_at: fromLocalInput(f.starts_at), ends_at: fromLocalInput(f.ends_at) };
      if (item.id) await api.put(`/admin/announcements/${item.id}`, body);
      else await api.post('/admin/announcements', body);
      onDone();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  return (
    <Modal title={item.id ? 'Editar aviso' : 'Novo aviso'} onClose={onClose} footer={<><button className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn" onClick={save}>Salvar</button></>}>
      <div className="stack">
        <Field label="Título"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Texto"><textarea className="input" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
        <div className="form-grid">
          <Field label="Início da exibição (opcional)"><input className="input" type="datetime-local" value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} /></Field>
          <Field label="Fim da exibição (opcional)"><input className="input" type="datetime-local" value={f.ends_at} onChange={(e) => setF({ ...f, ends_at: e.target.value })} /></Field>
        </div>
        <div className="row">
          <label className="check"><input type="checkbox" checked={f.level === 'important'} onChange={(e) => setF({ ...f, level: e.target.checked ? 'important' : 'info' })} /> Importante</label>
          <label className="check"><input type="checkbox" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} /> Fixar no topo</label>
          {!item.id && <label className="check"><input type="checkbox" checked={f.notify_students} onChange={(e) => setF({ ...f, notify_students: e.target.checked })} /> Notificar todos os alunos</label>}
        </div>
        <ErrorBox error={err} />
      </div>
    </Modal>
  );
}

function EventsTab() {
  const { data, error, reload } = useApi<{ events: EventItem[] }>('/admin/events');
  const [edit, setEdit] = useState<Partial<EventItem> | null>(null);
  return (
    <>
      <div className="row end mb"><button className="btn" onClick={() => setEdit({})}>+ Novo evento</button></div>
      <Loader data={data} error={error}>
        {(d) => (
          <div className="card pad-0 table-wrap">
            <table className="table">
              <thead><tr><th>Evento</th><th>Quando</th><th>Local</th><th>Curso</th><th /></tr></thead>
              <tbody>
                {d.events.map((e) => (
                  <tr key={e.id}>
                    <td><strong>{e.title}</strong></td>
                    <td className="small">{fmtDateTime(e.starts_at)}</td>
                    <td className="small">{e.location ?? '—'}</td>
                    <td className="small">{e.course_title ?? '—'}</td>
                    <td className="nowrap">
                      <button className="btn ghost sm" onClick={() => setEdit(e)}>Editar</button>
                      <button className="btn ghost sm" onClick={async () => { if (confirm('Excluir evento?')) { await api.del(`/admin/events/${e.id}`); reload(); } }}>Excluir</button>
                    </td>
                  </tr>
                ))}
                {!d.events.length && <tr><td colSpan={5} className="muted center">Nenhum evento.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Loader>
      {edit && <EventModal item={edit} onClose={() => setEdit(null)} onDone={reload} />}
    </>
  );
}

function EventModal({ item, onClose, onDone }: { item: Partial<EventItem>; onClose: () => void; onDone: () => void }) {
  const courses = useApi<{ courses: { id: number; title: string }[] }>('/admin/content/courses');
  const [f, setF] = useState({
    title: item.title ?? '',
    description: item.description ?? '',
    location: item.location ?? '',
    url: item.url ?? '',
    starts_at: toLocalInput(item.starts_at),
    ends_at: toLocalInput(item.ends_at),
    course_id: item.course_id ? String(item.course_id) : '',
    notify_students: false,
  });
  const [err, setErr] = useState<string | null>(null);
  async function save() {
    try {
      if (!f.starts_at) throw new Error('Informe a data de início.');
      const body = { ...f, starts_at: fromLocalInput(f.starts_at), ends_at: fromLocalInput(f.ends_at), course_id: f.course_id ? Number(f.course_id) : null };
      if (item.id) await api.put(`/admin/events/${item.id}`, body);
      else await api.post('/admin/events', body);
      onDone();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  return (
    <Modal title={item.id ? 'Editar evento' : 'Novo evento'} onClose={onClose} footer={<><button className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn" onClick={save}>Salvar</button></>}>
      <div className="stack">
        <Field label="Título"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Descrição"><textarea className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="form-grid">
          <Field label="Início"><input className="input" type="datetime-local" value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} /></Field>
          <Field label="Término (opcional)"><input className="input" type="datetime-local" value={f.ends_at} onChange={(e) => setF({ ...f, ends_at: e.target.value })} /></Field>
          <Field label="Local"><input className="input" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
          <Field label="Link (transmissão, inscrição…)"><input className="input" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></Field>
          <Field label="Curso relacionado" className="full">
            <select className="input" value={f.course_id} onChange={(e) => setF({ ...f, course_id: e.target.value })}>
              <option value="">Nenhum (evento geral)</option>
              {courses.data?.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </Field>
        </div>
        {!item.id && <label className="check"><input type="checkbox" checked={f.notify_students} onChange={(e) => setF({ ...f, notify_students: e.target.checked })} /> Notificar alunos</label>}
        <ErrorBox error={err} />
      </div>
    </Modal>
  );
}
