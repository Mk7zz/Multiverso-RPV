import { memo, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { ridgePath } from '../../components/CityWorld';
import { useTypewriter } from '../../components/Dialogue';
import { ZicoPixels, ZicoPortrait, type ZicoFrame } from '../../components/Mestres';
import { PixelIcon } from '../../components/PixelIcon';
import { useDayTime, type DayTime } from '../../components/Scene';
import { PlaceArt } from '../../components/World';
import { addPoints, getPoints, markSeen, MASTER_PLACES, nextQuestion, sfx, shuffle, speak, type Option } from '../../lib/cidade';
import { seeded } from '../../lib/pixel';
import type { Place } from '../../lib/world';
import { ScoreBadge, SoundToggle, useCityTitle } from './CityHud';
import { Confetti } from './PlaceVisit';

/*
 * Casa de um Mestre do Saber: ele aparece grande na frente de casa, conversa com a criança,
 * faz uma pergunta curiosa e, acertando ou errando, completa a resposta com o que ele sabe.
 */

type Stage = 'intro' | 'ask' | 'right' | 'wrong';
type Choice = Option & { right: boolean };

export function MestreVisit() {
  const { id = '' } = useParams();
  const place = MASTER_PLACES[id];
  if (!place?.master) return <Navigate to="/mapa" replace />;
  return <Visit key={id} place={place} />;
}

function Visit({ place }: { place: Place }) {
  const master = place.master!;
  useCityTitle(place.label);
  const time = useDayTime();
  const [stage, setStage] = useState<Stage>('intro');
  const [line, setLine] = useState(0);
  const [question, setQuestion] = useState(() => nextQuestion(place.id));
  const choices = useMemo<Choice[]>(() => (question ? shuffle(question.options.map((o, i) => ({ ...o, right: i === 0 }))) : []), [question]);
  const [earned, setEarned] = useState(0);
  const [points, setPoints] = useState(getPoints);
  const [ready, setReady] = useState(false);

  const right = question?.options[0];
  const say =
    stage === 'intro' ? master.intro[line] : stage === 'ask' ? (question?.hook ?? question?.text ?? '') : stage === 'right' ? 'Isso mesmo! Você sabe das coisas!' : 'Quase! Mas eu te conto...';
  const { shown, done, finish } = useTypewriter(ready ? say : '', 28);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1100);
    return () => {
      clearTimeout(t);
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    if (!ready || !question) return;
    if (stage === 'intro' || stage === 'ask') speak(stage === 'ask' ? `${say} ${question.text}` : say);
    else if (stage === 'right') speak(`Isso mesmo! Você ganhou ${earned} estrelas! ${question.fact}`);
    else speak(`Quase! A resposta certa é: ${right?.text}. ${question.fact}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, stage, line, question]);

  useEffect(() => {
    if (stage === 'ask' && question) markSeen(place.id, question.id);
  }, [stage, question, place.id]);

  // Animação do Seu Zico: acena enquanto fala e pisca de vez em quando.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 160);
    return () => clearInterval(id);
  }, []);
  const talking = ready && !done;
  const frame: ZicoFrame = talking && stage === 'intro' ? (tick % 4 < 2 ? 'wave' : 'stand') : tick % 22 === 0 ? 'blink' : 'stand';
  const mood = stage === 'right' ? 'happy' : stage === 'wrong' ? 'think' : talking ? 'talk' : '';

  if (!question || !right) return <Navigate to="/mapa" replace />;

  const nextLine = () => {
    if (!done) return finish();
    sfx('pop');
    if (line < master.intro.length - 1) setLine(line + 1);
    else setStage('ask');
  };

  const pick = (c: Choice) => {
    if (stage !== 'ask') return;
    if (c.right) {
      setEarned(10);
      setPoints(addPoints(10));
      setStage('right');
      sfx('ok');
    } else {
      setEarned(0);
      setStage('wrong');
      sfx('oops');
    }
  };

  const another = () => {
    sfx('pop');
    setQuestion(nextQuestion(place.id, question.id));
    setStage('ask');
  };

  return (
    <div className={`visit mz time-${time}`}>
      <div className="visit-scene">
        <MestreScene place={place} time={time} />
      </div>

      <header className="visit-top">
        <Link to="/mapa" className="visit-back" onClick={() => sfx('pop')}>
          ‹ Mapa
        </Link>
        <h1 className="visit-title">
          <PixelIcon name={place.icon} size={22} /> {place.label}
        </h1>
        <div className="visit-hud">
          <ScoreBadge points={points} />
          <SoundToggle />
        </div>
      </header>

      <button className={`mz-zico ${mood}`} onClick={() => (sfx('pop'), speak(stage === 'ask' ? question.text : say))} aria-label={`${master.name}: ouvir de novo`}>
        <span className="mz-glow" aria-hidden />
        <svg viewBox="0 0 16 24" shapeRendering="crispEdges" aria-hidden>
          <ZicoPixels frame={frame} />
        </svg>
      </button>

      {ready && stage !== 'intro' && (
        <div className="mz-bubble" key={`${stage}-${question.id}`} onClick={finish}>
          <span className="mz-name">{master.name}</span>
          <p>
            {shown}
            {!done && <span className="caret" aria-hidden />}
          </p>
        </div>
      )}

      {ready && stage === 'intro' && (
        <section className="quiz mz-talk" aria-live="polite" onClick={nextLine}>
          <div className="mz-talk-head">
            <span className="mz-tag">
              {master.name} · Mestre do Saber
            </span>
          </div>
          <p className="mz-talk-text">
            {shown}
            {!done && <span className="caret" aria-hidden />}
          </p>
          <div className="mz-talk-actions">
            <button className={`kid-btn ${line === master.intro.length - 1 ? 'mz-go' : ''}`} onClick={(e) => (e.stopPropagation(), nextLine())} autoFocus>
              {line < master.intro.length - 1 ? 'Próximo ▶' : 'Quero descobrir! 🔍'}
            </button>
          </div>
        </section>
      )}

      {stage === 'ask' && (
        <section className="quiz" aria-live="polite" key={question.id}>
          <div className="quiz-head">
            <span className="quiz-portrait mz-portrait">
              <ZicoPortrait size={48} />
            </span>
            <p className="quiz-q">{question.text}</p>
            <button className="quiz-listen" onClick={() => speak(question.text)} aria-label="Ouvir a pergunta" title="Ouvir a pergunta">
              🔊
            </button>
          </div>
          <div className="quiz-options">
            {choices.map((c, i) => (
              <button key={c.text} className="quiz-opt" style={{ animationDelay: `${0.1 + i * 0.12}s` }} onClick={() => pick(c)}>
                <span className="quiz-emoji" aria-hidden>
                  {c.emoji}
                </span>
                <span>{c.text}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {(stage === 'right' || stage === 'wrong') && (
        <div className="kid-modal-backdrop">
          {stage === 'right' && <Confetti />}
          <div className={`kid-modal mz-modal ${stage === 'right' ? 'win' : 'oops'}`} role="alertdialog" aria-label={stage === 'right' ? 'Você acertou' : 'Quase'}>
            <div className={`mz-modal-zico ${stage === 'right' ? 'happy' : 'think'}`} aria-hidden>
              <svg viewBox="0 0 16 24" shapeRendering="crispEdges">
                <ZicoPixels frame={stage === 'right' ? (tick % 4 < 2 ? 'wave' : 'stand') : tick % 18 === 0 ? 'blink' : 'stand'} />
              </svg>
            </div>
            {stage === 'right' ? (
              <>
                <h2>Acertou!</h2>
                <p className="win-earned">
                  +{earned} <PixelIcon name="star" size={26} />
                </p>
                <p className="win-total">Você já tem {points} estrelas!</p>
              </>
            ) : (
              <>
                <h2>Quase! 💪</h2>
                <p>A resposta certa é:</p>
                <p className="mz-answer">
                  <span aria-hidden>{right.emoji}</span> {right.text}
                </p>
              </>
            )}
            <div className="win-fact mz-fact">
              <strong>{master.name} conta:</strong>
              <p>{question.fact}</p>
            </div>
            <div className="kid-modal-actions">
              <button className="kid-btn" onClick={another} autoFocus>
                Outra pergunta ▶
              </button>
              <Link className="kid-btn secondary" to="/mapa" onClick={() => sfx('pop')}>
                🗺️ Voltar ao mapa
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Cenário: a frente da casinha, com quintal, cerca e flores ---- */

const VW = 240;
const VH = 90;
const GROUND = 66;
/** Porta da casinha (fica um pouco à direita: o Seu Zico aparece à esquerda). */
const HX = 140;
const SKY: Record<DayTime, [string, string]> = { day: ['#5fb3e8', '#d6f1f6'], dusk: ['#d9739a', '#ffcf8a'], night: ['#0b1730', '#24405a'] };

const MestreScene = memo(function MestreScene({ place, time }: { place: Place; time: DayTime }) {
  const night = time === 'night';
  const sc = useMemo(() => {
    const rand = seeded(91);
    return {
      far: ridgePath(54, [[-10, 30], [40, 24], [92, 32], [140, 22], [196, 28], [250, 24]], -10, VW + 10, GROUND),
      near: ridgePath(60, [[10, 44], [70, 40], [128, 46], [180, 40], [236, 44]], -10, VW + 10, GROUND),
      patches: Array.from({ length: 70 }, () => ({ x: Math.round(rand() * VW), y: GROUND + 2 + Math.round(rand() * (VH - GROUND)), w: 2 + Math.round(rand() * 3), c: rand() > 0.5 ? '#6fae3c' : '#8ccb52' })),
      flowers: Array.from({ length: 38 }, () => ({ x: Math.round(rand() * VW), y: GROUND + 4 + Math.round(rand() * (VH - GROUND - 6)), c: ['#f2b705', '#ffffff', '#ec6a8c', '#b48ae0'][Math.floor(rand() * 4)], dur: 2 + rand() * 2.5, delay: -rand() * 4 })).filter((f) => Math.abs(f.x - HX) > 14),
      stars: Array.from({ length: 30 }, () => ({ x: Math.round(rand() * VW), y: Math.round(rand() * 30), dur: 1.4 + rand() * 3, delay: -rand() * 4 })),
    };
  }, []);
  const house: Place = { ...place, x: HX, y: GROUND + 2 };
  // Em pé (celular), a câmera centraliza na casinha; deitado, mostra o quintal inteiro.
  const [portrait, setPortrait] = useState(() => window.matchMedia('(orientation: portrait)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const f = () => setPortrait(mq.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);
  return (
    <svg className="visit-art" viewBox={portrait ? `${HX - 60} 0 120 ${VH}` : `0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden>
      <defs>
        <linearGradient id="mz-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={SKY[time][0]} />
          <stop offset="1" stopColor={SKY[time][1]} />
        </linearGradient>
      </defs>
      <rect width={VW} height={GROUND + 2} fill="url(#mz-sky)" />
      {night &&
        sc.stars.map((s, i) => <rect key={i} className="cw-star" x={s.x} y={s.y} width={1} height={1} fill="#e2f6f5" style={{ animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }} />)}
      {night ? (
        <g fill="#f4f1de">
          <rect x={20} y={8} width={8} height={8} />
          <rect x={19} y={9} width={10} height={6} />
        </g>
      ) : (
        <g fill={time === 'dusk' ? '#f6a85a' : '#ffe27a'}>
          <circle cx={24} cy={12} r={9} opacity={0.3} />
          <rect x={20} y={8} width={8} height={8} />
          <rect x={19} y={9} width={10} height={6} />
        </g>
      )}
      {[
        [10, 14, 22, 70],
        [80, 8, 30, 95],
        [160, 18, 18, 60],
        [210, 10, 26, 80],
      ].map(([x, y, w, dur], i) => (
        <g key={i} className="mz-cloud" style={{ animationDuration: `${dur}s`, animationDelay: `${-i * 17}s` } as CSSProperties} fill={night ? '#3a5068' : time === 'dusk' ? '#ffe3d6' : '#ffffff'} opacity={night ? 0.5 : 0.9}>
          <rect x={x} y={y} width={w} height={4} />
          <rect x={x + w * 0.2} y={y - 3} width={w * 0.45} height={3} />
        </g>
      ))}
      <path d={sc.far} fill={night ? '#26503f' : time === 'dusk' ? '#9c8fa8' : '#a9d67a'} />
      <path d={sc.near} fill={night ? '#1a4431' : time === 'dusk' ? '#5f7a5a' : '#3aa655'} />
      <rect y={GROUND} width={VW} height={VH - GROUND} fill="#7dbb45" />
      <rect y={GROUND} width={VW} height={1} fill="#5e9a35" />
      {sc.patches.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={p.w} height={1} fill={p.c} />
      ))}
      {/* Caminho de terra até a porta */}
      <path d={`M${house.x - 5} ${GROUND + 2} H${house.x + 5} L${house.x + 16} ${VH} H${house.x - 16} Z`} fill="#c9b27a" />
      <path d={`M${house.x - 4} ${GROUND + 2} H${house.x + 4} L${house.x + 14} ${VH} H${house.x - 14} Z`} fill="#e3cf9a" />
      {/* Cerca de madeira */}
      {[...Array.from({ length: 15 }, (_, i) => 4 + i * 7), ...Array.from({ length: 9 }, (_, i) => HX + 41 + i * 7)].map((x) => (
        <g key={x}>
          <rect x={x - 1} y={GROUND - 9} width={4} height={10} fill="#5c3a1c" />
          <rect x={x} y={GROUND - 8} width={2} height={9} fill="#a0703e" />
        </g>
      ))}
      <rect x={2} y={GROUND - 6} width={104} height={1} fill="#7a4a25" />
      <rect x={2} y={GROUND - 3} width={104} height={1} fill="#7a4a25" />
      <rect x={HX + 39} y={GROUND - 6} width={VW - HX - 39} height={1} fill="#7a4a25" />
      <rect x={HX + 39} y={GROUND - 3} width={VW - HX - 39} height={1} fill="#7a4a25" />
      {/* A casinha, maior e em destaque */}
      <g transform={`translate(${house.x} ${house.y}) scale(1.45) translate(${-house.x} ${-house.y})`}>
        <ellipse cx={house.x + 2} cy={house.y} rx={26} ry={2.5} fill="#000" opacity={0.15} />
        <PlaceArt p={house} night={night} />
      </g>
      {/* Cadeira de balanço na varanda */}
      <g>
        <rect x={HX + 31} y={GROUND - 9} width={1} height={10} fill="#5c3a1c" />
        <rect x={HX + 31} y={GROUND - 4} width={7} height={2} fill="#8a5a2b" />
        <rect x={HX + 37} y={GROUND - 3} width={1} height={4} fill="#5c3a1c" />
        <rect x={HX + 30} y={GROUND + 1} width={9} height={1} fill="#5c3a1c" />
      </g>
      {sc.flowers.map((f, i) => (
        <g key={i} className="cw-sway" style={{ animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s`, '--a': '12deg' } as CSSProperties}>
          <rect x={f.x} y={f.y - 2} width={1} height={2} fill="#3a8a35" />
          <rect x={f.x - 1} y={f.y - 3} width={3} height={1} fill={f.c} />
          <rect x={f.x} y={f.y - 4} width={1} height={3} fill={f.c} />
          <rect x={f.x} y={f.y - 3} width={1} height={1} fill="#f2b705" />
        </g>
      ))}
      {night && <rect width={VW} height={VH} fill="#0d1b2e" opacity={0.28} />}
    </svg>
  );
});
