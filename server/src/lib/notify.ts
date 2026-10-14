import { get, run } from '../db';
import { pushToUser } from './realtime';

export type NotificationType =
  | 'welcome'
  | 'badge'
  | 'level_up'
  | 'course_completed'
  | 'certificate'
  | 'assessment'
  | 'message'
  | 'friend_request'
  | 'friend_accepted'
  | 'announcement'
  | 'event'
  | 'partner'
  | 'talent_invite'
  | 'job_application';

/** Cria uma notificação na plataforma e a entrega em tempo real (SSE) se o usuário estiver online. */
export function notify(userId: number, type: NotificationType, title: string, body?: string, link?: string) {
  const { id } = run(
    'INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)',
    userId,
    type,
    title,
    body ?? null,
    link ?? null,
  );
  const notification = get('SELECT * FROM notifications WHERE id = ?', id);
  pushToUser(userId, 'notification', notification);
}
