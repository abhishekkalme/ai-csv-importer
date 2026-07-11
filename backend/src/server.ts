import app from './app';
import { config } from './config';

app.listen(config.port, () => {
  const origin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  console.log(`Server running on port ${config.port}`);
  console.log(`CORS origin: ${origin}`);
});
