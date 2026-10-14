import type { Response } from 'express';

// Server-Sent Events: notificações em tempo real para alunos e atualização do dashboard admin.

const userStreams = new Map<number, Set<Response>>();
const adminStreams = new Set<Response>();

function open(res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 5000\n\n');
  const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
  res.on('close', () => clearInterval(ping));
}

function send(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function openUserStream(userId: number, res: Response) {
  open(res);
  let set = userStreams.get(userId);
  if (!set) userStreams.set(userId, (set = new Set()));
  set.add(res);
  res.on('close', () => {
    set!.delete(res);
    if (!set!.size) userStreams.delete(userId);
  });
}

export function openAdminStream(res: Response, onOpen?: (push: (event: string, data: unknown) => void) => void) {
  open(res);
  adminStreams.add(res);
  res.on('close', () => adminStreams.delete(res));
  onOpen?.((event, data) => send(res, event, data));
}

export function pushToUser(userId: number, event: string, data: unknown) {
  userStreams.get(userId)?.forEach((res) => send(res, event, data));
}

export function broadcastAdmins(event: string, data: unknown) {
  adminStreams.forEach((res) => send(res, event, data));
}

export const hasAdminListeners = () => adminStreams.size > 0;
export const onlineUsers = () => userStreams.size;
