# Licenciar a plataforma para outra organização

A plataforma foi construída para ser revendida: o motor de jogo (mundo 2D, personagem, níveis, missões, medalhas) é o mesmo e cada cliente recebe a própria identidade. Uma nova instância é configurada em cinco pontos, sem mexer no restante do código.

| O quê | Onde | Exemplos |
|---|---|---|
| Nome, organização, site, lema, nome do mundo e da guia | `web/src/brand.ts` | "Multiverso", "Vale", "Pomba" |
| Cores e fontes | `web/src/theme.css` | tokens `--brand`, `--lime`, `--river`, `--hud-bg`… (modo claro e escuro) |
| Marca (logotipo em SVG) | `RpvMark` em `web/src/components/Scene.tsx` | serras em rede sobre o rio |
| Lugares do mundo 2D (nome, rota, ícone, posição, cores) | `web/src/lib/world.ts` | Academia → `/cursos`, Arena → `/ranking` |
| Nomes dos níveis, medalhas e missões | `server/src/lib/levels.ts`, `gamification.ts`, `quests.ts` | Semente → Lenda do Valley |

Configurações de negócio (nome exibido em e-mails e certificados, pontuação, abertura de cadastro) continuam em **Admin › Configurações**.

## Arte

Toda a arte é desenhada em código, em pixel-art, sem imagens externas nem bibliotecas de ícones:

- **Ícones** (`components/PixelIcon.tsx`): grades de 12×12 com a paleta da marca. Para criar um ícone, adicione uma entrada em `ART` (12 linhas de 12 caracteres) e use `<PixelIcon name="..." />`. O banco guarda só o nome do ícone.
- **Personagem** (`components/Avatar.tsx`): montado por camadas (pele, cabelo, rosto, roupa, calça, acessório) a partir do JSON salvo em `users.avatar`, com quadros de caminhada. Novas opções entram em `AVATAR_OPTIONS`/`AVATAR_PALETTES` e no `avatarSchema` do servidor.
- **Cenários** (`components/Scene.tsx` e `components/World.tsx`): céu conforme a hora do dia (fuso America/Sao_Paulo), serras, rio, árvores e construções.

## Fluxo do aluno

1. `/`: tela de início ("Seja bem-vindo(a) ao …"), com Novo jogo, Continuar jornada e Ver cursos.
2. `/comecar`: onboarding em quatro etapas com a guia: nome → criador de personagem → origem (município, escola, nascimento) → acesso (e-mail e senha). O rascunho fica salvo no navegador até a conta ser criada.
3. `/painel`: o mundo 2D. O personagem anda com setas/WASD ou toque, e cada construção leva a uma área da plataforma. No primeiro acesso a guia apresenta o mundo. Abaixo do mundo fica o diário de bordo (cursos em andamento, missões do dia, medalhas, avisos e eventos).
