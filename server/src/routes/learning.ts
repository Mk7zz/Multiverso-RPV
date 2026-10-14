import { Router, type Request } from 'express';
import { z } from 'zod';
import { all, get, now, run } from '../db';
import { audit } from '../lib/audit';
import { badRequest, forbidden, idParam, notFound, parse } from '../lib/http';
import { awardPoints, checkBadges, recordStudy } from '../lib/gamification';
import {
  bestScore,
  certificateStatus,
  courseAssessments,
  getCourse,
  issueCertificate,
  recalcEnrollment,
  tryAutoIssueCertificate,
  type AssessmentRow,
} from '../lib/progress';
import { broadcastAdmins } from '../lib/realtime';
import { isAdmin, requireAuth } from '../middleware/auth';

export const learningRouter = Router();
learningRouter.use(requireAuth);

function enrollment(userId: number, courseId: number) {
  return get<{ id: number; status: string; progress: number; final_grade: number | null; enrolled_at: string; completed_at: string | null }>(
    'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?',
    userId,
    courseId,
  );
}

function requireEnrollment(req: Request, courseId: number) {
  const e = enrollment(req.user!.id, courseId);
  if (!e && !isAdmin(req)) throw forbidden('Inscreva-se no curso para acessar este conteúdo.');
  return e;
}

function lessonWithCourse(lessonId: number) {
  return get<{ id: number; module_id: number; course_id: number; title: string }>(
    'SELECT l.*, m.course_id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE l.id = ?',
    lessonId,
  );
}

function assessmentSummary(userId: number, a: AssessmentRow) {
  const s = bestScore(userId, a.id);
  return {
    id: a.id,
    title: a.title,
    kind: a.kind,
    scope_type: a.scope_type,
    scope_id: a.scope_id,
    min_grade: a.min_grade,
    best_score: s.best,
    passed: s.passed === 1,
    attempts: s.attempts,
  };
}

learningRouter.post('/courses/:id/enroll', (req, res) => {
  const course = getCourse(idParam(req));
  if (!course || !course.published) throw notFound('Curso não encontrado');
  // MVP: apenas cursos abertos e fixos (inscrição livre e sem prazo).
  const { changes } = run('INSERT OR IGNORE INTO enrollments (user_id, course_id, last_access_at) VALUES (?, ?, ?)', req.user!.id, course.id, now());
  if (changes) {
    audit(req, 'course.enroll', 'course', course.id);
    broadcastAdmins('activity', { type: 'enroll' });
  }
  res.status(changes ? 201 : 200).json({ enrollment: enrollment(req.user!.id, course.id), slug: course.slug });
});

/** Histórico de cursos do aluno (em andamento e concluídos). */
learningRouter.get('/my-courses', (req, res) => {
  const userId = req.user!.id;
  const rows = all<Record<string, any>>(
    `SELECT e.course_id, e.status, e.progress, e.final_grade, e.enrolled_at, e.completed_at, e.last_access_at,
            c.title, c.slug, c.summary, c.cover_url, c.workload_hours, c.has_certificate,
            (SELECT code FROM certificates ct WHERE ct.user_id = e.user_id AND ct.course_id = e.course_id) certificate_code,
            (SELECT COALESCE(SUM(seconds),0) FROM study_time s WHERE s.user_id = e.user_id AND s.course_id = e.course_id) study_seconds
     FROM enrollments e JOIN courses c ON c.id = e.course_id
     WHERE e.user_id = ? ORDER BY COALESCE(e.last_access_at, e.enrolled_at) DESC`,
    userId,
  );
  // Próxima aula a assistir em cada curso (botão "Continuar").
  const withNext = rows.map((r) => {
    const next = get<{ id: number }>(
      `SELECT l.id FROM lessons l JOIN modules m ON m.id = l.module_id
       WHERE m.course_id = ? AND l.id NOT IN (SELECT lesson_id FROM lesson_progress WHERE user_id = ?)
       ORDER BY m.position, m.id, l.position, l.id LIMIT 1`,
      r.course_id,
      userId,
    );
    return { ...r, next_lesson_id: next?.id ?? null };
  });
  res.json({ courses: withNext });
});

/** Visão completa do curso para quem está estudando. */
learningRouter.get('/courses/:slug', (req, res) => {
  const course = get<Record<string, any>>('SELECT * FROM courses WHERE slug = ?', req.params.slug);
  if (!course || (!course.published && !isAdmin(req))) throw notFound('Curso não encontrado');
  const userId = req.user!.id;
  const enr = requireEnrollment(req, course.id);

  const done = new Set(
    all<{ lesson_id: number }>(
      `SELECT lp.lesson_id FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id JOIN modules m ON m.id = l.module_id
       WHERE lp.user_id = ? AND m.course_id = ?`,
      userId,
      course.id,
    ).map((r) => r.lesson_id),
  );
  const modules = all<{ id: number; title: string; description: string | null }>(
    'SELECT id, title, description FROM modules WHERE course_id = ? ORDER BY position, id',
    course.id,
  );
  const lessons = all<{ id: number; module_id: number; title: string; duration_minutes: number }>(
    `SELECT l.id, l.module_id, l.title, l.duration_minutes FROM lessons l JOIN modules m ON m.id = l.module_id
     WHERE m.course_id = ? ORDER BY l.position, l.id`,
    course.id,
  );
  const assessments = [...courseAssessments(course.id, 'quiz'), ...courseAssessments(course.id, 'exercise')].map((a) =>
    assessmentSummary(userId, a),
  );

  res.json({
    course,
    enrollment: enr ?? null,
    modules: modules.map((m) => ({
      ...m,
      lessons: lessons.filter((l) => l.module_id === m.id).map((l) => ({ ...l, completed: done.has(l.id) })),
      assessments: assessments.filter((a) => a.scope_type === 'module' && a.scope_id === m.id),
    })),
    assessments,
    certificate: certificateStatus(userId, course.id),
    feedback: get('SELECT rating, content_rating, recommend, comment, created_at FROM feedback WHERE user_id = ? AND course_id = ?', userId, course.id) ?? null,
  });
});

learningRouter.get('/lessons/:id', (req, res) => {
  const lesson = lessonWithCourse(idParam(req));
  if (!lesson) throw notFound('Aula não encontrada');
  requireEnrollment(req, lesson.course_id);
  const userId = req.user!.id;
  const course = get<{ id: number; slug: string; title: string }>('SELECT id, slug, title FROM courses WHERE id = ?', lesson.course_id)!;
  const ordered = all<{ id: number }>(
    'SELECT l.id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = ? ORDER BY m.position, m.id, l.position, l.id',
    lesson.course_id,
  ).map((r) => r.id);
  const idx = ordered.indexOf(lesson.id);
  const assessments = all<AssessmentRow>(
    `SELECT * FROM assessments a WHERE a.scope_type = 'lesson' AND a.scope_id = ? AND a.published = 1
       AND EXISTS (SELECT 1 FROM assessment_questions aq WHERE aq.assessment_id = a.id) ORDER BY position, id`,
    lesson.id,
  ).map((a) => assessmentSummary(userId, a));

  res.json({
    lesson,
    module: get('SELECT id, title FROM modules WHERE id = ?', lesson.module_id),
    course,
    materials: all('SELECT id, title, url, file_name, size FROM materials WHERE lesson_id = ? ORDER BY id', lesson.id),
    assessments,
    completed: !!get('SELECT 1 FROM lesson_progress WHERE user_id = ? AND lesson_id = ?', userId, lesson.id),
    prev_lesson_id: idx > 0 ? ordered[idx - 1] : null,
    next_lesson_id: idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null,
    position: idx + 1,
    total: ordered.length,
  });
});

/** Pulso enviado pelo player enquanto o aluno está na aula (tempo de estudo). */
learningRouter.post('/lessons/:id/heartbeat', (req, res) => {
  const { seconds } = parse(z.object({ seconds: z.number().int().min(1).max(120) }), req.body);
  const lesson = lessonWithCourse(idParam(req));
  if (!lesson) throw notFound('Aula não encontrada');
  if (!enrollment(req.user!.id, lesson.course_id)) return res.json({ ok: false });
  recordStudy(req.user!.id, lesson.course_id, seconds);
  res.json({ ok: true });
});

learningRouter.post('/lessons/:id/complete', (req, res) => {
  const lesson = lessonWithCourse(idParam(req));
  if (!lesson) throw notFound('Aula não encontrada');
  const userId = req.user!.id;
  if (!enrollment(userId, lesson.course_id)) throw forbidden('Inscreva-se no curso para registrar progresso.');
  const { changes } = run('INSERT OR IGNORE INTO lesson_progress (user_id, lesson_id, completed_at) VALUES (?, ?, ?)', userId, lesson.id, now());
  recordStudy(userId, lesson.course_id, 0);
  let pointsAwarded = false;
  if (changes) {
    pointsAwarded = awardPoints(userId, 'points_lesson', 'lesson', lesson.id);
    broadcastAdmins('activity', { type: 'lesson' });
  }
  const result = recalcEnrollment(userId, lesson.course_id);
  checkBadges(userId);
  res.json({ ok: true, pointsAwarded, enrollment: result });
});

learningRouter.get('/courses/:id/certificate-status', (req, res) => {
  const course = getCourse(idParam(req));
  if (!course) throw notFound('Curso não encontrado');
  res.json(certificateStatus(req.user!.id, course.id));
});

/** Formulário de feedback — pré-requisito para emissão do certificado (quando configurado). */
learningRouter.post('/courses/:id/feedback', (req, res) => {
  const course = getCourse(idParam(req));
  if (!course) throw notFound('Curso não encontrado');
  const userId = req.user!.id;
  const body = parse(
    z.object({
      rating: z.number().int().min(1).max(5),
      content_rating: z.number().int().min(1).max(5).optional(),
      recommend: z.number().int().min(0).max(10).optional(),
      comment: z.string().trim().max(2000).optional(),
    }),
    req.body,
  );
  const status = certificateStatus(userId, course.id);
  if (!status.enrolled) throw forbidden('Inscreva-se no curso primeiro.');
  if (status.feedbackGiven) throw badRequest('Você já respondeu ao feedback deste curso.');
  run(
    'INSERT INTO feedback (user_id, course_id, rating, content_rating, recommend, comment) VALUES (?, ?, ?, ?, ?, ?)',
    userId,
    course.id,
    body.rating,
    body.content_rating ?? null,
    body.recommend ?? null,
    body.comment || null,
  );
  audit(req, 'course.feedback', 'course', course.id, { rating: body.rating });
  checkBadges(userId);
  const certificate = tryAutoIssueCertificate(userId, course.id);
  res.status(201).json({ ok: true, certificate: certificate ?? null, status: certificateStatus(userId, course.id) });
});

learningRouter.post('/courses/:id/certificate', (req, res) => {
  const course = getCourse(idParam(req));
  if (!course) throw notFound('Curso não encontrado');
  const status = certificateStatus(req.user!.id, course.id);
  if (!status.hasCertificate) throw badRequest('Este curso não emite certificado.');
  if (!status.eligible) throw badRequest('Você ainda não cumpriu todos os critérios para o certificado.');
  res.json({ certificate: issueCertificate(req.user!.id, course.id) });
});
