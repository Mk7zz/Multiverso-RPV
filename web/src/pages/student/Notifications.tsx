import { Link } from 'react-router';
import { Empty, Loader } from '../../components/ui';
import { api } from '../../lib/api';
import { timeAgo } from '../../lib/format';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import { useNotifications } from '../../lib/notifications';
import type { Notification } from '../../lib/types';
import { PixelIcon } from '../../components/PixelIcon';

const ICONS: Record<string, string> = {
  welcome: 'compass',
  badge: 'medal',
  course_completed: 'gradcap',
  certificate: 'scroll',
  assessment: 'pencil',
  message: 'mail',
  friend_request: 'users',
  friend_accepted: 'users',
  announcement: 'megaphone',
  event: 'calendar',
};

export function Notifications() {
  useDocumentTitle('Notificações');
  const { data, error, reload } = useApi<{ notifications: Notification[] }>('/communication/notifications');
  const { refresh } = useNotifications();

  const markAll = async () => {
    await api.post('/communication/notifications/read-all');
    reload();
    refresh();
  };
  const open = async (n: Notification) => {
    if (!n.read_at) {
      await api.post(`/communication/notifications/${n.id}/read`);
      refresh();
    }
  };

  return (
    <div className="container page" style={{ maxWidth: 760 }}>
      <div className="row between mb">
        <h1 style={{ margin: 0 }}>Notificações</h1>
        <button className="btn secondary" onClick={markAll}>
          Marcar todas como lidas
        </button>
      </div>
      <Loader data={data} error={error}>
        {(d) =>
          d.notifications.length ? (
            <div className="card pad-0">
              {d.notifications.map((n) => {
                const body = (
                  <div className="rank-row" style={{ background: n.read_at ? undefined : 'var(--brand-50)' }}>
                    <PixelIcon name={ICONS[n.type] ?? (n.type === 'level_up' ? 'star' : 'bell')} size={24} />
                    <div className="grow">
                      <strong style={{ fontWeight: n.read_at ? 500 : 700, color: 'var(--text)' }}>{n.title}</strong>
                      {n.body && <div className="small text-2">{n.body}</div>}
                    </div>
                    <span className="muted small nowrap">{timeAgo(n.created_at)}</span>
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} to={n.link} onClick={() => open(n)} style={{ display: 'block', textDecoration: 'none' }}>
                    {body}
                  </Link>
                ) : (
                  <div key={n.id} onClick={() => open(n)}>
                    {body}
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty icon="bell" title="Nenhuma notificação" />
          )
        }
      </Loader>
    </div>
  );
}
