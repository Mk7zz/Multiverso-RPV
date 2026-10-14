import { Router, type Request } from 'express';
import { z } from 'zod';
import { all, get, run } from '../db';
import { audit } from '../lib/audit';
import { badRequest, forbidden, idParam, notFound, parse } from '../lib/http';
import { awardPoints, checkBadges } from '../lib/gamification';
import { notify } from '../lib/notify';
import { assessmentCourseId, recalcEnrollment, type AssessmentRow } from '../lib/progress';
import { broadcastAdmins } from '../lib/realtime';
import { isAdmin, requireAuth } from '../middleware/auth';

export const assessmentsRouter = Router();
assessmentsRouter.use(requireAuth);

interface QuestionRow {
  id: number;
  statement: string;
  explanation: string | null;
  type: 'single' | 'multiple';
  weight: number;
}

function loadAssessment(req: Request) {
  const a = get<AssessmentRow>('SELECT * FROM assessments WHERE id = ?', idParam(req));
  if (!a || (!a.published && !isAdmin(req))) throw notFound('Avaliação não encontrada');
  const courseId = assessmentCourseId(a);
  if (courseId && !isAdmin(req) && !get('SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?', req.user!.id, courseId)) {
    throw forbidden('Inscreva-se no curso para fazer esta avaliação.');
  }
  return { a, courseId };
}

function attemptState(userId: number, a: AssessmentRow) {
  const attempts = all<{ id: number; score: number; passed: number; is_recovery: number; created_at: string }>(
    'SELECT id, score, passed, is_recovery, created_at FROM attempts WHERE user_id = ? AND assessment_id = ? ORDER BY id',
    userId,
    a.id,
  );
  const passed = attempts.some((t) => t.passed);
  const best = attempts.reduce<number | null>((m, t) => (m === null || t.score > m ? t.score : m), null);
  // Limite de tentativas é pós-MVP: exercícios são livres; questionários reprovados vão para recuperação.
  const canAttempt = a.kind === 'exercise' || attempts.length === 0 || passed || !!a.allow_recovery;
  return { attempts, passed, best, canAttempt, nextIsRecovery: a.kind === 'quiz' && attempts.length > 0 && !passed };
}

function scopeContext(a: AssessmentRow, courseId: number | null) {
  const course = courseId ? get<{ id: number; title: string; slug: string }>('SELECT id, title, slug FROM courses WHERE id = ?', courseId) : null;
  const trail = a.scope_type === 'trail' ? get<{ id: number; title: string; slug: string }>('SELECT id, title, slug FROM trails WHERE id = ?', a.scope_id) : null;
  let scopeTitle: string | undefined;
  if (a.scope_type === 'module') scopeTitle = get<{ title: string }>('SELECT title FROM modules WHERE id = ?', a.scope_id)?.title;
  if (a.scope_type === 'lesson') scopeTitle = get<{ title: string }>('SELECT title FROM lessons WHERE id = ?', a.scope_id)?.title;
  if (a.scope_type === 'course') scopeTitle = course?.title;
  if (a.scope_type === 'trail') scopeTitle = trail?.title;
  return { course, trail, scopeTitle };
}

function questionsOf(assessmentId: number) {
  return all<QuestionRow>(
    `SELECT q.id, q.statement, q.explanation, q.type, aq.weight FROM assessment_questions aq
     JOIN questions q ON q.id = aq.question_id WHERE aq.assessment_id = ? ORDER BY aq.position, q.id`,
    assessmentId,
  );
}

function optionsOf(questionIds: number[]) {
  if (!questionIds.length) return [];
  return all<{ id: number; question_id: number; text: string; is_correct: number }>(
    `SELECT id, question_id, text, is_correct FROM question_options WHERE question_id IN (${questionIds.map(() => '?').join(',')}) ORDER BY position, id`,
    ...questionIds,
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

assessmentsRouter.get('/:id', (req, res) => {
  const { a, courseId } = loadAssessment(req);
  const questions = questionsOf(a.id);
  const options = optionsOf(questions.map((q) => q.id));
  const list = questions.map((q) => ({
    id: q.id,
    statement: q.statement,
    type: q.type,
    // O gabarito nunca é enviado antes da correção.
    options: options.filter((o) => o.question_id === q.id).map((o) => ({ id: o.id, text: o.text })),
  }));
  res.json({
    assessment: a,
    context: scopeContext(a, courseId),
    questions: a.shuffle_questions ? shuffle(list) : list,
    state: attemptState(req.user!.id, a),
  });
});

/** Correção automática (questões fechadas). */
assessmentsRouter.post('/:id/attempts', (req, res) => {
  const { a, courseId } = loadAssessment(req);
  const userId = req.user!.id;
  const { answers } = parse(z.object({ answers: z.record(z.string(), z.array(z.number().int())) }), req.body);
  const state = attemptState(userId, a);
  if (!state.canAttempt) throw badRequest('Esta avaliação não permite nova tentativa.');

  const questions = questionsOf(a.id);
  if (!questions.length) throw badRequest('Avaliação sem questões.');
  const options = optionsOf(questions.map((q) => q.id));

  let earned = 0;
  let total = 0;
  const results = questions.map((q) => {
    const opts = options.filter((o) => o.question_id === q.id);
    const correctIds = opts.filter((o) => o.is_correct).map((o) => o.id).sort((x, y) => x - y);
    const selected = [...new Set(answers[String(q.id)] ?? [])].filter((id) => opts.some((o) => o.id === id)).sort((x, y) => x - y);
    const correct = selected.length === correctIds.length && selected.every((id, i) => id === correctIds[i]);
    total += q.weight;
    if (correct) earned += q.weight;
    return { question_id: q.id, selected, correct, correct_options: correctIds, explanation: q.explanation };
  });

  const score = total ? Math.round((earned / total) * 1000) / 10 : 0;
  const passed = score >= a.min_grade;
  const isRecovery = state.nextIsRecovery;
  const { id } = run(
    'INSERT INTO attempts (assessment_id, user_id, score, passed, is_recovery, answers) VALUES (?, ?, ?, ?, ?, ?)',
    a.id,
    userId,
    score,
    passed,
    isRecovery,
    JSON.stringify(answers),
  );

  let points = false;
  if (a.kind === 'exercise') points = awardPoints(userId, 'points_exercise', 'exercise', a.id);
  else if (passed) points = awardPoints(userId, 'points_quiz_pass', 'quiz_pass', a.id);

  if (a.kind === 'quiz' && !passed) {
    notify(
      userId,
      'assessment',
      `Nota ${score} em "${a.title}"`,
      a.allow_recovery ? `A nota mínima é ${a.min_grade}. Revise o conteúdo e faça a recuperação.` : `A nota mínima era ${a.min_grade}.`,
      `/avaliacoes/${a.id}`,
    );
  }

  const enrollment = courseId ? recalcEnrollment(userId, courseId) : null;
  checkBadges(userId);
  audit(req, 'assessment.attempt', 'assessment', a.id, { score, passed, isRecovery });
  broadcastAdmins('activity', { type: 'attempt' });

  // Em questionários reprovados não revelamos o gabarito (para a recuperação ter valor).
  const reveal = a.kind === 'exercise' || passed;
  res.status(201).json({
    attempt: { id, score, passed, is_recovery: isRecovery, min_grade: a.min_grade },
    pointsAwarded: points,
    results: results.map((r) => (reveal ? r : { question_id: r.question_id, selected: r.selected, correct: r.correct })),
    enrollment,
    state: attemptState(userId, a),
  });
});
