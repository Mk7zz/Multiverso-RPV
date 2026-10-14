import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { BarList, ColumnChart } from '../../components/Charts';
import { Spinner, StatCard } from '../../components/ui';
import { download, streamUrl } from '../../lib/api';
import { fmtDuration, fmtNum, fmtPct } from '../../lib/format';
import { useDocumentTitle } from '../../lib/hooks';

export interface Metrics {
  generatedAt: string;
  windows: { activeDays: number; abandonDays: number };
  totals: {
    students: number;
    activeStudents: number;
    activeToday: number;
    onlineNow: number;
    courses: number;
    enrollments: number;
    completed: number;
    abandoned: number;
    certificates: number;
    newStudents7d: number;
  };
  rates: { completion: number; abandonment: number; active: number };
  study: { avgSecondsPerStudent: number; totalSeconds: number };
  topCourses: { id: number; title: string; enrollments: number; completed: number; study_seconds: number; learners_7d: number; completionRate: number }[];
  municipalities: { municipality: string; students: number; completions: number }[];
  daily: { day: string; activeStudents: number; studyMinutes: number }[];
  feedback: { avg: number | null; count: number; nps: number | null };
}

/** Dashboard em tempo real (SSE): atualiza a cada 10s e a cada atividade relevante. */
export function AdminOverview() {
  useDocumentTitle('Dashboard');
  const [m, setM] = useState<Metrics | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const es = new EventSource(streamUrl('/admin/analytics/stream'));
    es.addEventListener('metrics', (e) => setM(JSON.parse((e as MessageEvent).data)));
    es.addEventListener('activity', () => {
      /* o próximo pulso de métricas já reflete a atividade */
    });
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    return () => es.close();
  }, []);

  if (!m) return <Spinner />;
  const dayLabel = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

  return (
    <>
      <div className="section-head">
        <div>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <span className="muted small row" style={{ gap: 6 }}>
            {live ? <span className="live-dot" /> : '○'} {live ? 'Ao vivo' : 'Reconectando…'} · atualizado às{' '}
            {new Date(m.generatedAt).toLocaleTimeString('pt-BR')}
          </span>
        </div>
        <div className="row">
          <button className="btn secondary" onClick={() => download('/admin/reports/cursos.csv', 'relatorio-cursos.csv')}>
            Exportar indicadores
          </button>
          <Link className="btn" to="/admin/relatorios">
            Todos os relatórios
          </Link>
        </div>
      </div>

      <div className="grid grid-4">
        <StatCard
          label={`Alunos ativos (${m.windows.activeDays} dias)`}
          value={fmtNum(m.totals.activeStudents)}
          sub={`${fmtPct(m.rates.active)} de ${fmtNum(m.totals.students)} alunos · ${m.totals.onlineNow} online agora`}
          icon="users"
        />
        <StatCard label="Taxa de conclusão" value={fmtPct(m.rates.completion)} sub={`${fmtNum(m.totals.completed)} de ${fmtNum(m.totals.enrollments)} matrículas`} icon="gradcap" />
        <StatCard
          label="Taxa de abandono"
          value={fmtPct(m.rates.abandonment)}
          sub={`${fmtNum(m.totals.abandoned)} sem acesso há ${m.windows.abandonDays}+ dias`}
          icon="warning"
        />
        <StatCard label="Tempo médio de estudo" value={fmtDuration(m.study.avgSecondsPerStudent)} sub={`por aluno · total ${fmtDuration(m.study.totalSeconds)}`} icon="clock" />
        <StatCard label="Estudando hoje" value={fmtNum(m.totals.activeToday)} icon="books" />
        <StatCard label="Novos alunos (7 dias)" value={fmtNum(m.totals.newStudents7d)} icon="star" />
        <StatCard label="Certificados emitidos" value={fmtNum(m.totals.certificates)} icon="scroll" />
        <StatCard
          label="Satisfação (feedback)"
          value={m.feedback.avg != null ? `${m.feedback.avg.toLocaleString('pt-BR')}/5` : '—'}
          sub={`${m.feedback.count} respostas${m.feedback.nps != null ? ` · NPS ${m.feedback.nps}` : ''}`}
          icon="heart"
        />
      </div>

      <div className="grid grid-2 section">
        <div className="card">
          <div className="card-title">Alunos ativos por dia (últimos 14 dias)</div>
          <ColumnChart data={m.daily.map((d) => ({ label: dayLabel(d.day), value: d.activeStudents, title: `${dayLabel(d.day)}: alunos ativos` }))} />
        </div>
        <div className="card">
          <div className="card-title">Minutos estudados por dia (últimos 14 dias)</div>
          <ColumnChart data={m.daily.map((d) => ({ label: dayLabel(d.day), value: d.studyMinutes, title: `${dayLabel(d.day)}: minutos` }))} />
        </div>
        <div className="card">
          <div className="card-title">Cursos mais acessados (matrículas)</div>
          <BarList data={m.topCourses.map((c) => ({ label: c.title, value: c.enrollments }))} />
        </div>
        <div className="card">
          <div className="card-title">Municípios com maior participação (alunos)</div>
          <BarList data={m.municipalities.map((x) => ({ label: x.municipality, value: x.students }))} limit={12} />
        </div>
      </div>

      <div className="card pad-0 section table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Curso</th>
              <th className="num">Matrículas</th>
              <th className="num">Concluintes</th>
              <th className="num">Taxa de conclusão</th>
              <th className="num">Ativos ({m.windows.activeDays}d)</th>
              <th className="num">Tempo de estudo</th>
            </tr>
          </thead>
          <tbody>
            {m.topCourses.map((c) => (
              <tr key={c.id}>
                <td>{c.title}</td>
                <td className="num">{fmtNum(c.enrollments)}</td>
                <td className="num">{fmtNum(c.completed)}</td>
                <td className="num">{fmtPct(c.completionRate)}</td>
                <td className="num">{fmtNum(c.learners_7d)}</td>
                <td className="num">{fmtDuration(c.study_seconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
