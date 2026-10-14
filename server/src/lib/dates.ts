import { config } from '../config';

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: config.timezone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Data local (YYYY-MM-DD) no fuso da plataforma. */
export function localDay(date: Date = new Date()): string {
  return dayFormatter.format(date);
}

export function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function formatDateBR(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: config.timezone, dateStyle: 'long' }).format(new Date(iso));
}
