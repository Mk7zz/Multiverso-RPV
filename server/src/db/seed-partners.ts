import { hashPassword } from '../lib/security';
import { all, get, run, tx } from './index';

/**
 * Empresas parceiras FICTÍCIAS para a demonstração (nomes inventados, CNPJs gerados).
 * Login de demonstração da empresa: empresa@demo.multiverso.rpv / demo12345
 */

/** Gera um CNPJ com dígitos verificadores válidos a partir de 8 dígitos de raiz. */
function cnpjFrom(root: string) {
  const base = `${root}0001`;
  const dv = (s: string) => {
    const w = s.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = w.reduce((sum, x, i) => sum + Number(s[i]) * x, 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = dv(base);
  return `${base}${d1}${dv(`${base}${d1}`)}`;
}

const COMPANIES = [
  { root: '41235870', name: 'Vale Digital Sistemas', sector: 'Tecnologia da informação', size: 'pequena', municipality: 'Juiz de Fora', color: '#12a3a0', status: 'approved',
    description: 'Software de gestão para o agro e a indústria da Zona da Mata. Time remoto e presencial, foco em formar gente da região.',
    owner: { name: 'Renata Moura', email: 'empresa@demo.multiverso.rpv', job_title: 'Gente e Gestão' } },
  { root: '27310944', name: 'Laticínios Serra Verde', sector: 'Indústria de alimentos', size: 'media', municipality: 'Rio Pomba', color: '#1f7a4d', status: 'approved',
    description: 'Laticínio familiar com 40 anos de história, hoje automatizando a produção e o controle de qualidade.',
    owner: { name: 'Carlos Henrique Faria', email: 'rh.serraverde@demo.multiverso.rpv', job_title: 'Coordenador de RH' } },
  { root: '19876002', name: 'Cooperativa Mata Viva', sector: 'Agronegócio', size: 'grande', municipality: 'Ubá', color: '#e8772e', status: 'approved',
    description: 'Cooperativa de produtores rurais com programa de jovem aprendiz e trilha de inovação no campo.',
    owner: { name: 'Juliana Teixeira', email: 'pessoas.matativa@demo.multiverso.rpv', job_title: 'Analista de Pessoas' } },
  { root: '35550213', name: 'Estúdio Ladrilho', sector: 'Design e comunicação', size: 'micro', municipality: 'Cataguases', color: '#d64545', status: 'pending',
    description: 'Estúdio de design e audiovisual. Cadastro aguardando aprovação (mostra o fluxo do admin).',
    owner: { name: 'Pedro Lacerda', email: 'contato.ladrilho@demo.multiverso.rpv', job_title: 'Sócio' } },
] as const;

const JOBS = [
  { c: 0, title: 'Estágio em desenvolvimento web', type: 'estagio', modality: 'hibrido', area: 'tecnologia', courses: 2, min_level: 3,
    description: 'Apoio no desenvolvimento das telas do nosso sistema, testes e documentação. Mentoria semanal com o time.',
    requirements: 'Estar cursando ensino médio técnico ou superior. Lógica de programação básica.', benefits: 'Bolsa, vale-transporte e notebook.' },
  { c: 0, title: 'Jovem aprendiz em suporte ao cliente', type: 'jovem_aprendiz', modality: 'presencial', area: 'atendimento', courses: 1, min_level: 2,
    description: 'Atendimento aos clientes por telefone e chat, registro de chamados e acompanhamento das soluções.',
    requirements: 'Entre 14 e 24 anos, boa comunicação.', benefits: 'Salário aprendiz, vale-alimentação.' },
  { c: 1, title: 'Assistente de controle de qualidade', type: 'emprego', modality: 'presencial', area: 'industria', courses: 1, min_level: 0,
    description: 'Coleta de amostras, registro de indicadores em planilha e apoio às auditorias de qualidade.',
    requirements: 'Ensino médio completo. Planilhas básicas.', benefits: 'Plano de saúde, refeição no local.' },
  { c: 1, title: 'Estágio em análise de dados da produção', type: 'estagio', modality: 'hibrido', area: 'dados', courses: 2, min_level: 4,
    description: 'Montar painéis com os dados das linhas de produção e propor melhorias junto à engenharia.',
    requirements: 'Interesse em dados e planilhas.', benefits: 'Bolsa e vale-transporte.' },
  { c: 2, title: 'Programa Jovem do Campo', type: 'jovem_aprendiz', modality: 'presencial', area: 'agro', courses: 1, min_level: 0,
    description: 'Formação prática em gestão rural, tecnologia no campo e cooperativismo, com rodízio entre as áreas.',
    requirements: 'Entre 14 e 24 anos, morar na região de Ubá.', benefits: 'Salário aprendiz, transporte e certificado.' },
] as const;

const AREAS = ['tecnologia', 'dados', 'design', 'marketing', 'administracao', 'vendas', 'atendimento', 'industria', 'agro', 'energia'];
const HEADLINES = [
  'Quero meu primeiro estágio em tecnologia',
  'Busco oportunidade como jovem aprendiz',
  'Apaixonado(a) por dados e planilhas',
  'Curto design e criar coisas novas',
  'Procuro meu primeiro emprego na região',
  'Aprendendo programação todos os dias',
  'Quero trabalhar com inovação no campo',
];
const GOALS = ['estagio', 'jovem_aprendiz', 'emprego', 'qualquer'];

export function seedPartners(studentIds: number[], rnd: () => number) {
  if (get('SELECT id FROM companies WHERE is_demo = 1 LIMIT 1')) return 0;
  const pick = <T>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
  const courses = all<{ id: number }>('SELECT id FROM courses WHERE published = 1 ORDER BY position, id').map((c) => c.id);
  const password = hashPassword('demo12345');
  const admin = get<{ id: number }>("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1");

  tx(() => {
    const companyIds = COMPANIES.map((c, i) => {
      const id = run(
        `INSERT INTO companies (name, cnpj, sector, size, municipality, description, color, status, reviewed_by, reviewed_at, is_demo, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        c.name,
        cnpjFrom(c.root),
        c.sector,
        c.size,
        c.municipality,
        c.description,
        c.color,
        c.status,
        c.status === 'approved' ? admin?.id ?? null : null,
        c.status === 'approved' ? new Date(Date.now() - (10 - i) * 86_400_000).toISOString() : null,
        new Date(Date.now() - (14 - i) * 86_400_000).toISOString(),
      ).id;
      run(
        "INSERT INTO users (name, email, password_hash, role, company_id, job_title, municipality, is_demo) VALUES (?, ?, ?, 'company', ?, ?, ?, 1)",
        c.owner.name,
        c.owner.email,
        password,
        id,
        c.owner.job_title,
        c.municipality,
      );
      return id;
    });

    const jobIds = JOBS.map((j, i) =>
      run(
        `INSERT INTO jobs (company_id, title, type, modality, municipality, area, description, requirements, benefits, course_ids, min_level, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        companyIds[j.c],
        j.title,
        j.type,
        j.modality,
        COMPANIES[j.c].municipality,
        j.area,
        j.description,
        j.requirements,
        j.benefits,
        JSON.stringify(courses.slice(i % 2, (i % 2) + j.courses)),
        j.min_level,
        new Date(Date.now() - (8 - i) * 86_400_000).toISOString(),
      ).id,
    );

    // Cerca de 60% dos alunos de demonstração ligam a vitrine.
    const visible = studentIds.filter((_, i) => i === 0 || rnd() < 0.6);
    for (const uid of visible) {
      const areas = [...new Set([pick(AREAS), pick(AREAS)])];
      run(
        'UPDATE users SET talent_visible = 1, talent_headline = ?, talent_areas = ?, talent_goal = ?, talent_guardian_ok = 1, talent_updated_at = ? WHERE id = ?',
        pick(HEADLINES),
        JSON.stringify(areas),
        pick(GOALS),
        new Date().toISOString(),
        uid,
      );
    }

    // Candidaturas e convites para o funil não começar vazio.
    for (const uid of visible.slice(1, 14)) {
      const job = pick(jobIds);
      run("INSERT OR IGNORE INTO job_applications (job_id, user_id, status) VALUES (?, ?, ?)", job, uid, pick(['sent', 'sent', 'viewed', 'shortlisted']));
    }
    const [demoStudent] = visible;
    run(
      'INSERT INTO talent_invites (company_id, user_id, job_id, message) VALUES (?, ?, ?, ?)',
      companyIds[0],
      demoStudent,
      jobIds[0],
      'Oi! Vimos sua evolução nos cursos do Multiverso e gostamos muito. Topa uma conversa sobre o nosso estágio em desenvolvimento web?',
    );
    for (const uid of visible.slice(14, 18)) {
      run(
        "INSERT INTO talent_invites (company_id, user_id, message, status, responded_at) VALUES (?, ?, ?, 'accepted', ?)",
        companyIds[0],
        uid,
        'Gostamos da sua trajetória na plataforma. Vamos conversar?',
        new Date().toISOString(),
      );
    }
  });
  return COMPANIES.length;
}
