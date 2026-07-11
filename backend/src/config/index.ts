import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  groqApiKey: process.env.GROQ_API_KEY || '',
  corsOptions: {
    origin: corsOrigin === '*' ? '*' : corsOrigin.split(',').map(s => s.trim()),
    methods: ['GET', 'POST'],
  },
  uploadsDir: path.resolve(__dirname, '../../uploads'),
};
