import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { CityWorld } from '../../components/CityWorld';
import { useDayTime } from '../../components/Scene';
import { CITY_PLACES, getPoints, sfx } from '../../lib/cidade';
import { useDocumentTitle } from '../../lib/hooks';
import type { Place } from '../../lib/world';
import { APP_NAME, FullscreenToggle, Logo, ScoreBadge, SoundToggle } from './CityHud';

const INTRO = [
  'Oi! Eu sou a Pomba e vou passear com você por Cataguases!',
  'Toque no chão para andar. Toque nos lugares, nas árvores, no rio e nas pessoas para explorar!',
  'Cada resposta certa vale estrelas. Vamos iniciar pela Praça Santa Rita?',
];

/** O mapa de Cataguases com os pontos turísticos, em tela cheia. */
export function CityMap() {
  useDocumentTitle(APP_NAME);
  const navigate = useNavigate();
  const time = useDayTime();
  const [entering, setEntering] = useState<{ x: number; y: number } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const arrive = useCallback(
    (p: Place, screen: { x: number; y: number }) => {
      if (entering) return;
      sfx('pop');
      setEntering(screen);
      timer.current = window.setTimeout(() => {
        setLeaving(true);
        navigate(p.to);
      }, 900);
    },
    [entering, navigate],
  );

  return (
    <div className="city-screen">
      <div className={`city-stage ${entering ? 'entering' : ''}`} style={entering ? { transformOrigin: `${entering.x}px ${entering.y}px` } : undefined}>
        <CityWorld places={CITY_PLACES} time={time} onArrive={arrive} introLines={INTRO} paused={leaving}>
          <div className="city-top">
            <button
              className="city-sound"
              aria-label="Voltar para o início"
              title="Início"
              onClick={() => {
                sfx('pop');
                setLeaving(true);
                navigate('/');
              }}
            >
              🏠
            </button>
            <Logo />
            <div className="city-top-right">
              <ScoreBadge points={getPoints()} />
              <SoundToggle />
              <FullscreenToggle />
            </div>
          </div>
        </CityWorld>
      </div>
      {entering && <div className="city-flash" aria-hidden />}
    </div>
  );
}
