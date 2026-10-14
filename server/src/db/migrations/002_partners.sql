-- Empresas parceiras: ponte entre quem aprende no Multiverso e o mercado de trabalho.
-- A empresa se cadastra, passa pela aprovação da equipe e então publica oportunidades e
-- busca talentos. O aluno só aparece para empresas se ativar a vitrine (opt-in) e o
-- contato (e-mail) só é revelado depois que ele aceita um convite ou se candidata.

CREATE TABLE companies (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,                       -- nome fantasia
  legal_name   TEXT,
  cnpj         TEXT NOT NULL UNIQUE,                -- só dígitos
  sector       TEXT NOT NULL,
  size         TEXT,                                -- micro | pequena | media | grande
  municipality TEXT NOT NULL,
  website      TEXT,
  description  TEXT,
  contact_phone TEXT,
  color        TEXT NOT NULL DEFAULT '#23384a',     -- cor do "logo" pixelado
  status       TEXT NOT NULL DEFAULT 'pending',     -- pending | approved | rejected | suspended
  review_note  TEXT,
  reviewed_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at  TEXT,
  is_demo      INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_companies_status ON companies(status);

-- Usuários com role = 'company' pertencem a uma empresa.
ALTER TABLE users ADD COLUMN company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE users ADD COLUMN job_title TEXT;            -- cargo do(a) responsável pela empresa

-- Vitrine de talentos (opt-in do aluno).
ALTER TABLE users ADD COLUMN talent_visible INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN talent_headline TEXT;      -- "Quero meu primeiro estágio em TI"
ALTER TABLE users ADD COLUMN talent_areas TEXT;         -- JSON: ["tecnologia", "administracao"]
ALTER TABLE users ADD COLUMN talent_goal TEXT;          -- estagio | jovem_aprendiz | emprego | freelance | qualquer
ALTER TABLE users ADD COLUMN talent_guardian_ok INTEGER NOT NULL DEFAULT 0;  -- menores: autorização do responsável
ALTER TABLE users ADD COLUMN talent_updated_at TEXT;
CREATE INDEX idx_users_talent ON users(talent_visible, role);

CREATE TABLE jobs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id    INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  type          TEXT NOT NULL,                      -- estagio | jovem_aprendiz | emprego | trainee | freelance
  modality      TEXT NOT NULL DEFAULT 'presencial', -- presencial | hibrido | remoto
  municipality  TEXT,
  area          TEXT NOT NULL,
  description   TEXT NOT NULL,
  requirements  TEXT,
  benefits      TEXT,
  course_ids    TEXT,                               -- JSON: cursos do Multiverso que contam a favor
  min_level     INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'open',       -- open | closed
  closes_at     TEXT,
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_jobs_company ON jobs(company_id);
CREATE INDEX idx_jobs_status ON jobs(status);

-- Candidatura do aluno a uma oportunidade (ao se candidatar, ele autoriza a empresa a ver seu contato).
CREATE TABLE job_applications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id      INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message     TEXT,
  status      TEXT NOT NULL DEFAULT 'sent',         -- sent | viewed | shortlisted | declined | hired
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (job_id, user_id)
);
CREATE INDEX idx_applications_user ON job_applications(user_id);

-- Convite da empresa para um talento da vitrine. O contato só é liberado se o aluno aceitar.
CREATE TABLE talent_invites (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id    INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id        INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
  message       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',    -- pending | accepted | declined
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  responded_at  TEXT
);
CREATE INDEX idx_invites_user ON talent_invites(user_id, status);
CREATE INDEX idx_invites_company ON talent_invites(company_id);

-- Talentos salvos pela empresa (lista curta).
CREATE TABLE company_saved_talents (
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (company_id, user_id)
);
