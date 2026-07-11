import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { config } from './config';
import routes from './routes';

const app = express();

app.use(cors(config.corsOptions));
app.use(express.json({ limit: '50mb' }));

app.use('/api', routes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: 'File upload error: ' + err.message });
    return;
  }
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default app;
