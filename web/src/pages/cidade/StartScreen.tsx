import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { CityWorld } from '../../components/CityWorld';
import { useDayTime } from '../../components/Scene';
import { CITY_PLACES, sfx } from '../../lib/cidade';
import { useDocumentTitle } from '../../lib/hooks';
import { APP_NAME, enterFullscreenOnTouch } from './CityHud';

/** Tela de abertura: a cidade viva ao fundo, o título em pixel (como o do Multiverso) e o botão Começar. */
export function StartScreen() {
  useDocumentTitle('');
  const navigate = useNavigate();
  const time = useDayTime();
  const [leaving, setLeaving] = useState(false);

  const play = () => {
    enterFullscreenOnTouch();
    setLeaving(true);
    navigate('/mapa');
    setTimeout(() => sfx('ok'), 0);
  };

  useEffect(() => {
    document.title = APP_NAME;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) play();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="start-screen">
      <CityWorld places={CITY_PLACES} time={time} demo paused={leaving} />
      <div className="start-shade" aria-hidden />
      <main className="start-center">
        <p className="title-welcome">Seja bem-vindo(a) à</p>
        <h1 className="title-logo start-title" aria-label={APP_NAME}>
          {/* Palavra por palavra: em telas estreitas o título quebra entre elas, nunca no meio. */}
          {APP_NAME.split(' ').map((word, w, words) => {
            const start = words.slice(0, w).join(' ').length + (w ? 1 : 0);
            return (
              <span key={w} className="start-word">
                {word.split('').map((ch, i) => (
                  <span key={i} style={{ animationDelay: `${(start + i) * 0.06}s` }}>
                    {ch}
                  </span>
                ))}
              </span>
            );
          })}
        </h1>
        <button className="start-play" onClick={play} autoFocus>
          Começar
        </button>
      </main>
    </div>
  );
}
