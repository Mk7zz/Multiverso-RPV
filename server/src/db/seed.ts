import { slugify } from '../lib/slug';
import { bootstrap } from './bootstrap';
import { get, run, tx } from './index';
import { COURSES, TRAIL } from './seed-content';

/**
 * Seed idempotente do conteúdo inicial: trilha, 5 cursos, módulos, aulas, banco de questões,
 * avaliações (exercício por módulo + questionário final), aviso e evento de boas-vindas.
 */
bootstrap();

if (get('SELECT id FROM courses LIMIT 1')) {
  console.log('[seed] já existem cursos cadastrados — nada a fazer.');
  process.exit(0);
}

tx(() => {
  const trailId = run('INSERT INTO trails (title, slug, description, published, position) VALUES (?, ?, ?, 1, 1)', TRAIL.title, slugify(TRAIL.title), TRAIL.description).id;

  COURSES.forEach((c, ci) => {
    const courseId = run(
      `INSERT INTO courses (trail_id, title, slug, summary, description, workload_hours, level, published, position, cover_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      trailId,
      c.title,
      slugify(c.title),
      c.summary,
      c.description,
      c.workload_hours,
      c.level,
      ci + 1,
      `/covers/course-${ci + 1}.svg`,
    ).id;

    const questionIds = c.questions.map((q) => {
      const id = run('INSERT INTO questions (statement, explanation, type, course_id, tags) VALUES (?, ?, ?, ?, ?)', q.statement, q.explanation ?? null, q.type ?? 'single', courseId, slugify(c.title)).id;
      q.options.forEach(([text, correct], i) => run('INSERT INTO question_options (question_id, text, is_correct, position) VALUES (?, ?, ?, ?)', id, text, correct, i + 1));
      return id;
    });

    c.modules.forEach((m, mi) => {
      const moduleId = run('INSERT INTO modules (course_id, title, position) VALUES (?, ?, ?)', courseId, m.title, mi + 1).id;
      m.lessons.forEach((l, li) =>
        run(
          'INSERT INTO lessons (module_id, title, content, duration_minutes, position) VALUES (?, ?, ?, ?, ?)',
          moduleId,
          l.title,
          `<p>${l.content}</p><p><em>Conteúdo de demonstração — o vídeo desta aula será migrado da plataforma atual.</em></p>`,
          l.minutes,
          li + 1,
        ),
      );
      // Exercício de fixação ao fim de cada módulo (2 questões do banco).
      const exerciseId = run(
        "INSERT INTO assessments (title, kind, scope_type, scope_id, min_grade, position) VALUES (?, 'exercise', 'module', ?, 0, ?)",
        `Exercício — ${m.title}`,
        moduleId,
        mi + 1,
      ).id;
      [questionIds[(mi * 2) % questionIds.length], questionIds[(mi * 2 + 1) % questionIds.length]].forEach((qid, i) =>
        run('INSERT INTO assessment_questions (assessment_id, question_id, position) VALUES (?, ?, ?)', exerciseId, qid, i + 1),
      );
    });

    // Questionário final do curso (todas as questões, nota mínima 70, com recuperação).
    const quizId = run(
      "INSERT INTO assessments (title, description, kind, scope_type, scope_id, min_grade, shuffle_questions, position) VALUES (?, ?, 'quiz', 'course', ?, 70, 1, 99)",
      `Avaliação final — ${c.title}`,
      'Responda a todas as questões. A nota mínima para aprovação é 70. Se não atingir, você pode fazer a recuperação.',
      courseId,
    ).id;
    questionIds.forEach((qid, i) => run('INSERT INTO assessment_questions (assessment_id, question_id, position) VALUES (?, ?, ?)', quizId, qid, i + 1));
  });

  run(
    "INSERT INTO announcements (title, body, level, pinned) VALUES (?, ?, 'important', 1)",
    'Bem-vindo(a) ao novo Multiverso!',
    'Esta é a nova plataforma própria do Multiverso Rio Pomba Valley. Inscreva-se nos cursos, acumule pontos, mantenha sua sequência de estudos e conquiste medalhas!',
  );
  const inThreeMonths = new Date(Date.now() + 90 * 86_400_000);
  inThreeMonths.setUTCHours(12, 0, 0, 0);
  run(
    'INSERT INTO events (title, description, location, starts_at) VALUES (?, ?, ?, ?)',
    'Semana Tech — Rio Pomba Valley',
    'Apresentação da nova plataforma do Multiverso. (Data provisória — ajuste em Admin › Comunicação › Eventos.)',
    'Rio Pomba - MG',
    inThreeMonths.toISOString(),
  );
});

console.log(`[seed] conteúdo inicial criado: 1 trilha, ${COURSES.length} cursos.`);
