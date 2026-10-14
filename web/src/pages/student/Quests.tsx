import { QuestList } from '../../components/Game';
import { Loader } from '../../components/ui';
import { fmtDate } from '../../lib/format';
import { useGame } from '../../lib/game';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import type { QuestBoard } from '../../lib/types';
import { PixelIcon } from '../../components/PixelIcon';

export function Quests() {
  useDocumentTitle('Missões');
  const { summary } = useGame();
  const { data, error, setData } = useApi<QuestBoard>('/gamification/quests', [summary?.points]);

  return (
    <div className="container page" style={{ maxWidth: 920 }}>
      <div className="page-hero">
        <span className="page-hero-icon">
          <PixelIcon name="target" size={36} />
        </span>
        <div>
          <h1>Quadro de Missões</h1>
          <p className="text-2" style={{ margin: 0 }}>
            Cumpra metas, resgate XP e abra o baú do dia. As diárias renovam à meia-noite e as semanais toda segunda-feira.
          </p>
        </div>
      </div>
      <Loader data={data} error={error}>
        {(d) => {
          const dailyDone = d.daily.filter((q) => q.code !== 'daily_chest' && q.claimed).length;
          return (
            <div className="grid grid-2">
              <section className="card quest-card">
                <div className="card-title">
                  <span>
                    <PixelIcon name="sun" size={18} /> Diárias
                  </span> <span className="pill gray">renova à meia-noite</span>
                </div>
                <div className="chest-track" aria-label={`${dailyDone} de 3 missões diárias resgatadas`}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className={`chest-step ${i < dailyDone ? 'on' : ''}`} />
                  ))}
                  <span className={`chest-box ${dailyDone >= 3 ? 'open' : ''}`}>
                    <PixelIcon name={dailyDone >= 3 ? 'coin' : 'chest'} size={30} />
                  </span>
                </div>
                <QuestList quests={d.daily} onChange={setData} />
              </section>
              <section className="card quest-card">
                <div className="card-title">
                  <span>
                    <PixelIcon name="calendar" size={18} /> Semanais
                  </span> <span className="pill gray">até {fmtDate(`${d.weekEndsOn}T12:00:00Z`)}</span>
                </div>
                <QuestList quests={d.weekly} onChange={setData} />
              </section>
            </div>
          );
        }}
      </Loader>
      <div className="card flat mt small text-2">
        <PixelIcon name="bulb" size={16} /> Aulas concluídas, exercícios, avaliações aprovadas e dias de estudo também rendem XP. Suba de nível para ir de <strong>Semente</strong> até{' '}
        <strong>Lenda do Valley</strong>.
      </div>
    </div>
  );
}
