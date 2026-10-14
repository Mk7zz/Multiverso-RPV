import { all, get } from '../db';
import { addDays, daysAgoIso, localDay } from './dates';
import { awardPoints, checkBadges } from './gamification';
import { badRequest, HttpError, notFound } from './http';
import { getNumberSetting, type SettingKey } from './settings';

// Missões: metas diárias e semanais calculadas a partir da atividade já registrada
// (aulas, tempo de estudo, tentativas, amizades). A recompensa é resgatada pelo aluno e
// gravada no points_ledger com ref "<código>:<início do período>", o que a torna única por período.

type Period = 'daily' | 'weekly';

interface Window {
  userId: number;
  start: string; // YYYY-MM-DD (fuso da plataforma)
  end: string;
}

interface QuestDef {
  code: string;
  period: Period;
  title: string;
  icon: string;
  goal: number;
  unit?: string;
  reward: SettingKey;
  measure: (w: Window) => number;
}

/** Conta eventos (timestamps ISO UTC) cujo dia local cai dentro da janela. */
function countInWindow(sql: string, w: Window, ...params: (string | number)[]) {
  const rows = all<{ at: string }>(sql, w.userId, ...params, daysAgoIso(9));
  return rows.filter((r) => {
    const day = localDay(new Date(r.at));
    return day >= w.start && day <= w.end;
  }).length;
}

const lessonsDone = (w: Window) => countInWindow('SELECT completed_at at FROM lesson_progress WHERE user_id = ? AND completed_at >= ?', w);
const attemptsDone = (w: Window) => countInWindow('SELECT created_at at FROM attempts WHERE user_id = ? AND created_at >= ?', w);
const quizzesPassed = (w: Window) =>
  countInWindow(
    "SELECT t.created_at at FROM attempts t JOIN assessments a ON a.id = t.assessment_id WHERE t.user_id = ? AND t.passed = 1 AND a.kind = 'quiz' AND t.created_at >= ?",
    w,
  );
const newFriends = (w: Window) =>
  countInWindow(
    "SELECT responded_at at FROM friendships WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted' AND responded_at >= ?",
    w,
    w.userId,
  );
const studySeconds = (w: Window) =>
  Number(get<{ n: number }>('SELECT COALESCE(SUM(seconds), 0) n FROM study_time WHERE user_id = ? AND day BETWEEN ? AND ?', w.userId, w.start, w.end)?.n ?? 0);
const studyDays = (w: Window) =>
  Number(get<{ n: number }>('SELECT COUNT(DISTINCT day) n FROM study_time WHERE user_id = ? AND day BETWEEN ? AND ?', w.userId, w.start, w.end)?.n ?? 0);
const dailyClaimed = (w: Window) =>
  Number(
    get<{ n: number }>("SELECT COUNT(*) n FROM points_ledger WHERE user_id = ? AND reason = 'quest' AND ref LIKE 'daily\\_%:' || ? ESCAPE '\\' AND ref NOT LIKE 'daily\\_chest:%' ESCAPE '\\'", w.userId, w.start)?.n ?? 0,
  );

export const QUESTS: QuestDef[] = [
  { code: 'daily_lesson', period: 'daily', title: 'Concluir 1 aula', icon: 'play', goal: 1, reward: 'points_quest_daily', measure: lessonsDone },
  { code: 'daily_study', period: 'daily', title: 'Estudar 15 minutos', icon: 'clock', goal: 15, unit: 'min', reward: 'points_quest_daily', measure: (w) => Math.floor(studySeconds(w) / 60) },
  { code: 'daily_practice', period: 'daily', title: 'Resolver 1 exercício ou avaliação', icon: 'puzzle', goal: 1, reward: 'points_quest_daily', measure: attemptsDone },
  { code: 'daily_chest', period: 'daily', title: 'Baú do Vale: resgate as 3 missões do dia', icon: 'chest', goal: 3, reward: 'points_quest_chest', measure: dailyClaimed },
  { code: 'weekly_lessons', period: 'weekly', title: 'Concluir 5 aulas na semana', icon: 'books', goal: 5, reward: 'points_quest_weekly', measure: lessonsDone },
  { code: 'weekly_days', period: 'weekly', title: 'Estudar em 4 dias diferentes', icon: 'flame', goal: 4, unit: 'dias', reward: 'points_quest_weekly', measure: studyDays },
  { code: 'weekly_quiz', period: 'weekly', title: 'Ser aprovado(a) em 1 avaliação', icon: 'trophy', goal: 1, reward: 'points_quest_weekly', measure: quizzesPassed },
  { code: 'weekly_connect', period: 'weekly', title: 'Fazer 1 nova conexão', icon: 'users', goal: 1, reward: 'points_quest_weekly', measure: newFriends },
];

/** Janelas do período corrente: dia de hoje e semana de segunda a domingo. */
export function periodWindow(period: Period, userId: number): Window {
  const today = localDay();
  if (period === 'daily') return { userId, start: today, end: today };
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay();
  const start = addDays(today, -((dow + 6) % 7));
  return { userId, start, end: addDays(start, 6) };
}

const refFor = (q: QuestDef, w: Window) => `${q.code}:${w.start}`;

function evaluate(q: QuestDef, userId: number) {
  const w = periodWindow(q.period, userId);
  const current = Math.min(q.goal, q.measure(w));
  const claimed = !!get("SELECT 1 FROM points_ledger WHERE user_id = ? AND reason = 'quest' AND ref = ?", userId, refFor(q, w));
  return {
    code: q.code,
    period: q.period,
    title: q.title,
    icon: q.icon,
    goal: q.goal,
    unit: q.unit ?? null,
    current,
    reward: getNumberSetting(q.reward),
    completed: current >= q.goal,
    claimed,
  };
}

export function listQuests(userId: number) {
  const quests = QUESTS.map((q) => evaluate(q, userId));
  return {
    daily: quests.filter((q) => q.period === 'daily'),
    weekly: quests.filter((q) => q.period === 'weekly'),
    weekEndsOn: periodWindow('weekly', userId).end,
  };
}

/** Quantas recompensas estão prontas para resgate (indicador no menu). */
export const claimableCount = (userId: number) => QUESTS.map((q) => evaluate(q, userId)).filter((q) => q.completed && !q.claimed).length;

export function claimQuest(userId: number, code: string) {
  const q = QUESTS.find((x) => x.code === code);
  if (!q) throw notFound('Missão não encontrada');
  const state = evaluate(q, userId);
  if (!state.completed) throw badRequest('Missão ainda não concluída');
  if (!awardPoints(userId, q.reward, 'quest', refFor(q, periodWindow(q.period, userId)))) throw new HttpError(409, 'Recompensa já resgatada');
  checkBadges(userId);
  return state.reward;
}
