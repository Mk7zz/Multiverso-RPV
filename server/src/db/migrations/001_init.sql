-- Multiverso Rio Pomba Valley — esquema inicial (MVP Semana Tech)
-- Datas em ISO 8601 UTC. Dias de estudo (study_time.day) em YYYY-MM-DD no fuso APP_TIMEZONE.

-- 1. Gestão de usuários / 2. Perfis de acesso -----------------------------------------
CREATE TABLE users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'student',   -- student | admin (instructor/coordinator: pós-MVP)
  municipality   TEXT,
  school         TEXT,
  birth_date     TEXT,
  bio            TEXT,
  avatar         TEXT,                              -- JSON com a configuração do avatar
  points         INTEGER NOT NULL DEFAULT 0,
  is_active      INTEGER NOT NULL DEFAULT 1,
  is_demo        INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_login_at  TEXT,
  last_seen_at   TEXT
);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_municipality ON users(municipality);

CREATE TABLE password_resets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TEXT NOT NULL,
  used_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE audit_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity      TEXT,
  entity_id   INTEGER,
  details     TEXT,
  ip          TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

CREATE TABLE settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);

-- 3. Gestão de cursos: Trilha -> Curso -> Módulo -> Aula -------------------------------
CREATE TABLE trails (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  description  TEXT,
  cover_url    TEXT,
  published    INTEGER NOT NULL DEFAULT 0,
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE courses (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  trail_id           INTEGER REFERENCES trails(id) ON DELETE SET NULL,
  title              TEXT NOT NULL,
  slug               TEXT NOT NULL UNIQUE,
  summary            TEXT,
  description        TEXT,
  cover_url          TEXT,
  workload_hours     REAL NOT NULL DEFAULT 0,
  level              TEXT,
  access_type        TEXT NOT NULL DEFAULT 'open',    -- open (closed: pós-MVP)
  availability       TEXT NOT NULL DEFAULT 'fixed',   -- fixed (temporary: pós-MVP)
  delivery_mode      TEXT NOT NULL DEFAULT 'async',   -- async (sync/ao vivo: pós-MVP)
  has_certificate    INTEGER NOT NULL DEFAULT 1,
  cert_min_grade     REAL NOT NULL DEFAULT 70,         -- nota mínima (0-100) para o certificado
  cert_min_progress  REAL NOT NULL DEFAULT 100,        -- % mínimo de aulas concluídas
  require_feedback   INTEGER NOT NULL DEFAULT 1,       -- feedback como pré-requisito do certificado
  published          INTEGER NOT NULL DEFAULT 0,
  position           INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_courses_trail ON courses(trail_id);

CREATE TABLE modules (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id    INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  position     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_modules_course ON modules(course_id);

CREATE TABLE lessons (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  module_id         INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  content           TEXT,
  video_url         TEXT,
  duration_minutes  INTEGER NOT NULL DEFAULT 0,
  position          INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_lessons_module ON lessons(module_id);

CREATE TABLE materials (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id   INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  file_name   TEXT,
  size        INTEGER,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Matrículas, progresso e tempo de estudo ---------------------------------------------
CREATE TABLE enrollments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id       INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'in_progress',  -- in_progress | completed
  progress        REAL NOT NULL DEFAULT 0,
  final_grade     REAL,
  enrolled_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at    TEXT,
  last_access_at  TEXT,
  UNIQUE (user_id, course_id)
);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);

CREATE TABLE lesson_progress (
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id     INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at  TEXT NOT NULL,
  PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE study_time (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id  INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  day        TEXT NOT NULL,
  seconds    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, course_id, day)
);
CREATE INDEX idx_study_day ON study_time(day);

-- 6. Avaliações -----------------------------------------------------------------------
CREATE TABLE questions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  statement    TEXT NOT NULL,
  explanation  TEXT,
  type         TEXT NOT NULL DEFAULT 'single',  -- single | multiple (questões fechadas)
  tags         TEXT,
  difficulty   TEXT NOT NULL DEFAULT 'medium',  -- easy | medium | hard
  course_id    INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE question_options (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id  INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  text         TEXT NOT NULL,
  is_correct   INTEGER NOT NULL DEFAULT 0,
  position     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_options_question ON question_options(question_id);

CREATE TABLE assessments (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  title              TEXT NOT NULL,
  description        TEXT,
  kind               TEXT NOT NULL DEFAULT 'quiz',     -- quiz (conta nota) | exercise (fixação)
  scope_type         TEXT NOT NULL,                    -- lesson | module | course | trail
  scope_id           INTEGER NOT NULL,
  min_grade          REAL NOT NULL DEFAULT 70,
  allow_recovery     INTEGER NOT NULL DEFAULT 1,
  shuffle_questions  INTEGER NOT NULL DEFAULT 0,
  published          INTEGER NOT NULL DEFAULT 1,
  position           INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_assessments_scope ON assessments(scope_type, scope_id);

CREATE TABLE assessment_questions (
  assessment_id  INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_id    INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  position       INTEGER NOT NULL DEFAULT 0,
  weight         REAL NOT NULL DEFAULT 1,
  PRIMARY KEY (assessment_id, question_id)
);

CREATE TABLE attempts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id  INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score          REAL NOT NULL,
  passed         INTEGER NOT NULL,
  is_recovery    INTEGER NOT NULL DEFAULT 0,
  answers        TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_attempts_user ON attempts(user_id, assessment_id);

-- 5. Certificação ---------------------------------------------------------------------
CREATE TABLE feedback (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id       INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  rating          INTEGER NOT NULL,   -- 1-5 avaliação geral
  content_rating  INTEGER,            -- 1-5 qualidade do conteúdo
  recommend       INTEGER,            -- 0-10 recomendaria
  comment         TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (user_id, course_id)
);

CREATE TABLE certificates (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  code            TEXT NOT NULL UNIQUE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id       INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_name    TEXT NOT NULL,
  course_title    TEXT NOT NULL,
  workload_hours  REAL NOT NULL,
  final_grade     REAL,
  issued_at       TEXT NOT NULL,
  UNIQUE (user_id, course_id)
);

-- 7. Comunicação ----------------------------------------------------------------------
CREATE TABLE notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  read_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_notifications_user ON notifications(user_id, read_at);

CREATE TABLE messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  audience    TEXT NOT NULL,      -- all | course | user
  course_id   INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE message_recipients (
  message_id  INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at     TEXT,
  PRIMARY KEY (message_id, user_id)
);

CREATE TABLE announcements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  level       TEXT NOT NULL DEFAULT 'info',   -- info | important
  pinned      INTEGER NOT NULL DEFAULT 0,
  starts_at   TEXT,
  ends_at     TEXT,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  description  TEXT,
  location     TEXT,
  url          TEXT,
  starts_at    TEXT NOT NULL,
  ends_at      TEXT,
  course_id    INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE email_outbox (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email    TEXT NOT NULL,
  subject     TEXT NOT NULL,
  body_html   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',   -- pending | sent | logged | failed
  error       TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  sent_at     TEXT
);

-- 8. Conexões -------------------------------------------------------------------------
CREATE TABLE friendships (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted | declined
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  responded_at  TEXT,
  UNIQUE (requester_id, addressee_id)
);

-- 11. Gamificação ---------------------------------------------------------------------
CREATE TABLE badges (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  code         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL,
  icon         TEXT NOT NULL
);

CREATE TABLE user_badges (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id    INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at  TEXT NOT NULL,
  PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE points_ledger (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points      INTEGER NOT NULL,
  reason      TEXT NOT NULL,
  ref         TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (user_id, reason, ref)
);
CREATE INDEX idx_points_created ON points_ledger(created_at);
