# Multiverso Rio Pomba Valley

Plataforma de aprendizagem gamificada em 2D do **Multiverso Rio Pomba Valley** (iniciativa do Instituto Energisa), substituindo a solução white label atual. O aluno cria um personagem em pixel-art, anda por um mundo 2D e sobe de nível estudando. Esta versão implementa o **MVP definido para a Semana Tech** e foi preparada para ser licenciada a outras organizações (veja [docs/WHITE-LABEL.md](docs/WHITE-LABEL.md)).

- **Backend:** Node.js 22 + Express 5 + TypeScript, banco SQLite nativo do Node (`node:sqlite`)
- **Frontend:** React 19 + Vite + TypeScript (SPA, sem biblioteca de UI)
- **Tempo real:** Server-Sent Events (notificações do aluno e dashboard do admin)
- **Certificados:** PDF gerado no servidor (PDFKit) com QR code de validação

## Requisitos

- Node.js **22.13 ou superior** (usa `node:sqlite` sem flag)
- Nenhum banco externo, Docker ou compilação nativa é necessário

## Como rodar (desenvolvimento)

```bash
npm install            # instala as dependências do backend e do frontend
npm run seed           # cria o banco, o administrador e os 5 cursos iniciais
npm run seed:demo      # (opcional) 40 alunos fictícios para dashboards, ranking e conexões
npm run dev            # API em http://localhost:3333 + site em http://localhost:5173
```

Acesse **http://localhost:5173**.

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | `admin@multiverso.rpv` | `admin12345` |
| Aluno de demonstração (após `seed:demo`) | `aluno@demo.multiverso.rpv` | `demo12345` |

> Troque a senha do administrador no primeiro acesso (Perfil › Conta e segurança). Os dados de demonstração podem ser removidos com `npm run seed:demo -- --clean`.

## Configuração

Copie `server/.env.example` para `server/.env` e ajuste. Os principais itens:

| Variável | Para que serve |
|---|---|
| `JWT_SECRET` | **Obrigatório em produção.** Segredo dos tokens de login |
| `APP_URL` | URL pública do site (links de e-mail e QR code do certificado) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Administrador criado na primeira execução |
| `SMTP_*` / `MAIL_FROM` | Envio real de e-mails. Sem SMTP, os e-mails ficam registrados em **Admin › E-mails enviados** |
| `DATABASE_PATH` / `UPLOADS_DIR` | Onde ficam o banco e os vídeos/materiais enviados |

Configurações de negócio (nome da plataforma, assinatura do certificado, janelas de "aluno ativo" e "abandono", pontos de gamificação, abertura de cadastro) são editadas na tela **Admin › Configurações**.

## Produção

```bash
npm install
npm run build          # gera web/dist
npm start              # a API passa a servir também o site, na porta PORT (3333)
```

Coloque um proxy reverso (Nginx, Caddy, IIS) com HTTPS na frente. Faça backup periódico de `server/data/` (banco) e `server/uploads/` (vídeos e materiais). Para SSE funcionar atrás de proxy, desative o buffering de resposta para `/api/*/stream`.

## Estrutura

```
server/
  src/
    db/            migrações SQL, bootstrap, seeds (conteúdo e demonstração)
    lib/           regras de negócio: progresso, certificados, gamificação, analytics, e-mail…
    middleware/    autenticação e perfis de acesso (RBAC)
    routes/        API pública, do aluno e /admin
web/
  src/
    pages/start    tela de início e onboarding (nome → personagem → origem → conta)
    pages/public   catálogo, login, validação de certificado
    pages/student  mundo 2D (base), sala de aula, avaliações, perfil/avatar, ranking, conexões
    pages/admin    dashboard em tempo real, conteúdo, questões, usuários, comunicação…
docs/              escopo do MVP, arquitetura e roadmap
```

## Documentação

- [docs/ESCOPO-MVP.md](docs/ESCOPO-MVP.md) — cada item do backlog e onde ele está implementado (ou por que ficou para depois)
- [docs/ARQUITETURA.md](docs/ARQUITETURA.md) — modelo de dados, regras de negócio, API e próximos passos
- [docs/WHITE-LABEL.md](docs/WHITE-LABEL.md) — como trocar marca, cores, mundo e textos para outra organização

## Scripts úteis

| Comando | O que faz |
|---|---|
| `npm run dev` | API + frontend com recarga automática |
| `npm run typecheck` | Checagem de tipos do backend e do frontend |
| `npm run seed` | Conteúdo inicial (idempotente: não duplica se já houver cursos) |
| `npm run seed:demo` | Alunos fictícios para demonstração |
| `npm run build` / `npm start` | Build e execução em produção |
