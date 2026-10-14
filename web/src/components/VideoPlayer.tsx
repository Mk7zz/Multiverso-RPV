import { PixelIcon } from './PixelIcon';

/** Player que aceita vídeo enviado (MP4/WebM), YouTube ou Vimeo. */
export function VideoPlayer({ url, onEnded }: { url: string | null; onEnded?: () => void }) {
  if (!url) {
    return (
      <div className="player">
        <div className="center" style={{ padding: 24 }}>
          <PixelIcon name="play" size={40} />
          <p style={{ margin: 0 }}>Vídeo ainda não disponível para esta aula.</p>
          <small style={{ opacity: 0.7 }}>Acompanhe o conteúdo em texto abaixo.</small>
        </div>
      </div>
    );
  }
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) {
    return (
      <div className="player">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0`}
          title="Vídeo da aula"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) {
    return (
      <div className="player">
        <iframe src={`https://player.vimeo.com/video/${vimeo[1]}`} title="Vídeo da aula" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  return (
    <div className="player">
      <video src={url} controls preload="metadata" onEnded={onEnded} controlsList="nodownload" />
    </div>
  );
}
