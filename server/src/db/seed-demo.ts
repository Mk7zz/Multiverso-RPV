import { addDays, localDay } from '../lib/dates';
import { awardPoints, checkBadges } from '../lib/gamification';
import { courseAssessments, courseLessonIds, recalcEnrollment } from '../lib/progress';
import { hashPassword } from '../lib/security';
import { bootstrap } from './bootstrap';
import { all, get, run, tx } from './index';

/**
 * Dados FICTÍCIOS para demonstração (dashboards, ranking, conexões).
 *   npm run seed:demo           -> cria ~40 alunos de demonstração
 *   npm run seed:demo -- --clean -> remove todos os usuários marcados como demo
 * Login de demonstração: aluno@demo.multiverso.rpv / demo12345
 */
bootstrap();

if (process.argv.includes('--clean')) {
  const { changes } = run('DELETE FROM users WHERE is_demo = 1');
  console.log(`[seed:demo] ${changes} usuários de demonstração removidos.`);
  process.exit(0);
}
if (get('SELECT id FROM users WHERE is_demo = 1 LIMIT 1')) {
  console.log('[seed:demo] dados de demonstração já existem. Use --clean para removê-los.');
  process.exit(0);
}
const courses = all<{ id: number }>('SELECT id FROM courses WHERE published = 1');
if (!courses.length) {
  console.error('[seed:demo] rode "npm run seed" antes para criar os cursos.');
  process.exit(1);
}

const MUNICIPALITIES = ['Rio Pomba', 'Juiz de Fora', 'Ubá', 'Cataguases', 'Muriaé', 'Leopoldina', 'Viçosa', 'Tocantins', 'Guarani', 'Mercês', 'Piraúba', 'Silveirânia', 'Tabuleiro'];
const FIRST = ['Ana', 'Bruno', 'Carla', 'Davi', 'Eduarda', 'Felipe', 'Gabriela', 'Heitor', 'Isabela', 'João', 'Kauã', 'Larissa', 'Miguel', 'Nicole', 'Otávio', 'Pietra', 'Rafael', 'Sofia', 'Thiago', 'Valentina'];
const LAST = ['Silva', 'Souza', 'Oliveira', 'Pereira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Lima', 'Araújo', 'Fernandes', 'Carvalho'];
const SKINS = ['#f2d6c9', '#e0ac69', '#c68642', '#8d5524', '#5c3a21'];
const HAIRS = ['short', 'long', 'curly', 'bun', 'afro', 'mohawk'];

let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)];
const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));

const password = hashPassword('demo12345');
const today = localDay();
const userIds: number[] = [];

tx(() => {
  for (let i = 0; i < 40; i++) {
    const name = i === 0 ? 'Aluno Demonstração' : `${pick(FIRST)} ${pick(LAST)}`;
    const email = i === 0 ? 'aluno@demo.multiverso.rpv' : `aluno${i}@demo.multiverso.rpv`;
    const created = new Date(Date.now() - int(1, 45) * 86_400_000).toISOString();
    const avatar = JSON.stringify({
      skin: pick(SKINS),
      hair: pick(HAIRS),
      hairColor: pick(['#2b1b0e', '#4a2c17', '#d4a253', '#111111', '#a0522d']),
      eyes: pick(['round', 'happy', 'wink']),
      mouth: pick(['smile', 'grin', 'neutral']),
      shirt: pick(['#1d5c3f', '#2563eb', '#db2777', '#f59e0b', '#7c3aed']),
      accessory: pick(['none', 'none', 'glasses', 'headphones', 'cap']),
      background: pick(['#dcfce7', '#dbeafe', '#fef3c7', '#fce7f3', '#ede9fe']),
    });
    const id = run(
      `INSERT INTO users (name, email, password_hash, municipality, school, avatar, is_demo, created_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      name,
      email,
      password,
      i === 0 ? 'Rio Pomba' : pick(MUNICIPALITIES),
      `Escola Estadual ${pick(LAST)}`,
      i < 30 ? avatar : null,
      created,
      new Date(Date.now() - int(0, 20) * 86_400_000).toISOString(),
    ).id;
    userIds.push(id);

    const myCourses = [...courses].sort(() => rnd() - 0.5).slice(0, i === 0 ? 2 : int(1, 4));
    for (const c of myCourses) {
      const enrolledDaysAgo = int(1, 30);
      run(
        'INSERT INTO enrollments (user_id, course_id, enrolled_at, last_access_at) VALUES (?, ?, ?, ?)',
        id,
        c.id,
        new Date(Date.now() - enrolledDaysAgo * 86_400_000).toISOString(),
        new Date(Date.now() - int(0, enrolledDaysAgo) * 86_400_000).toISOString(),
      );
      const lessons = courseLessonIds(c.id);
      const done = i === 0 ? Math.ceil(lessons.length / 2) : rnd() < 0.35 ? lessons.length : int(0, lessons.length);
      lessons.slice(0, done).forEach((lid) => {
        run('INSERT INTO lesson_progress (user_id, lesson_id, completed_at) VALUES (?, ?, ?)', id, lid, new Date(Date.now() - int(0, enrolledDaysAgo) * 86_400_000).toISOString());
        awardPoints(id, 'points_lesson', 'lesson', lid);
      });
      // Tempo de estudo distribuído nos últimos dias (alimenta streak e dashboards).
      const studyDays = Math.min(enrolledDaysAgo, int(1, 10));
      const streakFromToday = rnd() < 0.4;
      for (let d = 0; d < studyDays; d++) {
        const day = streakFromToday ? addDays(today, -d) : addDays(today, -int(0, enrolledDaysAgo));
        run(
          `INSERT INTO study_time (user_id, course_id, day, seconds) VALUES (?, ?, ?, ?)
           ON CONFLICT(user_id, course_id, day) DO UPDATE SET seconds = seconds + excluded.seconds`,
          id,
          c.id,
          day,
          int(5, 50) * 60,
        );
      }
      if (done === lessons.length) {
        for (const quiz of courseAssessments(c.id, 'quiz')) {
          const score = int(55, 100);
          run('INSERT INTO attempts (assessment_id, user_id, score, passed, answers) VALUES (?, ?, ?, ?, ?)', quiz.id, id, score, score >= quiz.min_grade, '{}');
          if (score < quiz.min_grade) {
            const retry = int(70, 100);
            run('INSERT INTO attempts (assessment_id, user_id, score, passed, is_recovery, answers) VALUES (?, ?, ?, 1, 1, ?)', quiz.id, id, retry, '{}');
          }
          awardPoints(id, 'points_quiz_pass', 'quiz_pass', quiz.id);
        }
        if (rnd() < 0.8) {
          run(
            'INSERT INTO feedback (user_id, course_id, rating, content_rating, recommend, comment) VALUES (?, ?, ?, ?, ?, ?)',
            id,
            c.id,
            int(3, 5),
            int(3, 5),
            int(6, 10),
            pick([null, 'Gostei muito do curso!', 'Conteúdo bem explicado.', 'Poderia ter mais exercícios.', 'Me ajudou no currículo.']),
          );
        }
      }
    }
  }

  // Algumas amizades entre os alunos de demonstração.
  for (let k = 0; k < 50; k++) {
    const a = pick(userIds);
    const b = pick(userIds);
    if (a === b) continue;
    run("INSERT OR IGNORE INTO friendships (requester_id, addressee_id, status, responded_at) VALUES (?, ?, 'accepted', ?)", a, b, new Date().toISOString());
  }
});

// Recalcula progresso, conclusões, certificados e medalhas com as regras reais da plataforma.
for (const uid of userIds) {
  for (const e of all<{ course_id: number }>('SELECT course_id FROM enrollments WHERE user_id = ?', uid)) recalcEnrollment(uid, e.course_id);
  checkBadges(uid);
}
// Os e-mails gerados pelos alunos fictícios não precisam poluir a caixa de saída.
run("DELETE FROM email_outbox WHERE to_email LIKE '%@demo.multiverso.rpv'");

console.log(`[seed:demo] ${userIds.length} alunos de demonstração criados. Login: aluno@demo.multiverso.rpv / demo12345`);
