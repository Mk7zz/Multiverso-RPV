import { Empty, Loader } from '../../components/ui';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import type { Announcement, EventItem } from '../../lib/types';
import { AnnouncementList, EventCard } from '../../components/Feed';

export function Events() {
  useDocumentTitle('Eventos');
  const { data, error } = useApi<{ events: EventItem[] }>('/catalog/events');
  const ann = useApi<{ announcements: Announcement[] }>('/catalog/announcements');
  return (
    <div className="container page" style={{ maxWidth: 860 }}>
      <h1>Eventos e avisos</h1>
      <p className="text-2">Palestras, mesas-redondas e atividades do ecossistema Rio Pomba Valley.</p>
      {ann.data && <div className="mb"><AnnouncementList items={ann.data.announcements} /></div>}
      <Loader data={data} error={error}>
        {(d) =>
          d.events.length ? (
            <div className="stack">
              {d.events.map((e) => (
                <EventCard key={e.id} e={e} />
              ))}
            </div>
          ) : (
            <Empty icon="calendar" title="Nenhum evento agendado no momento" />
          )
        }
      </Loader>
    </div>
  );
}
