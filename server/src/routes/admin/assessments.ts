import { Router } from 'express';
import { z } from 'zod';
import { all, get, now, run, tx } from '../../db';
import { audit } from '../../lib/audit';
import { badRequest, idParam, notFound, pagination, parse } from '../../lib/http';
import { assessmentCourseId, recalcEnrollment } from '../../lib/progress';

// Banco de questões (fechadas) e avaliações por aula/módulo/curso/trilha.
export const adminAssessmentsRouter = Router();

// ---- Banco de questões ------------------------------------------------------------
const questionSchema = z
  .object({
    statement: z.string().trim().min(5).max(5000),
    explanation: z.string().trim().max(5000).nullable().optional(),
    type: z.enum(['single', 'multiple']).default('single'),
    tags: z.string().trim().max(200).nullable().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
    course_id: z.number().int().positive().nullable().optional(),
    options: z.array(z.object({ text: z.string().trim().min(1).max(1000), is_correct: z.boolean() })).min(2).max(8),
  })
  .refine((q) => q.options.some((o) => o.is_correct), { message: 'Marque ao menos uma alternativa correta', path: ['options'] })
  .refine((q) => q.type === 'multiple' || q.options.filter((o) => o.is_correct).length === 1, {
    message: 'Questões de escolha única devem ter exatamente uma alternativa correta',
    path: ['options'],
  });

function questionWithOptions(id: number) {
  const q = get('SELECT q.*, c.title course_title FROM questions q LEFT JOIN courses c ON c.id = q.course_id WHERE q.id = ?', id);
  if (!q) return null;
  return { ...q, options: all('SELECT id, text, is_correct, position FROM question_options WHERE question_id = ? ORDER BY position, id', id) };
}

function saveOptions(questionId: number, options: { text: string; is_correct: boolean }[]) {
  run('DELETE FROM question_options WHERE question_id = ?', questionId);
  options.forEach((o, i) => run('INSERT INTO question_options (question_id, text, is_correct, position) VALUES (?, ?, ?, ?)', questionId, o.text, o.is_correct, i + 1));
}

adminAssessmentsRouter.get('/questions', (req, res) => {
  const { page, pageSize, offset } = pagination(req, 30);
  const where = ['1 = 1'];
  const params: (string | number)[] = [];
  const q = String(req.query.q ?? '').trim();
  if (q) {
    where.push('(q.statement LIKE ? OR q.tags LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (Number(req.query.course)) {
    where.push('q.course_id = ?');
    params.push(Number(req.query.course));
  }
  const total = Number(get<{ n: number }>(`SELECT COUNT(*) n FROM questions q WHERE ${where.join(' AND ')}`, ...params)!.n);
  const rows = all<{ id: number }>(
    `SELECT q.id FROM questions q WHERE ${where.join(' AND ')} ORDER BY q.id DESC LIMIT ? OFFSET ?`,
    ...params,
    pageSize,
    offset,
  );
  res.json({ questions: rows.map((r) => questionWithOptions(r.id)), total, page, pageSize });
});

adminAssessmentsRouter.post('/questions', (req, res) => {
  const b = parse(questionSchema, req.body);
  const id = tx(() => {
    const { id } = run(
      'INSERT INTO questions (statement, explanation, type, tags, difficulty, course_id) VALUES (?, ?, ?, ?, ?, ?)',
      b.statement,
      b.explanation,
      b.type,
      b.tags,
      b.difficulty,
      b.course_id ?? null,
    );
    saveOptions(id, b.options);
    return id;
  });
  audit(req, 'question.create', 'question', id);
  res.status(201).json({ question: questionWithOptions(id) });
});

adminAssessmentsRouter.put('/questions/:id', (req, res) => {
  const id = idParam(req);
  const b = parse(questionSchema, req.body);
  tx(() => {
    const { changes } = run(
      'UPDATE questions SET statement = ?, explanation = ?, type = ?, tags = ?, difficulty = ?, course_id = ?, updated_at = ? WHERE id = ?',
      b.statement,
      b.explanation,
      b.type,
      b.tags,
      b.difficulty,
      b.course_id ?? null,
      now(),
      id,
    );
    if (!changes) throw notFound();
    saveOptions(id, b.options);
  });
  audit(req, 'question.update', 'question', id);
  res.json({ question: questionWithOptions(id) });
});

adminAssessmentsRouter.delete('/questions/:id', (req, res) => {
  const id = idParam(req);
  const used = all<{ title: string }>(
    'SELECT a.title FROM assessment_questions aq JOIN assessments a ON a.id = aq.assessment_id WHERE aq.question_id = ?',
    id,
  );
  if (used.length) throw badRequest(`Questão em uso nas avaliações: ${used.map((u) => u.title).join(', ')}`);
  run('DELETE FROM questions WHERE id = ?', id);
  audit(req, 'question.delete', 'question', id);
  res.json({ ok: true });
});

// ---- Avaliações -------------------------------------------------------------------
const assessmentSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  kind: z.enum(['quiz', 'exercise']),
  scope_type: z.enum(['lesson', 'module', 'course', 'trail']),
  scope_id: z.number().int().positive(),
  min_grade: z.number().min(0).max(100).default(70),
  allow_recovery: z.boolean().default(true),
  shuffle_questions: z.boolean().default(false),
  published: z.boolean().default(true),
  position: z.number().int().default(0),
  question_ids: z.array(z.number().int().positive()).default([]),
});

const SCOPE_TABLE = { lesson: 'lessons', module: 'modules', course: 'courses', trail: 'trails' } as const;

function scopeLabel(scopeType: keyof typeof SCOPE_TABLE, scopeId: number) {
  return get<{ title: string }>(`SELECT title FROM ${SCOPE_TABLE[scopeType]} WHERE id = ?`, scopeId)?.title ?? '(removido)';
}

function assessmentDetail(id: number) {
  const a = get<{ id: number; scope_type: keyof typeof SCOPE_TABLE; scope_id: number }>('SELECT * FROM assessments WHERE id = ?', id);
  if (!a) return null;
  const courseId = assessmentCourseId(a);
  return {
    ...a,
    scope_title: scopeLabel(a.scope_type, a.scope_id),
    course_id: courseId,
    course_title: courseId ? get<{ title: string }>('SELECT title FROM courses WHERE id = ?', courseId)?.title : null,
    question_ids: all<{ question_id: number }>('SELECT question_id FROM assessment_questions WHERE assessment_id = ? ORDER BY position', id).map(
      (r) => r.question_id,
    ),
    stats: get(
      'SELECT COUNT(*) attempts, COUNT(DISTINCT user_id) students, ROUND(AVG(score), 1) avg_score, SUM(passed) passed FROM attempts WHERE assessment_id = ?',
      id,
    ),
  };
}

function recalcAffected(assessmentId: number) {
  const a = get<{ scope_type: 'lesson' | 'module' | 'course' | 'trail'; scope_id: number }>('SELECT scope_type, scope_id FROM assessments WHERE id = ?', assessmentId);
  const courseId = a ? assessmentCourseId(a) : null;
  if (!courseId) return;
  for (const e of all<{ user_id: number }>('SELECT user_id FROM enrollments WHERE course_id = ?', courseId)) recalcEnrollment(e.user_id, courseId);
}

adminAssessmentsRouter.get('/assessments', (req, res) => {
  const where = ['1 = 1'];
  const params: (string | number)[] = [];
  if (Number(req.query.course)) {
    const c = Number(req.query.course);
    where.push(`((scope_type = 'course' AND scope_id = ?)
      OR (scope_type = 'module' AND scope_id IN (SELECT id FROM modules WHERE course_id = ?))
      OR (scope_type = 'lesson' AND scope_id IN (SELECT l.id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = ?)))`);
    params.push(c, c, c);
  }
  const ids = all<{ id: number }>(`SELECT id FROM assessments WHERE ${where.join(' AND ')} ORDER BY id DESC`, ...params);
  res.json({ assessments: ids.map((r) => assessmentDetail(r.id)) });
});

adminAssessmentsRouter.get('/assessments/:id', (req, res) => {
  const a = assessmentDetail(idParam(req));
  if (!a) throw notFound();
  res.json({ assessment: a });
});

function saveAssessment(id: number | null, b: z.infer<typeof assessmentSchema>) {
  if (!get(`SELECT 1 FROM ${SCOPE_TABLE[b.scope_type]} WHERE id = ?`, b.scope_id)) throw badRequest('O item vinculado à avaliação não existe.');
  return tx(() => {
    let assessmentId = id;
    if (assessmentId === null) {
      assessmentId = run(
        `INSERT INTO assessments (title, description, kind, scope_type, scope_id, min_grade, allow_recovery, shuffle_questions, published, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        b.title,
        b.description,
        b.kind,
        b.scope_type,
        b.scope_id,
        b.min_grade,
        b.allow_recovery,
        b.shuffle_questions,
        b.published,
        b.position,
      ).id;
    } else {
      const { changes } = run(
        `UPDATE assessments SET title = ?, description = ?, kind = ?, scope_type = ?, scope_id = ?, min_grade = ?, allow_recovery = ?,
           shuffle_questions = ?, published = ?, position = ?, updated_at = ? WHERE id = ?`,
        b.title,
        b.description,
        b.kind,
        b.scope_type,
        b.scope_id,
        b.min_grade,
        b.allow_recovery,
        b.shuffle_questions,
        b.published,
        b.position,
        now(),
        assessmentId,
      );
      if (!changes) throw notFound();
    }
    run('DELETE FROM assessment_questions WHERE assessment_id = ?', assessmentId);
    [...new Set(b.question_ids)].forEach((qid, i) =>
      run('INSERT INTO assessment_questions (assessment_id, question_id, position) VALUES (?, ?, ?)', assessmentId, qid, i + 1),
    );
    return assessmentId;
  });
}

adminAssessmentsRouter.post('/assessments', (req, res) => {
  const id = saveAssessment(null, parse(assessmentSchema, req.body));
  recalcAffected(id);
  audit(req, 'assessment.create', 'assessment', id);
  res.status(201).json({ assessment: assessmentDetail(id) });
});

adminAssessmentsRouter.put('/assessments/:id', (req, res) => {
  const id = saveAssessment(idParam(req), parse(assessmentSchema, req.body));
  recalcAffected(id);
  audit(req, 'assessment.update', 'assessment', id);
  res.json({ assessment: assessmentDetail(id) });
});

adminAssessmentsRouter.delete('/assessments/:id', (req, res) => {
  const id = idParam(req);
  const a = get<{ scope_type: 'lesson' | 'module' | 'course' | 'trail'; scope_id: number }>('SELECT scope_type, scope_id FROM assessments WHERE id = ?', id);
  if (!a) throw notFound();
  run('DELETE FROM assessments WHERE id = ?', id);
  const courseId = assessmentCourseId(a);
  if (courseId) for (const e of all<{ user_id: number }>('SELECT user_id FROM enrollments WHERE course_id = ?', courseId)) recalcEnrollment(e.user_id, courseId);
  audit(req, 'assessment.delete', 'assessment', id);
  res.json({ ok: true });
});

/** Opções para vincular avaliações (trilhas, cursos, módulos e aulas). */
adminAssessmentsRouter.get('/scopes', (_req, res) => {
  res.json({
    trails: all('SELECT id, title FROM trails ORDER BY position, id'),
    courses: all('SELECT id, title FROM courses ORDER BY position, id'),
    modules: all('SELECT m.id, m.title, m.course_id, c.title course_title FROM modules m JOIN courses c ON c.id = m.course_id ORDER BY c.position, m.position'),
    lessons: all(
      `SELECT l.id, l.title, m.course_id, m.title module_title FROM lessons l JOIN modules m ON m.id = l.module_id
       JOIN courses c ON c.id = m.course_id ORDER BY c.position, m.position, l.position`,
    ),
  });
});
