import type { AvatarConfig, LevelInfo, Role } from './types';

/** Rótulos do vocabulário da ponte com o mercado (o servidor tem as mesmas chaves em lib/talent.ts). */
export const AREA_LABEL: Record<string, string> = {
  tecnologia: 'Tecnologia',
  dados: 'Dados',
  design: 'Design',
  marketing: 'Marketing',
  administracao: 'Administração',
  vendas: 'Vendas',
  atendimento: 'Atendimento',
  industria: 'Indústria',
  agro: 'Agro',
  energia: 'Energia',
  saude: 'Saúde',
  educacao: 'Educação',
};
export const AREAS = Object.keys(AREA_LABEL);

export const JOB_TYPE_LABEL: Record<string, string> = {
  estagio: 'Estágio',
  jovem_aprendiz: 'Jovem aprendiz',
  emprego: 'Emprego',
  trainee: 'Trainee',
  freelance: 'Freelance',
};
export const GOAL_LABEL: Record<string, string> = { ...JOB_TYPE_LABEL, qualquer: 'Aberto(a) a oportunidades' };
export const MODALITY_LABEL: Record<string, string> = { presencial: 'Presencial', hibrido: 'Híbrido', remoto: 'Remoto' };
export const SIZE_LABEL: Record<string, string> = { micro: 'Microempresa', pequena: 'Pequena', media: 'Média', grande: 'Grande' };

export const COMPANY_STATUS: Record<string, { label: string; pill: string }> = {
  pending: { label: 'Em análise', pill: 'warning' },
  approved: { label: 'Aprovada', pill: 'success' },
  rejected: { label: 'Recusada', pill: 'danger' },
  suspended: { label: 'Suspensa', pill: 'gray' },
};
export const APPLICATION_STATUS: Record<string, { label: string; pill: string }> = {
  sent: { label: 'Enviada', pill: 'info' },
  viewed: { label: 'Vista pela empresa', pill: 'gray' },
  shortlisted: { label: 'Próxima etapa', pill: 'gold' },
  declined: { label: 'Encerrada', pill: 'danger' },
  hired: { label: 'Aprovado(a)', pill: 'success' },
};
export const INVITE_STATUS: Record<string, { label: string; pill: string }> = {
  pending: { label: 'Aguardando resposta', pill: 'warning' },
  accepted: { label: 'Aceito', pill: 'success' },
  declined: { label: 'Recusado', pill: 'gray' },
};

/** Para onde cada perfil vai ao entrar. */
export const homeFor = (role: Role) => (role === 'admin' ? '/admin' : role === 'company' ? '/empresa' : '/painel');

/** Formata 14 dígitos como 00.000.000/0000-00 enquanto a pessoa digita. */
export function maskCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export interface Company {
  id: number;
  name: string;
  legal_name?: string | null;
  cnpj?: string;
  sector: string;
  size: string | null;
  municipality: string;
  website: string | null;
  description: string | null;
  contact_phone?: string | null;
  color: string;
  status?: string;
  review_note?: string | null;
  created_at?: string;
}

export interface JobMatch {
  wanted: number;
  have: number;
  missing: number[];
  levelOk: boolean;
  score: number;
}

export interface Job {
  id: number;
  title: string;
  type: string;
  modality: string;
  municipality: string | null;
  area: string;
  description: string;
  requirements: string | null;
  benefits: string | null;
  course_ids: number[];
  min_level: number;
  status?: 'open' | 'closed';
  closes_at: string | null;
  created_at: string;
  applications?: number;
  new_applications?: number;
}

export interface StudentJob extends Job {
  company: Company;
  match: JobMatch;
  application: { id: number; status: string; created_at: string } | null;
}

export interface TalentCard {
  id: number;
  name: string;
  municipality: string | null;
  school: string | null;
  avatar: AvatarConfig | null;
  points: number;
  level: LevelInfo;
  age: number | null;
  headline: string | null;
  areas: string[];
  goal: string | null;
  courses_completed: number;
  certificates: number;
  study_seconds: number;
  last_seen_at: string | null;
  saved?: boolean;
}
