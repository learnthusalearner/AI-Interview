import express from 'express';
import 'express-async-errors'; // catches async errors for global handler
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import { logger } from './config/logger';
import apiV1Routes from './routes/v1';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Trust the reverse proxy (Render) so rate limiting works per client IP
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: 'Too many requests from this IP'
});
app.use('/api', limiter);

const morganFormat = env.NODE_ENV === 'development' ? 'dev' : 'combined';
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message: string) => logger.http(message.trim()),
    },
  })
);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Backend is healthy' });
});

app.use('/api/v1', apiV1Routes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route Not Found' });
});

app.use(errorHandler);

export default app;
