import { Router } from 'express';
import { z } from 'zod';
import { all, get, now, run, tx } from '../../db';
import { audit } from '../../lib/audit';
import { badRequest, idParam, notFound, parse } from '../../lib/http';
import { recalcEnrollment } from '../../lib/progress';
import { uniqueSlug } from '../../lib/slug';
import { publicUrl, removeUpload, uploader, type UploadKind } from '../../lib/uploads';

// Gestão de conteúdo: Trilha -> Curso -> Módulo -> Aula, uploads de vídeo e materiais.
export const adminContentRouter = Router();

const optionalText = z.string().trim().max(20_000).nullable().optional();

// ---- Uploads ----------------------------------------------------------------------
for (const kind of ['video', 'material', 'image'] as UploadKind[]) {
  adminContentRouter.post(`/uploads/${kind}`, uploader(kind).single('file'), (req, res) => {
    if (!req.file) throw badRequest('Nenhum arquivo enviado.');
    audit(req, 'upload', kind, null, { name: req.file.originalname, size: req.file.size });
    res.status(201).json({ url: publicUrl(kind, req.file.filename), file_name: req.file.originalname, size: req.file.size });
  });
}

// ---- Trilhas ----------------------------------------------------------------------
const trailSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: optionalText,
  cover_url: z.string().max(500).nullable().optional(),
  published: z.boolean().default(false),
  position: z.number().int().default(0),
});

adminContentRouter.get('/trails', (_req, res) => {
  res.json({
    trails: all(
      `SELECT t.*, (SELECT COUNT(*) FROM courses c WHERE c.trail_id = t.id) courses_count FROM trails t ORDER BY t.position, t.id`,
    ),
  });
});

adminContentRouter.post('/trails', (req, res) => {
  const b = parse(trailSchema, req.body);
  const { id } = run(
    'INSERT INTO trails (title, slug, description, cover_url, published, position) VALUES (?, ?, ?, ?, ?, ?)',
    b.title,
    uniqueSlug('trails', b.title),
    b.description,
    b.cover_url,
    b.published,
    b.position,
  );
  audit(req, 'trail.create', 'trail', id, { title: b.title });
  res.status(201).json({ trail: get('SELECT * FROM trails WHERE id = ?', id) });
});

adminContentRouter.put('/trails/:id', (req, res) => {
  const id = idParam(req);
  const b = parse(trailSchema, req.body);
  const { changes } = run(
    'UPDATE trails SET title = ?, slug = ?, description = ?, cover_url = ?, published = ?, position = ?, updated_at = ? WHERE id = ?',
    b.title,
    uniqueSlug('trails', b.title, id),
    b.description,
    b.cover_url,
    b.published,
    b.position,
    now(),
    id,
  );
  if (!changes) throw notFound();
  audit(req, 'trail.update', 'trail', id);
  res.json({ trail: get('SELECT * FROM trails WHERE id = ?', id) });
});

adminContentRouter.delete('/trails/:id', (req, res) => {
  const id = idParam(req);
  run("DELETE FROM assessments WHERE scope_type = 'trail' AND scope_id = ?", id);
  run('DELETE FROM trails WHERE id = ?', id);
  audit(req, 'trail.delete', 'trail', id);
  res.json({ ok: true });
});

// ---- Cursos -----------------------------------------------------------------------
const courseSchema = z.object({
  title: z.string().trim().min(3).max(160),
  trail_id: z.number().int().positive().nullable().optional(),
  summary: z.string().trim().max(400).nullable().optional(),
  description: optionalText,
  cover_url: z.string().max(500).nullable().optional(),
  workload_hours: z.number().min(0).max(1000).default(0),
  level: z.string().max(40).nullable().optional(),
  has_certificate: z.boolean().default(true),
  cert_min_grade: z.number().min(0).max(100).default(70),
  cert_min_progress: z.number().min(0).max(100).default(100),
  require_feedback: z.boolean().default(true),
  published: z.boolean().default(false),
  position: z.number().int().default(0),
});

adminContentRouter.get('/courses', (_req, res) => {
  res.json({
    courses: all(
      `SELECT c.*, t.title trail_title,
         (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) modules_count,
         (SELECT COUNT(*) FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = c.id) lessons_count,
         (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) students
       FROM courses c LEFT JOIN trails t ON t.id = c.trail_id ORDER BY c.position, c.id`,
    ),
  });
});

/** Árvore completa do curso para o editor (módulos, aulas, materiais e avaliações). */
adminContentRouter.get('/courses/:id', (req, res) => {
  const id = idParam(req);
  const course = get('SELECT * FROM courses WHERE id = ?', id);
  if (!course) throw notFound('Curso não encontrado');
  const modules = all<{ id: number }>('SELECT * FROM modules WHERE course_id = ? ORDER BY position, id', id);
  const lessons = all<{ id: number; module_id: number }>(
    'SELECT l.* FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = ? ORDER BY l.position, l.id',
    id,
  );
  const materials = all<{ lesson_id: number }>(
    'SELECT mt.* FROM materials mt JOIN lessons l ON l.id = mt.lesson_id JOIN modules m ON m.id = l.module_id WHERE m.course_id = ?',
    id,
  );
  res.json({
    course,
    modules: modules.map((m) => ({
      ...m,
      lessons: lessons.filter((l) => l.module_id === m.id).map((l) => ({ ...l, materials: materials.filter((mt) => mt.lesson_id === l.id) })),
    })),
  });
});

adminContentRouter.post('/courses', (req, res) => {
  const b = parse(courseSchema, req.body);
  const { id } = run(
    `INSERT INTO courses (title, slug, trail_id, summary, description, cover_url, workload_hours, level, has_certificate,
       cert_min_grade, cert_min_progress, require_feedback, published, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    b.title,
    uniqueSlug('courses', b.title),
    b.trail_id ?? null,
    b.summary,
    b.description,
    b.cover_url,
    b.workload_hours,
    b.level,
    b.has_certificate,
    b.cert_min_grade,
    b.cert_min_progress,
    b.require_feedback,
    b.published,
    b.position,
  );
  audit(req, 'course.create', 'course', id, { title: b.title });
  res.status(201).json({ course: get('SELECT * FROM courses WHERE id = ?', id) });
});

adminContentRouter.put('/courses/:id', (req, res) => {
  const id = idParam(req);
  const b = parse(courseSchema, req.body);
  const { changes } = run(
    `UPDATE courses SET title = ?, slug = ?, trail_id = ?, summary = ?, description = ?, cover_url = ?, workload_hours = ?, level = ?,
       has_certificate = ?, cert_min_grade = ?, cert_min_progress = ?, require_feedback = ?, published = ?, position = ?, updated_at = ?
     WHERE id = ?`,
    b.title,
    uniqueSlug('courses', b.title, id),
    b.trail_id ?? null,
    b.summary,
    b.description,
    b.cover_url,
    b.workload_hours,
    b.level,
    b.has_certificate,
    b.cert_min_grade,
    b.cert_min_progress,
    b.require_feedback,
    b.published,
    b.position,
    now(),
    id,
  );
  if (!changes) throw notFound();
  audit(req, 'course.update', 'course', id);
  res.json({ course: get('SELECT * FROM courses WHERE id = ?', id) });
});

adminContentRouter.delete('/courses/:id', (req, res) => {
  const id = idParam(req);
  const students = Number(get<{ n: number }>('SELECT COUNT(*) n FROM enrollments WHERE course_id = ?', id)!.n);
  if (students && req.query.force !== '1') {
    throw badRequest(`O curso tem ${students} aluno(s) matriculado(s). Despublique-o ou confirme a exclusão definitiva.`);
  }
  tx(() => {
    run("DELETE FROM assessments WHERE scope_type = 'course' AND scope_id = ?", id);
    run("DELETE FROM assessments WHERE scope_type = 'module' AND scope_id IN (SELECT id FROM modules WHERE course_id = ?)", id);
    run(
      "DELETE FROM assessments WHERE scope_type = 'lesson' AND scope_id IN (SELECT l.id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = ?)",
      id,
    );
    run('DELETE FROM courses WHERE id = ?', id);
  });
  audit(req, 'course.delete', 'course', id);
  res.json({ ok: true });
});

// ---- Módulos ----------------------------------------------------------------------
const moduleSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: optionalText,
  position: z.number().int().optional(),
});

adminContentRouter.post('/courses/:id/modules', (req, res) => {
  const courseId = idParam(req);
  if (!get('SELECT 1 FROM courses WHERE id = ?', courseId)) throw notFound('Curso não encontrado');
  const b = parse(moduleSchema, req.body);
  const position = b.position ?? Number(get<{ n: number }>('SELECT COALESCE(MAX(position), 0) + 1 n FROM modules WHERE course_id = ?', courseId)!.n);
  const { id } = run('INSERT INTO modules (course_id, title, description, position) VALUES (?, ?, ?, ?)', courseId, b.title, b.description, position);
  audit(req, 'module.create', 'module', id);
  res.status(201).json({ module: get('SELECT * FROM modules WHERE id = ?', id) });
});

adminContentRouter.put('/modules/:id', (req, res) => {
  const id = idParam(req);
  const b = parse(moduleSchema, req.body);
  run('UPDATE modules SET title = ?, description = ?, position = COALESCE(?, position) WHERE id = ?', b.title, b.description, b.position, id);
  audit(req, 'module.update', 'module', id);
  res.json({ module: get('SELECT * FROM modules WHERE id = ?', id) });
});

adminContentRouter.delete('/modules/:id', (req, res) => {
  const id = idParam(req);
  const courseId = get<{ course_id: number }>('SELECT course_id FROM modules WHERE id = ?', id)?.course_id;
  tx(() => {
    run("DELETE FROM assessments WHERE scope_type = 'module' AND scope_id = ?", id);
    run("DELETE FROM assessments WHERE scope_type = 'lesson' AND scope_id IN (SELECT id FROM lessons WHERE module_id = ?)", id);
    run('DELETE FROM modules WHERE id = ?', id);
  });
  if (courseId) recalcCourse(courseId);
  audit(req, 'module.delete', 'module', id);
  res.json({ ok: true });
});

/** Reordena módulos ou aulas: recebe a lista de ids na nova ordem. */
adminContentRouter.post('/reorder', (req, res) => {
  const b = parse(z.object({ type: z.enum(['modules', 'lessons']), ids: z.array(z.number().int()) }), req.body);
  tx(() => b.ids.forEach((id, i) => run(`UPDATE ${b.type} SET position = ? WHERE id = ?`, i + 1, id)));
  res.json({ ok: true });
});

// ---- Aulas ------------------------------------------------------------------------
const lessonSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  content: optionalText,
  video_url: z.string().trim().max(1000).nullable().optional(),
  duration_minutes: z.number().int().min(0).max(1000).default(0),
  position: z.number().int().optional(),
});

function recalcCourse(courseId: number) {
  for (const e of all<{ user_id: number }>('SELECT user_id FROM enrollments WHERE course_id = ?', courseId)) recalcEnrollment(e.user_id, courseId);
}

adminContentRouter.post('/modules/:id/lessons', (req, res) => {
  const moduleId = idParam(req);
  const mod = get<{ course_id: number }>('SELECT course_id FROM modules WHERE id = ?', moduleId);
  if (!mod) throw notFound('Módulo não encontrado');
  const b = parse(lessonSchema, req.body);
  const position = b.position ?? Number(get<{ n: number }>('SELECT COALESCE(MAX(position), 0) + 1 n FROM lessons WHERE module_id = ?', moduleId)!.n);
  const { id } = run(
    'INSERT INTO lessons (module_id, title, description, content, video_url, duration_minutes, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
    moduleId,
    b.title,
    b.description,
    b.content,
    b.video_url,
    b.duration_minutes,
    position,
  );
  recalcCourse(mod.course_id);
  audit(req, 'lesson.create', 'lesson', id);
  res.status(201).json({ lesson: get('SELECT * FROM lessons WHERE id = ?', id) });
});

adminContentRouter.put('/lessons/:id', (req, res) => {
  const id = idParam(req);
  const old = get<{ video_url: string | null }>('SELECT video_url FROM lessons WHERE id = ?', id);
  if (!old) throw notFound('Aula não encontrada');
  const b = parse(lessonSchema, req.body);
  run(
    'UPDATE lessons SET title = ?, description = ?, content = ?, video_url = ?, duration_minutes = ?, position = COALESCE(?, position) WHERE id = ?',
    b.title,
    b.description,
    b.content,
    b.video_url,
    b.duration_minutes,
    b.position,
    id,
  );
  if (old.video_url !== b.video_url) removeUpload(old.video_url);
  audit(req, 'lesson.update', 'lesson', id);
  res.json({ lesson: get('SELECT * FROM lessons WHERE id = ?', id) });
});

adminContentRouter.delete('/lessons/:id', (req, res) => {
  const id = idParam(req);
  const lesson = get<{ video_url: string | null; course_id: number }>(
    'SELECT l.video_url, m.course_id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE l.id = ?',
    id,
  );
  if (!lesson) throw notFound('Aula não encontrada');
  const files = all<{ url: string }>('SELECT url FROM materials WHERE lesson_id = ?', id);
  tx(() => {
    run("DELETE FROM assessments WHERE scope_type = 'lesson' AND scope_id = ?", id);
    run('DELETE FROM lessons WHERE id = ?', id);
  });
  removeUpload(lesson.video_url);
  files.forEach((f) => removeUpload(f.url));
  recalcCourse(lesson.course_id);
  audit(req, 'lesson.delete', 'lesson', id);
  res.json({ ok: true });
});

// ---- Materiais complementares -----------------------------------------------------
adminContentRouter.post('/lessons/:id/materials', (req, res) => {
  const lessonId = idParam(req);
  const b = parse(
    z.object({ title: z.string().trim().min(1).max(200), url: z.string().min(1).max(1000), file_name: z.string().max(255).optional(), size: z.number().optional() }),
    req.body,
  );
  const { id } = run('INSERT INTO materials (lesson_id, title, url, file_name, size) VALUES (?, ?, ?, ?, ?)', lessonId, b.title, b.url, b.file_name, b.size);
  audit(req, 'material.create', 'material', id);
  res.status(201).json({ material: get('SELECT * FROM materials WHERE id = ?', id) });
});

adminContentRouter.delete('/materials/:id', (req, res) => {
  const id = idParam(req);
  const m = get<{ url: string }>('SELECT url FROM materials WHERE id = ?', id);
  if (!m) throw notFound();
  run('DELETE FROM materials WHERE id = ?', id);
  removeUpload(m.url);
  audit(req, 'material.delete', 'material', id);
  res.json({ ok: true });
});
