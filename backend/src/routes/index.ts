import { Router, Request, Response } from 'express';
import { upload } from '../middleware/upload';
import { uploadCSV } from '../controllers/uploadController';
import { processCSV, getJobStatus } from '../controllers/processController';
import { leadStore } from '../store';

const router = Router();

router.post('/upload', upload.single('csv'), uploadCSV);

router.post('/process', processCSV);

router.get('/process/:jobId/status', getJobStatus);

router.get('/leads', (_req: Request, res: Response) => {
  res.json({ leads: leadStore.getLeads() });
});

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
