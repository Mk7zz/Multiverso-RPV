import { Loader } from '../../components/ui';
import { download } from '../../lib/api';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import { useNotifications } from '../../lib/notifications';

const DESCRIPTIONS: Record<string, string> = {
  matriculas: 'Cada matrícula com aluno, município, escola, progresso, nota, tempo de estudo e datas.',
  cursos: 'Matrículas, concluintes, taxa de conclusão e tempo de estudo por curso.',
  municipios: 'Número de alunos e cursos concluídos por município.',
  certificados: 'Todos os certificados emitidos com código de validação.',
  feedback: 'Respostas do formulário de feedback (pré-requisito do certificado).',
  'tempo-estudo': 'Tempo de estudo diário por aluno e curso.',
  avaliacoes: 'Todas as tentativas de avaliação, notas e recuperações.',
};

export function AdminReports() {
  useDocumentTitle('Relatórios');
  const { data, error } = useApi<{ reports: { key: string; title: string }[] }>('/admin/reports');
  const { toast } = useNotifications();
  return (
    <>
      <h1>Relatórios exportáveis</h1>
      <p className="text-2">Arquivos CSV (separados por ponto e vírgula) que abrem diretamente no Excel.</p>
      <Loader data={data} error={error}>
        {(d) => (
          <div className="grid grid-2">
            {d.reports.map((r) => (
              <div key={r.key} className="card stack">
                <strong>{r.title}</strong>
                <span className="small text-2">{DESCRIPTIONS[r.key]}</span>
                <button
                  className="btn secondary"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() => download(`/admin/reports/${r.key}.csv`, `relatorio-${r.key}.csv`).catch((e) => toast((e as Error).message))}
                >
                  ⬇ Baixar CSV
                </button>
              </div>
            ))}
          </div>
        )}
      </Loader>
    </>
  );
}
