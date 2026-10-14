# Escopo do MVP — Semana Tech

Mapa de cada item do backlog (documento *Backlog de Demandas e Escopo do MVP*) para a implementação. **MVP** = entregue nesta versão; **Pós-MVP** = fica para as próximas etapas, com o ponto de extensão já previsto quando aplicável.

## 1. Gestão de usuários

| Funcionalidade | Status | Onde está |
|---|---|---|
| Cadastro e autenticação | MVP | `POST /api/auth/register` e `/login` (senha com scrypt, token JWT, limite de tentativas). Telas `/cadastro` e `/entrar` |
| Recuperação de senha e e-mail | MVP | Link por e-mail válido por 1h (`/esqueci-senha` → `/redefinir-senha`). Troca do e-mail de acesso com confirmação de senha e aviso ao e-mail antigo (Perfil › Conta e segurança) |
| Login social (Google/Microsoft) | Pós-MVP | — |
| Cadastro de escolas, municípios, parceiros, turmas | Pós-MVP | No MVP, município e escola são campos de texto do aluno (com sugestões de municípios da Zona da Mata) |
| Autorização de responsáveis (menores) | Pós-MVP | A data de nascimento já é coletada, permitindo implementar o fluxo depois |

## 2. Perfis de acesso (RBAC)

| Funcionalidade | Status | Onde está |
|---|---|---|
| Visitante | MVP | Vitrine pública: home, catálogo, página do curso/trilha, eventos, validação de certificado |
| Aluno | MVP | Todas as rotas `/api/learning`, `/assessments`, `/profile`, `/connections`, `/gamification` |
| Administrador (painel, logs, controle de acessos, configurações, import/export) | MVP | `/admin`: dashboard, usuários (perfil, ativar/desativar, convite, reenvio de senha), importação/exportação CSV, logs de auditoria, configurações |
| Instrutor / Coordenador | Pós-MVP | O campo `users.role` já é texto livre; basta adicionar os papéis e as regras em `middleware/auth.ts` |

## 3. Gestão de cursos

| Funcionalidade | Status | Onde está |
|---|---|---|
| Estrutura Trilha → Curso → Módulo → Aula | MVP | Admin › Trilhas e cursos; editor de curso com módulos/aulas reordenáveis |
| Upload de vídeos e materiais complementares | MVP | Upload de vídeo (até 2 GB, com barra de progresso) ou link do YouTube/Vimeo; anexos por aula |
| Cursos assíncronos | MVP (parcial) | Apenas assíncronos. Campo `courses.delivery_mode` reservado para aulas ao vivo |
| Cursos abertos | MVP | Inscrição livre com um clique. Campo `courses.access_type` reservado para cursos fechados |
| Cursos fixos | MVP | Sem data de expiração. Campo `courses.availability` reservado para temporários |
| Anotações | Pós-MVP | — |
| Cursos fechados (triagem, lista de espera…) | Pós-MVP | — |
| Cursos temporários | Pós-MVP | — |
| Controle de fluxo (por nota / aula assistida) | Pós-MVP | Navegação livre no MVP; o progresso por aula já é registrado |
| Central de dúvidas | Pós-MVP | — |

## 4. Acompanhamento do aluno

Todos marcados como Pós-MVP no documento. **Tempo de estudo** e **histórico de cursos** foram implementados mesmo assim, porque são a base de itens que estão no MVP (tempo médio de estudo, streak, alunos ativos e taxa de conclusão):

| Funcionalidade | Status | Onde está |
|---|---|---|
| Tempo de estudo | Base do MVP | O player envia um pulso a cada 30s com a aba visível (`study_time` por aluno/curso/dia) |
| Histórico de cursos | Base do MVP | Painel do aluno: em andamento e concluídos, com nota e certificado |
| Favoritos | Pós-MVP | — |

## 5. Certificação

| Funcionalidade | Status | Onde está |
|---|---|---|
| Geração automática de certificados | MVP | Emitido automaticamente quando os critérios são cumpridos; PDF A4 com QR code (`lib/certificate-pdf.ts`) |
| Validação pública | MVP | `/validar/:codigo` (sem login) e `GET /api/certificates/validate/:code` |
| Cursos com e sem certificado | MVP | Opção "Emite certificado" no editor do curso |
| Critérios para emissão | MVP | % mínimo de aulas, aprovação em todas as avaliações do curso e nota final mínima, configuráveis por curso |
| Feedback como pré-requisito | MVP | Formulário (nota geral, conteúdo, recomendação 0–10, comentário), configurável por curso. Resultados em Admin › Certificados e feedback |
| Templates versionados | Pós-MVP | Template fixo; os dados do certificado ficam congelados no momento da emissão |
| Renovação | Pós-MVP | — |

## 6. Avaliações

| Funcionalidade | Status | Onde está |
|---|---|---|
| Questionários | MVP | Tipo `quiz`: conta para a nota final e para o certificado |
| Exercícios | MVP | Tipo `exercise`: fixação, correção comentada, sem impacto na nota |
| Correção automática | MVP | `POST /api/assessments/:id/attempts` |
| Banco de questões | MVP | Admin › Banco de questões (reutilizável entre avaliações) |
| Nota mínima | MVP | Por avaliação |
| Reprovação e recuperação | MVP | Após reprovar, nova tentativa marcada como recuperação. O gabarito não é revelado em questionários reprovados, para a recuperação ter valor |
| Avaliações por aula/módulo/curso/trilha | MVP | Campo "Nível" da avaliação |
| Questões fechadas | MVP (parcial) | Escolha única e múltipla escolha |
| Trabalhos / questões abertas / limite de tentativas | Pós-MVP | — |

## 7. Comunicação

| Funcionalidade | Status | Onde está |
|---|---|---|
| Notificações | MVP | Sino no topo + toasts em tempo real (SSE) |
| E-mails automáticos | MVP | Boas-vindas, convite, redefinição de senha, troca de e-mail, conclusão de curso, certificado, aviso de mensagem |
| Mensagens internas | MVP | Admin envia para todos ou para os alunos de um curso; caixa de entrada em `/mensagens` com confirmação de leitura |
| Avisos | MVP | Com período de exibição, destaque e fixação; exibidos na home e no painel |
| Eventos | MVP | Gerais ou ligados a um curso, com local e link (transmissão/inscrição) |
| Calendário | Pós-MVP | Os eventos já têm data/hora; falta apenas a visualização em calendário |

## 8. Conexões

| Funcionalidade | Status | Onde está |
|---|---|---|
| Solicitação de amizade / comparar perfis | MVP | `/conexoes` (buscar, enviar, aceitar, recusar, remover) e `/conexoes/comparar/:id` |
| Troca de mensagens entre usuários | Pós-MVP | Descartado pela equipe por risco de moderação |

## 9. Gestão de bolsas — Pós-MVP

## 10. Analytics e dashboards

| Funcionalidade | Status | Onde está |
|---|---|---|
| Alunos ativos | MVP | Janela configurável (padrão 7 dias) + "estudando hoje" + online agora |
| Taxa de conclusão e abandono | MVP | Abandono = matrícula em andamento sem acesso há N dias (padrão 30, configurável) |
| Tempo médio de estudo | MVP | Por aluno, a partir do tempo de estudo registrado |
| Cursos mais acessados | MVP | Matrículas, concluintes, alunos ativos e tempo por curso |
| Municípios com maior participação | MVP | Alunos e concluintes por município |
| Relatórios exportáveis | MVP | 7 relatórios CSV (Admin › Relatórios) + exportação de usuários |
| Dashboards em tempo real | MVP | Admin › Dashboard atualiza via SSE a cada 10s |

## 11. Gamificação

| Funcionalidade | Status | Onde está |
|---|---|---|
| Medalhas | MVP | 22 medalhas com raridade (bronze, prata, ouro, lendária) e barra de progresso (`lib/gamification.ts`), concedidas automaticamente com notificação |
| Pontuação (XP) | MVP | Aula, exercício, avaliação aprovada, curso concluído, dia de estudo e missões — valores configuráveis; cada ação pontua uma única vez; "+XP" em tempo real (SSE) |
| Níveis | MVP | 10 níveis temáticos do Vale, de Semente a Lenda do Valley (`lib/levels.ts`), com celebração de subida de nível |
| Missões | MVP | 3 diárias + Baú do Vale e 4 semanais, calculadas da atividade existente; recompensa resgatada pelo aluno (`lib/quests.ts`, página `/missoes`) |
| Mapa do Vale | MVP | Trilhas como regiões e cursos como paradas ao longo do rio, com progresso e avatar na parada atual (`/jornada`) |
| Ranking | MVP | Geral, por município ou entre amigos; total ou do mês; pódio e nível de cada aluno |
| Streak | MVP | Dias consecutivos de estudo (fuso America/Sao_Paulo), recorde e calendário da semana |
| Avatar personalizado | MVP | Criador de personagem em pixel-art (pele, cabelo, rosto, roupa, calça e acessórios), usado no onboarding e no mundo 2D |

## 12. Inteligência Artificial — Pós-MVP

Resumo de aulas e recomendações de cursos/carreiras dependem de dados de uso, que esta versão já começa a coletar (tempo de estudo, notas, conclusões, feedback).

## Pontos a confirmar com a equipe

1. **Avatar personalizado** — o próprio documento pede confirmação, pois não constava na lista original. Foi implementado.
2. **Conteúdo dos cursos** — módulos, aulas, cargas horárias e questões do seed são **exemplos**. Substitua pelo conteúdo real ao migrar os vídeos da Sapienza.
3. **Data da Semana Tech** — o evento do seed tem data provisória (90 dias após o seed). Ajuste em Admin › Comunicação › Eventos.
4. **Assinatura do certificado** — padrão "Instituto Energisa / Rio Pomba Valley". Ajuste em Admin › Configurações.
