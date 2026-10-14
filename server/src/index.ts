import { createApp } from './app';
import { config } from './config';
import { bootstrap } from './db/bootstrap';

bootstrap();

createApp().listen(config.port, () => {
  console.log(`[api] Multiverso RPV rodando em http://localhost:${config.port} (${config.isProd ? 'produção' : 'desenvolvimento'})`);
});
