const dateFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' });
const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });
const numFmt = new Intl.NumberFormat('pt-BR');

export const fmtDate = (iso?: string | null) => (iso ? dateFmt.format(new Date(iso)) : '—');
export const fmtDateTime = (iso?: string | null) => (iso ? dateTimeFmt.format(new Date(iso)) : '—');
export const fmtNum = (n?: number | null) => (n == null ? '—' : numFmt.format(n));
export const fmtPct = (n?: number | null) => (n == null ? '—' : `${numFmt.format(n)}%`);

export function fmtDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h && m) return `${h}h ${m}min`;
  if (h) return `${h}h`;
  return `${m}min`;
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 7 * 86400) return `há ${Math.floor(diff / 86400)} d`;
  return fmtDate(iso);
}

export const fmtBytes = (b?: number | null) =>
  b == null ? '' : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`;

/** Converte ISO para o valor de <input type="datetime-local">. */
export function toLocalInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

export const MUNICIPALITIES = [
  'Rio Pomba', 'Juiz de Fora', 'Ubá', 'Cataguases', 'Muriaé', 'Leopoldina', 'Viçosa', 'Tocantins', 'Guarani',
  'Mercês', 'Piraúba', 'Silveirânia', 'Tabuleiro', 'Astolfo Dutra', 'Dona Euzébia', 'Rodeiro', 'Visconde do Rio Branco',
  'São João Nepomuceno', 'Santos Dumont', 'Barbacena', 'Carangola', 'Ponte Nova', 'Além Paraíba',
];
