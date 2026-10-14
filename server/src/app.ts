import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { config } from './config';
import { errorHandler, notFound } from './lib/http';
import { authenticate } from './middleware/auth';
import { adminRouter } from './routes/admin';
import { assessmentsRouter } from './routes/assessments';
import { authRouter } from './routes/auth';
import { catalogRouter } from './routes/catalog';
import { certificatesRouter } from './routes/certificates';
import { communicationRouter } from './routes/communication';
import { companyRouter } from './routes/company';
import { connectionsRouter } from './routes/connections';
import { gamificationRouter } from './routes/gamification';
import { learningRouter } from './routes/learning';
import { opportunitiesRouter } from './routes/opportunities';
import { partnersRouter } from './routes/partners';
import { profileRouter } from './routes/profile';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));

  // Vídeos e materiais enviados (express.static suporta Range, necessário para avançar no vídeo).
  app.use('/uploads', express.static(config.uploadsDir, { maxAge: '7d' }));

  const api = express.Router();
  api.use(authenticate);
  api.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  api.use('/auth', authRouter);
  api.use('/catalog', catalogRouter);
  api.use('/learning', learningRouter);
  api.use('/assessments', assessmentsRouter);
  api.use('/certificates', certificatesRouter);
  api.use('/profile', profileRouter);
  api.use('/communication', communicationRouter);
  api.use('/connections', connectionsRouter);
  api.use('/gamification', gamificationRouter);
  api.use('/partners', partnersRouter);
  api.use('/company', companyRouter);
  api.use('/opportunities', opportunitiesRouter);
  api.use('/admin', adminRouter);
  api.use(() => {
    throw notFound('Rota não encontrada');
  });
  app.use('/api', api);

  // Em produção, a API também serve o frontend compilado (web/dist).
  if (fs.existsSync(config.webDist)) {
    app.use(express.static(config.webDist, { index: false, maxAge: '1h' }));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(config.webDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
