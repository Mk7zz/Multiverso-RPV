import { Router } from 'express';
import { z } from 'zod';
import { all, get } from '../../db';
import { getMetrics } from '../../lib/analytics';
import { audit } from '../../lib/audit';
import { toCsv } from '../../lib/csv';
import { notFound, pagination, parse } from '../../lib/http';
import { openAdminStream } from '../../lib/realtime';
import { getSettings, saveSettings, SETTING_DEFAULTS, type SettingKey } from '../../lib/settings';

// Analytics, dashboards em tempo real, relatórios exportáveis, certificados, feedback, logs, e-mails e configurações.
export const adminInsightsRouter = Router();

adminInsightsRouter.get('/analytics', (_req, res) => {
  res.json(getMetrics());
});

/** Dashboard em tempo real: envia métricas a cada 10s e logo após cada atividade relevante. */
adminInsightsRouter.get('/analytics/stream', (_req, res) => {
  openAdminStream(res, (push) => {
    push('metrics', getMetrics());
    const timer = setInterval(() => push('metrics', getMetrics()), 10_000);
    res.on('close', () => clearInterval(timer));
  });
});

const REPORTS: Record<string, { title: string; rows: () => Record<string, unknown>[]; columns: { key: string; label: string }[] }> = {
  matriculas: {
    title: 'Matrículas e progresso',
    rows: () =>
      all(`SELECT u.name, u.email, u.municipality, u.school, c.title course, e.status, e.progress, e.final_grade, e.enrolled_at, e.completed_at, e.last_access_at,
             (SELECT COALESCE(SUM(seconds),0) FROM study_time s WHERE s.user_id = e.user_id AND s.course_id = e.course_id) study_seconds
           FROM enrollments e JOIN users u ON u.id = e.user_id JOIN courses c ON c.id = e.course_id ORDER BY c.title, u.name`),
    columns: [
      { key: 'name', label: 'aluno' },
      { key: 'email', label: 'email' },
      { key: 'municipality', label: 'municipio' },
      { key: 'school', label: 'escola' },
      { key: 'course', label: 'curso' },
      { key: 'status', label: 'status' },
      { key: 'progress', label: 'progresso_%' },
      { key: 'final_grade', label: 'nota_final' },
      { key: 'study_seconds', label: 'tempo_estudo_s' },
      { key: 'enrolled_at', label: 'matricula' },
      { key: 'completed_at', label: 'conclusao' },
      { key: 'last_access_at', label: 'ultimo_acesso' },
    ],
  },
  cursos: {
    title: 'Indicadores por curso',
    rows: () => getMetrics().topCourses,
    columns: [
      { key: 'title', label: 'curso' },
      { key: 'enrollments', label: 'matriculas' },
      { key: 'completed', label: 'concluintes' },
      { key: 'completionRate', label: 'taxa_conclusao_%' },
      { key: 'study_seconds', label: 'tempo_estudo_s' },
      { key: 'learners_7d', label: 'alunos_ativos_periodo' },
    ],
  },
  municipios: {
    title: 'Participação por município',
    rows: () => getMetrics().municipalities,
    columns: [
      { key: 'municipality', label: 'municipio' },
      { key: 'students', label: 'alunos' },
      { key: 'completions', label: 'cursos_concluidos' },
    ],
  },
  certificados: {
    title: 'Certificados emitidos',
    rows: () => all('SELECT code, student_name, course_title, workload_hours, final_grade, issued_at FROM certificates ORDER BY issued_at DESC'),
    columns: [
      { key: 'code', label: 'codigo' },
      { key: 'student_name', label: 'aluno' },
      { key: 'course_title', label: 'curso' },
      { key: 'workload_hours', label: 'carga_horaria' },
      { key: 'final_grade', label: 'nota_final' },
      { key: 'issued_at', label: 'emissao' },
    ],
  },
  feedback: {
    title: 'Feedback dos cursos',
    rows: () =>
      all(`SELECT c.title course, u.name, f.rating, f.content_rating, f.recommend, f.comment, f.created_at
           FROM feedback f JOIN courses c ON c.id = f.course_id JOIN users u ON u.id = f.user_id ORDER BY f.created_at DESC`),
    columns: [
      { key: 'course', label: 'curso' },
      { key: 'name', label: 'aluno' },
      { key: 'rating', label: 'nota_geral' },
      { key: 'content_rating', label: 'nota_conteudo' },
      { key: 'recommend', label: 'recomendaria_0_10' },
      { key: 'comment', label: 'comentario' },
      { key: 'created_at', label: 'data' },
    ],
  },
  'tempo-estudo': {
    title: 'Tempo de estudo diário',
    rows: () =>
      all(`SELECT s.day, u.name, u.municipality, c.title course, s.seconds FROM study_time s
           JOIN users u ON u.id = s.user_id JOIN courses c ON c.id = s.course_id ORDER BY s.day DESC, u.name`),
    columns: [
      { key: 'day', label: 'dia' },
      { key: 'name', label: 'aluno' },
      { key: 'municipality', label: 'municipio' },
      { key: 'course', label: 'curso' },
      { key: 'seconds', label: 'segundos' },
    ],
  },
  avaliacoes: {
    title: 'Tentativas de avaliação',
    rows: () =>
      all(`SELECT a.title assessment, a.kind, u.name, t.score, t.passed, t.is_recovery, t.created_at
           FROM attempts t JOIN assessments a ON a.id = t.assessment_id JOIN users u ON u.id = t.user_id ORDER BY t.created_at DESC`),
    columns: [
      { key: 'assessment', label: 'avaliacao' },
      { key: 'kind', label: 'tipo' },
      { key: 'name', label: 'aluno' },
      { key: 'score', label: 'nota' },
      { key: 'passed', label: 'aprovado' },
      { key: 'is_recovery', label: 'recuperacao' },
      { key: 'created_at', label: 'data' },
    ],
  },
};

adminInsightsRouter.get('/reports', (_req, res) => {
  res.json({ reports: Object.entries(REPORTS).map(([key, r]) => ({ key, title: r.title })) });
});

adminInsightsRouter.get('/reports/:key.csv', (req, res) => {
  const report = REPORTS[req.params.key];
  if (!report) throw notFound('Relatório não encontrado');
  const rows = report.rows();
  audit(req, 'report.export', 'report', null, { report: req.params.key, rows: rows.length });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="relatorio-${req.params.key}.csv"`);
  res.send(toCsv(rows, report.columns));
});

adminInsightsRouter.get('/certificates', (req, res) => {
  const q = String(req.query.q ?? '').trim();
  res.json({
    certificates: all(
      `SELECT * FROM certificates WHERE (? = '' OR code LIKE ? OR student_name LIKE ? OR course_title LIKE ?) ORDER BY issued_at DESC LIMIT 500`,
      q,
      `%${q}%`,
      `%${q}%`,
      `%${q}%`,
    ),
  });
});

adminInsightsRouter.get('/feedback', (_req, res) => {
  res.json({
    summary: all(
      `SELECT c.id, c.title, COUNT(f.id) responses, ROUND(AVG(f.rating), 2) rating, ROUND(AVG(f.content_rating), 2) content_rating,
         ROUND(AVG(f.recommend), 1) recommend
       FROM courses c LEFT JOIN feedback f ON f.course_id = c.id GROUP BY c.id ORDER BY c.position, c.id`,
    ),
    recent: all(
      `SELECT f.*, u.name, c.title course_title FROM feedback f JOIN users u ON u.id = f.user_id JOIN courses c ON c.id = f.course_id
       ORDER BY f.id DESC LIMIT 100`,
    ),
  });
});

adminInsightsRouter.get('/logs', (req, res) => {
  const { page, pageSize, offset } = pagination(req, 50);
  const where = ['1 = 1'];
  const params: (string | number)[] = [];
  const action = String(req.query.action ?? '').trim();
  if (action) {
    where.push('l.action LIKE ?');
    params.push(`${action}%`);
  }
  const q = String(req.query.q ?? '').trim();
  if (q) {
    where.push('(u.name LIKE ? OR u.email LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  const from = `FROM audit_logs l LEFT JOIN users u ON u.id = l.user_id WHERE ${where.join(' AND ')}`;
  res.json({
    logs: all(`SELECT l.*, u.name user_name, u.email user_email ${from} ORDER BY l.id DESC LIMIT ? OFFSET ?`, ...params, pageSize, offset),
    total: Number(get<{ n: number }>(`SELECT COUNT(*) n ${from}`, ...params)!.n),
    actions: all<{ action: string }>('SELECT DISTINCT action FROM audit_logs ORDER BY action').map((r) => r.action),
    page,
    pageSize,
  });
});

adminInsightsRouter.get('/emails', (req, res) => {
  const { page, pageSize, offset } = pagination(req, 30);
  res.json({
    emails: all('SELECT * FROM email_outbox ORDER BY id DESC LIMIT ? OFFSET ?', pageSize, offset),
    total: Number(get<{ n: number }>('SELECT COUNT(*) n FROM email_outbox')!.n),
    page,
    pageSize,
  });
});

adminInsightsRouter.get('/settings', (_req, res) => {
  res.json({ settings: getSettings(), defaults: SETTING_DEFAULTS });
});

adminInsightsRouter.put('/settings', (req, res) => {
  const keys = Object.keys(SETTING_DEFAULTS) as SettingKey[];
  const body = parse(z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])), req.body);
  const values: Partial<Record<SettingKey, string>> = {};
  for (const k of keys) if (body[k] !== undefined) values[k] = String(body[k]);
  saveSettings(values);
  audit(req, 'settings.update', 'settings', null, values);
  res.json({ settings: getSettings() });
});
