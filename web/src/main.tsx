import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { AuthProvider } from './lib/auth';
import { GameProvider } from './lib/game';
import { NotificationProvider } from './lib/notifications';
import './theme.css';
import './styles.css';
import './game.css';
import './city.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Sem transições: a troca de página não pode esperar o mapa animado (60 quadros/s) ficar ocioso. */}
    <BrowserRouter useTransitions={false}>
      <AuthProvider>
        <NotificationProvider>
          <GameProvider>
            <App />
          </GameProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
