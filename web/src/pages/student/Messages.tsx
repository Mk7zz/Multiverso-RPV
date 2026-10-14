import { useState } from 'react';
import { PixelIcon } from '../../components/PixelIcon';
import { Empty, Loader } from '../../components/ui';
import { api } from '../../lib/api';
import { fmtDateTime } from '../../lib/format';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import { useNotifications } from '../../lib/notifications';

interface Message {
  id: number;
  subject: string;
  body: string;
  created_at: string;
  read_at: string | null;
  sender_name: string | null;
  course_title: string | null;
}

/** Caixa de entrada das mensagens internas enviadas pela equipe. */
export function Messages() {
  useDocumentTitle('Mensagens');
  const { data, error, setData } = useApi<{ messages: Message[] }>('/communication/messages');
  const [openId, setOpenId] = useState<number | null>(null);
  const { refresh } = useNotifications();

  async function open(m: Message) {
    setOpenId(openId === m.id ? null : m.id);
    if (!m.read_at) {
      await api.post(`/communication/messages/${m.id}/read`);
      setData((d) => d && { messages: d.messages.map((x) => (x.id === m.id ? { ...x, read_at: new Date().toISOString() } : x)) });
      refresh();
    }
  }

  return (
    <div className="container page" style={{ maxWidth: 820 }}>
      <h1>Mensagens da equipe</h1>
      <Loader data={data} error={error}>
        {(d) =>
          d.messages.length ? (
            <div className="card pad-0">
              {d.messages.map((m) => (
                <div key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <button
                    onClick={() => open(m)}
                    className="rank-row"
                    style={{ width: '100%', border: 0, background: m.read_at ? 'transparent' : 'var(--brand-50)', font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <PixelIcon name={m.read_at ? 'mail' : 'bell'} size={20} />
                    <div className="grow">
                      <strong style={{ fontWeight: m.read_at ? 500 : 700 }}>{m.subject}</strong>
                      <div className="muted small">
                        {m.sender_name ?? 'Equipe Multiverso'}
                        {m.course_title && ` · ${m.course_title}`}
                      </div>
                    </div>
                    <span className="muted small nowrap">{fmtDateTime(m.created_at)}</span>
                  </button>
                  {openId === m.id && (
                    <div style={{ padding: '4px 20px 18px 54px', whiteSpace: 'pre-line' }} className="prose">
                      {m.body}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty icon="mail" title="Nenhuma mensagem por enquanto" />
          )
        }
      </Loader>
    </div>
  );
}
