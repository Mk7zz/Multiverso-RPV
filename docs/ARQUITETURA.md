# Arquitetura

## Visão geral

```
Navegador (React SPA) ──HTTP/JSON──▶ Express API (/api) ──▶ SQLite (server/data/multiverso.db)
          ▲                                │
          └──── SSE (notificações, ────────┘──▶ server/uploads (vídeos, materiais, imagens)
                 dashboard ao vivo)        └──▶ SMTP (opcional) / caixa de saída de e-mails
```

- **Um único processo Node** serve a API e, em produção, o frontend compilado. Isso simplifica a hospedagem para uma equipe de 3 pessoas.
- **SQLite** com WAL atende com folga o volume do piloto (milhares de alunos). As consultas usam SQL padrão; migrar para PostgreSQL depois exige trocar `server/src/db/index.ts` e revisar as poucas funções específicas do SQLite (`strftime`, `INSERT OR IGNORE`, `ON CONFLICT`).
- **Migrações** são arquivos `server/src/db/migrations/NNN_nome.sql`, aplicados em ordem na inicialização (controle por `PRAGMA user_version`). Para evoluir o banco, crie `002_…sql`. Nunca edite uma migração já aplicada.

## Modelo de dados (resumo)

| Área | Tabelas |
|---|---|
| Usuários e acesso | `users`, `password_resets`, `audit_logs`, `settings` |
| Conteúdo | `trails` → `courses` → `modules` → `lessons` → `materials` |
| Aprendizagem | `enrollments`, `lesson_progress`, `study_time` (segundos por aluno/curso/dia) |
| Avaliações | `questions`, `question_options`, `assessments` (`scope_type` + `scope_id`), `assessment_questions`, `attempts` |
| Certificação | `feedback`, `certificates` (dados congelados na emissão) |
| Comunicação | `notifications`, `messages`, `message_recipients`, `announcements`, `events`, `email_outbox` |
| Conexões | `friendships` |
| Gamificação | `badges`, `user_badges`, `points_ledger` (único por usuário + motivo + referência) |

## Regras de negócio centrais

Todas em `server/src/lib/`:

- **`progress.ts`**: `recalcEnrollment()` recalcula progresso (% de aulas), nota final (média das melhores notas dos questionários do curso) e conclusão (100% das aulas + todos os questionários aprovados). Roda após cada aula concluída, tentativa de avaliação ou mudança de conteúdo. Também emite o certificado automaticamente quando `certificateStatus()` indica que o aluno está elegível.
- **`gamification.ts`**: `awardPoints()` é idempotente pelo `points_ledger` e envia o evento SSE `xp` (e `level_up` quando o nível sobe); `checkBadges()` avalia o catálogo `BADGES` (cada medalha tem raridade, métrica e meta); `computeStreak()` usa os dias de `study_time`.
- **`levels.ts`**: faixas de XP dos 10 níveis; `levelInfo()` é incluído em `selfUser`/`publicUser`.
- **`quests.ts`**: missões diárias/semanais calculadas a partir de `lesson_progress`, `study_time`, `attempts` e `friendships` (sem tabela própria); o resgate grava `points_ledger` com motivo `quest` e ref `<código>:<início do período>`, o que impede resgate duplo.
- No frontend, `lib/game.tsx` (GameProvider) recebe os eventos de jogo repassados pelo NotificationProvider e alimenta o HUD do cabeçalho, o "+XP" flutuante e o modal de subida de nível.
- **`analytics.ts`**: `getMetrics()` calcula todos os indicadores do dashboard e dos relatórios.
- **`mailer.ts`**: todo e-mail passa pela tabela `email_outbox`; com SMTP configurado ele é enviado, sem SMTP fica registrado.
- **`audit.ts`**: ações administrativas e de autenticação são registradas em `audit_logs`.

## Segurança

- Senhas com `scrypt` e salt; tokens JWT com validade de 7 dias; usuário desativado perde o acesso no request seguinte.
- Limite de 5 tentativas de login por IP+e-mail a cada 10 minutos.
- A recuperação de senha não revela se o e-mail existe; os tokens são guardados apenas como hash SHA-256.
- Toda entrada da API é validada com Zod; o SQL é sempre parametrizado.
- O gabarito nunca é enviado antes da correção.
- O conteúdo HTML das aulas é escrito apenas por administradores. Se instrutores passarem a editar conteúdo, adicione sanitização de HTML.

## API (resumo)

| Prefixo | Acesso | Conteúdo |
|---|---|---|
| `/api/auth` | público / logado | cadastro, login, `me`, recuperação e troca de senha/e-mail |
| `/api/catalog` | público | home, cursos, trilhas, avisos, eventos |
| `/api/certificates` | público / logado | validação, PDF, meus certificados |
| `/api/learning` | aluno | inscrição, meus cursos, sala de aula, aulas, pulso de estudo, conclusão, feedback, certificado |
| `/api/assessments` | aluno | avaliação e envio de tentativa |
| `/api/profile`, `/api/gamification`, `/api/connections`, `/api/communication` | aluno | perfil/avatar, ranking/medalhas, amizades/comparação, notificações/mensagens/stream |
| `/api/admin/*` | administrador | usuários, conteúdo e uploads, questões, avaliações, comunicação, analytics/stream, relatórios, certificados, feedback, logs, e-mails, configurações |

## Próximos passos sugeridos (pós-MVP)

Em ordem de valor para a operação e de reaproveitamento do que já existe:

1. **Controle de fluxo** (liberar a próxima aula por aula assistida ou nota): o progresso por aula e as notas já estão registrados.
2. **Cursos temporários**: o campo `courses.availability` já está reservado; falta adicionar as datas de início e fim (nova migração) e a checagem na inscrição.
3. **Login social** (Google/Microsoft): vincular a `users` pelo e-mail.
4. **Perfis Instrutor/Coordenador**: filtrar as rotas de conteúdo por responsável.
5. **Calendário**: visualização mensal dos `events` existentes.
6. **Missões e desafios**: sobre `points_ledger` e `badges`.
7. **Ponte com o curso Técnico de Desenvolvimento de Sistemas**: usar ranking, notas e conclusões para identificar alunos de destaque e enviar propostas de ingresso, como descrito no documento.
8. **Transmissões ao vivo**: os eventos já aceitam link; o próximo passo é o player embutido e o modo síncrono (`delivery_mode`).
