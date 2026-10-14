import { all, get, now, run, tx } from '../db';
import { broadcastAdmins } from './realtime';
import { awardPoints, checkBadges } from './gamification';
import { emails } from './mailer';
import { notify } from './notify';
import { certificateCode } from './security';

export interface CourseRow {
  id: number;
  trail_id: number | null;
  title: string;
  slug: string;
  workload_hours: number;
  has_certificate: number;
  cert_min_grade: number;
  cert_min_progress: number;
  require_feedback: number;
  published: number;
}

export interface AssessmentRow {
  id: number;
  title: string;
  description: string | null;
  kind: 'quiz' | 'exercise';
  scope_type: 'lesson' | 'module' | 'course' | 'trail';
  scope_id: number;
  min_grade: number;
  allow_recovery: number;
  shuffle_questions: number;
  published: number;
}

export const getCourse = (id: number) => get<CourseRow>('SELECT * FROM courses WHERE id = ?', id);

export function courseLessonIds(courseId: number): number[] {
  return all<{ id: number }>(
    'SELECT l.id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = ? ORDER BY m.position, l.position, l.id',
    courseId,
  ).map((r) => r.id);
}

/** Avaliações publicadas em qualquer nível do curso (curso, módulos e aulas). */
export function courseAssessments(courseId: number, kind?: 'quiz' | 'exercise'): AssessmentRow[] {
  return all<AssessmentRow>(
    `SELECT a.* FROM assessments a
     WHERE a.published = 1 AND (? IS NULL OR a.kind = ?)
       AND EXISTS (SELECT 1 FROM assessment_questions aq WHERE aq.assessment_id = a.id)
       AND ((a.scope_type = 'course' AND a.scope_id = ?)
         OR (a.scope_type = 'module' AND a.scope_id IN (SELECT id FROM modules WHERE course_id = ?))
         OR (a.scope_type = 'lesson' AND a.scope_id IN (SELECT l.id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = ?)))
     ORDER BY a.position, a.id`,
    kind ?? null,
    kind ?? null,
    courseId,
    courseId,
    courseId,
  );
}

/** Descobre a qual curso uma avaliação pertence (null para avaliações de trilha). */
export function assessmentCourseId(a: Pick<AssessmentRow, 'scope_type' | 'scope_id'>): number | null {
  switch (a.scope_type) {
    case 'course':
      return a.scope_id;
    case 'module':
      return get<{ course_id: number }>('SELECT course_id FROM modules WHERE id = ?', a.scope_id)?.course_id ?? null;
    case 'lesson':
      return (
        get<{ course_id: number }>('SELECT m.course_id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE l.id = ?', a.scope_id)
          ?.course_id ?? null
      );
    default:
      return null;
  }
}

export function bestScore(userId: number, assessmentId: number) {
  return get<{ best: number | null; passed: number | null; attempts: number }>(
    'SELECT MAX(score) best, MAX(passed) passed, COUNT(*) attempts FROM attempts WHERE user_id = ? AND assessment_id = ?',
    userId,
    assessmentId,
  )!;
}

/** Recalcula progresso, nota final e conclusão da matrícula. Dispara conclusão e certificado automático. */
export function recalcEnrollment(userId: number, courseId: number) {
  const enrollment = get<{ id: number; status: string }>('SELECT id, status FROM enrollments WHERE user_id = ? AND course_id = ?', userId, courseId);
  const course = getCourse(courseId);
  if (!enrollment || !course) return null;

  const lessonIds = courseLessonIds(courseId);
  const done = lessonIds.length
    ? Number(
        get<{ n: number }>(
          `SELECT COUNT(*) n FROM lesson_progress WHERE user_id = ? AND lesson_id IN (${lessonIds.map(() => '?').join(',')})`,
          userId,
          ...lessonIds,
        )!.n,
      )
    : 0;
  const progress = lessonIds.length ? Math.round((done / lessonIds.length) * 1000) / 10 : 0;

  const quizzes = courseAssessments(courseId, 'quiz');
  const scores = quizzes.map((q) => bestScore(userId, q.id));
  const allPassed = scores.every((s) => s.passed === 1);
  // Sem nenhuma tentativa ainda, a nota final fica em branco (avaliações não feitas contam 0 depois disso).
  const finalGrade = scores.some((s) => s.attempts > 0) ? Math.round((scores.reduce((sum, s) => sum + (s.best ?? 0), 0) / quizzes.length) * 10) / 10 : null;
  const completed = lessonIds.length > 0 && progress >= 100 && allPassed;
  const newlyCompleted = completed && enrollment.status !== 'completed';

  run(
    `UPDATE enrollments SET progress = ?, final_grade = ?, status = ?, completed_at = CASE WHEN ? THEN ? ELSE completed_at END WHERE id = ?`,
    progress,
    finalGrade,
    completed ? 'completed' : 'in_progress',
    newlyCompleted,
    now(),
    enrollment.id,
  );

  if (newlyCompleted) {
    awardPoints(userId, 'points_course_complete', 'course_complete', courseId);
    notify(userId, 'course_completed', `Você concluiu "${course.title}"!`, 'Responda ao feedback e emita seu certificado.', `/aprender/${course.slug}`);
    const user = get<{ email: string; name: string }>('SELECT email, name FROM users WHERE id = ?', userId);
    if (user) emails.courseCompleted(user.email, user.name, course.title, course.slug);
    broadcastAdmins('activity', { type: 'course_completed' });
  }

  tryAutoIssueCertificate(userId, courseId);
  checkBadges(userId);
  return { progress, finalGrade, completed };
}

export interface Requirement {
  key: string;
  label: string;
  met: boolean;
  detail?: string;
}

export function certificateStatus(userId: number, courseId: number) {
  const course = getCourse(courseId)!;
  const certificate = get('SELECT * FROM certificates WHERE user_id = ? AND course_id = ?', userId, courseId);
  const enrollment = get<{ progress: number; final_grade: number | null }>(
    'SELECT progress, final_grade FROM enrollments WHERE user_id = ? AND course_id = ?',
    userId,
    courseId,
  );
  const feedback = get('SELECT id FROM feedback WHERE user_id = ? AND course_id = ?', userId, courseId);
  const quizzes = courseAssessments(courseId, 'quiz');
  const pendingQuizzes = quizzes.filter((q) => bestScore(userId, q.id).passed !== 1);

  const requirements: Requirement[] = [];
  const progress = enrollment?.progress ?? 0;
  requirements.push({
    key: 'progress',
    label: `Concluir pelo menos ${course.cert_min_progress}% das aulas`,
    met: progress >= course.cert_min_progress,
    detail: `${progress}% concluído`,
  });
  if (quizzes.length) {
    requirements.push({
      key: 'quizzes',
      label: 'Ser aprovado(a) em todas as avaliações do curso',
      met: pendingQuizzes.length === 0,
      detail: pendingQuizzes.length ? `Pendentes: ${pendingQuizzes.map((q) => q.title).join(', ')}` : 'Todas aprovadas',
    });
    requirements.push({
      key: 'grade',
      label: `Nota final mínima de ${course.cert_min_grade}`,
      met: (enrollment?.final_grade ?? 0) >= course.cert_min_grade,
      detail: enrollment?.final_grade != null ? `Nota atual: ${enrollment.final_grade}` : 'Sem nota ainda',
    });
  }
  const academicOk = requirements.every((r) => r.met);
  if (course.require_feedback) {
    requirements.push({ key: 'feedback', label: 'Responder ao formulário de feedback do curso', met: !!feedback });
  }

  return {
    hasCertificate: !!course.has_certificate,
    enrolled: !!enrollment,
    eligible: !!course.has_certificate && !!enrollment && requirements.every((r) => r.met),
    canGiveFeedback: !!enrollment && academicOk && !feedback,
    feedbackGiven: !!feedback,
    requirements,
    certificate: certificate ?? null,
  };
}

export function tryAutoIssueCertificate(userId: number, courseId: number) {
  const status = certificateStatus(userId, courseId);
  if (!status.eligible || status.certificate) return status.certificate;
  return issueCertificate(userId, courseId);
}

export function issueCertificate(userId: number, courseId: number) {
  const course = getCourse(courseId)!;
  const user = get<{ name: string; email: string }>('SELECT name, email FROM users WHERE id = ?', userId)!;
  const enrollment = get<{ final_grade: number | null }>('SELECT final_grade FROM enrollments WHERE user_id = ? AND course_id = ?', userId, courseId);

  const cert = tx(() => {
    const existing = get('SELECT * FROM certificates WHERE user_id = ? AND course_id = ?', userId, courseId);
    if (existing) return { cert: existing, created: false };
    let code = certificateCode();
    while (get('SELECT id FROM certificates WHERE code = ?', code)) code = certificateCode();
    const { id } = run(
      `INSERT INTO certificates (code, user_id, course_id, student_name, course_title, workload_hours, final_grade, issued_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      code,
      userId,
      courseId,
      user.name,
      course.title,
      course.workload_hours,
      enrollment?.final_grade ?? null,
      now(),
    );
    return { cert: get('SELECT * FROM certificates WHERE id = ?', id)!, created: true };
  });

  if (cert.created) {
    notify(userId, 'certificate', `Certificado emitido: ${course.title}`, `Código ${cert.cert.code}`, '/certificados');
    emails.certificateIssued(user.email, user.name, course.title, cert.cert.code);
    checkBadges(userId);
    broadcastAdmins('activity', { type: 'certificate' });
  }
  return cert.cert;
}
