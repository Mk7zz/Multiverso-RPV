import { Link } from 'react-router';
import { Empty } from '../../components/ui';

export function NotFound() {
  return (
    <div className="container page">
      <Empty icon="portal" title="Página não encontrada neste multiverso">
        <Link to="/" className="btn">
          Voltar ao início
        </Link>
      </Empty>
    </div>
  );
}
