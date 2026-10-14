import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, streamUrl } from './api';
import { useAuth } from './auth';
import type { Notification } from './types';

interface Toast {
  id: number;
  title: string;
  body?: string | null;
  link?: string | null;
}

interface NotificationState {
  unreadNotifications: number;
  unreadMessages: number;
  toasts: Toast[];
  dismiss: (id: number) => void;
  toast: (title: string, body?: string) => void;
  refresh: () => void;
}

const Ctx = createContext<NotificationState | null>(null);
let toastSeq = 0;

/** Contadores de não lidas + notificações em tempo real (SSE) exibidas como toasts. */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ unreadNotifications: 0, unreadMessages: 0 });
  const [toasts, setToasts] = useState<Toast[]>([]);

  const refresh = useCallback(() => {
    if (!user) return;
    api
      .get('/communication/summary')
      .then(setCounts)
      .catch(() => {});
  }, [user]);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = ++toastSeq;
      setToasts((list) => [...list.slice(-3), { ...t, id }]);
      setTimeout(() => dismiss(id), 6000);
    },
    [dismiss],
  );

  useEffect(() => {
    if (!user) return;
    refresh();
    const es = new EventSource(streamUrl('/communication/stream'));
    es.addEventListener('notification', (e) => {
      const n = JSON.parse((e as MessageEvent).data) as Notification;
      // Subida de nível ganha uma celebração própria (GameProvider), sem toast duplicado.
      if (n.type !== 'level_up') push({ title: n.title, body: n.body, link: n.link });
      refresh();
    });
    // Eventos de jogo são repassados ao GameProvider pela janela.
    for (const type of ['xp', 'level_up']) {
      es.addEventListener(type, (e) => window.dispatchEvent(new CustomEvent(`rpv:${type}`, { detail: JSON.parse((e as MessageEvent).data) })));
    }
    return () => es.close();
  }, [user, refresh, push]);

  return (
    <Ctx.Provider value={{ ...counts, toasts, dismiss, refresh, toast: (title, body) => push({ title, body }) }}>{children}</Ctx.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotifications fora do provider');
  return ctx;
}
