import { useState } from 'react';
import { Link } from 'react-router';
import { Avatar } from '../../components/Avatar';
import { PixelIcon } from '../../components/PixelIcon';
import { Empty, Loader, Tabs } from '../../components/ui';
import { api } from '../../lib/api';
import { useApi, useDebounced, useDocumentTitle } from '../../lib/hooks';
import { useNotifications } from '../../lib/notifications';
import type { PublicUser } from '../../lib/types';

type Person = PublicUser & { friendship_id: number };
type SearchResult = PublicUser & { friendship: { id: number; requester_id: number; addressee_id: number; status: string } | null };

function PersonRow({ p, children }: { p: PublicUser; children?: React.ReactNode }) {
  return (
    <div className="rank-row">
      <Avatar config={p.avatar} name={p.name} size={44} />
      <div className="grow">
        <strong>{p.name}</strong>
        <div className="muted small">
          {[p.municipality, p.school].filter(Boolean).join(' · ')} · {p.points} pts
        </div>
      </div>
      <div className="row">{children}</div>
    </div>
  );
}

export function Connections() {
  useDocumentTitle('Conexões');
  const [tab, setTab] = useState<'amigos' | 'solicitacoes' | 'buscar'>('amigos');
  const { data, error, reload } = useApi<{ friends: Person[]; incoming: Person[]; outgoing: Person[] }>('/connections');
  const [q, setQ] = useState('');
  const query = useDebounced(q);
  const search = useApi<{ users: SearchResult[] }>(tab === 'buscar' && query.length >= 2 ? `/connections/search?q=${encodeURIComponent(query)}` : null);
  const { toast, refresh } = useNotifications();

  const act = async (fn: () => Promise<unknown>, msg?: string) => {
    try {
      await fn();
      if (msg) toast(msg);
    } catch (e) {
      toast((e as Error).message);
    }
    reload();
    search.reload();
    refresh();
  };

  return (
    <div className="container page" style={{ maxWidth: 860 }}>
      <h1>Conexões</h1>
      <p className="text-2">Adicione colegas, acompanhe o progresso deles e compare perfis.</p>
      <Loader data={data} error={error}>
        {(d) => (
          <>
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                { value: 'amigos', label: `Amigos (${d.friends.length})` },
                { value: 'solicitacoes', label: `Solicitações${d.incoming.length ? ` (${d.incoming.length})` : ''}` },
                { value: 'buscar', label: <><PixelIcon name="search" size={16} /> Encontrar colegas</> },
              ]}
            />
            {tab === 'amigos' &&
              (d.friends.length ? (
                <div className="card pad-0">
                  {d.friends.map((p) => (
                    <PersonRow key={p.id} p={p}>
                      <Link className="btn sm" to={`/conexoes/comparar/${p.id}`}>
                        Comparar
                      </Link>
                      <button className="btn ghost sm" onClick={() => confirm(`Desfazer amizade com ${p.name}?`) && act(() => api.del(`/connections/friends/${p.id}`))}>
                        Remover
                      </button>
                    </PersonRow>
                  ))}
                </div>
              ) : (
                <Empty icon="users" title="Você ainda não tem amigos na plataforma">
                  <button className="btn" onClick={() => setTab('buscar')}>
                    Encontrar colegas
                  </button>
                </Empty>
              ))}
            {tab === 'solicitacoes' && (
              <div className="stack">
                <h3>Recebidas</h3>
                {d.incoming.length ? (
                  <div className="card pad-0">
                    {d.incoming.map((p) => (
                      <PersonRow key={p.id} p={p}>
                        <button className="btn sm" onClick={() => act(() => api.post(`/connections/requests/${p.friendship_id}/accept`), 'Amizade aceita!')}>
                          Aceitar
                        </button>
                        <button className="btn secondary sm" onClick={() => act(() => api.post(`/connections/requests/${p.friendship_id}/decline`))}>
                          Recusar
                        </button>
                      </PersonRow>
                    ))}
                  </div>
                ) : (
                  <p className="muted">Nenhuma solicitação pendente.</p>
                )}
                <h3>Enviadas</h3>
                {d.outgoing.length ? (
                  <div className="card pad-0">
                    {d.outgoing.map((p) => (
                      <PersonRow key={p.id} p={p}>
                        <span className="pill gray">Aguardando</span>
                        <button className="btn ghost sm" onClick={() => act(() => api.post(`/connections/requests/${p.friendship_id}/decline`))}>
                          Cancelar
                        </button>
                      </PersonRow>
                    ))}
                  </div>
                ) : (
                  <p className="muted">Nenhuma solicitação enviada.</p>
                )}
              </div>
            )}
            {tab === 'buscar' && (
              <div className="stack">
                <input className="input" placeholder="Busque por nome, escola ou município…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
                {query.length < 2 ? (
                  <p className="muted small">Digite pelo menos 2 letras.</p>
                ) : (
                  <Loader data={search.data} error={search.error}>
                    {(s) =>
                      s.users.length ? (
                        <div className="card pad-0">
                          {s.users.map((u) => (
                            <PersonRow key={u.id} p={u}>
                              {u.friendship?.status === 'accepted' ? (
                                <Link className="btn sm secondary" to={`/conexoes/comparar/${u.id}`}>
                                  Amigos ✓
                                </Link>
                              ) : u.friendship?.status === 'pending' ? (
                                <span className="pill gray">Pendente</span>
                              ) : (
                                <button className="btn sm" onClick={() => act(() => api.post('/connections/requests', { user_id: u.id }), 'Solicitação enviada')}>
                                  + Adicionar
                                </button>
                              )}
                            </PersonRow>
                          ))}
                        </div>
                      ) : (
                        <p className="muted">Ninguém encontrado.</p>
                      )
                    }
                  </Loader>
                )}
              </div>
            )}
          </>
        )}
      </Loader>
    </div>
  );
}
