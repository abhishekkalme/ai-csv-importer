import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { parseCSV } from '../utils/csvParser';
import { processRecords } from '../services/processService';
import { config } from '../config';
import { leadStore } from '../store';
import { jobStore } from '../jobStore';

export const processCSV = async (req: Request, res: Response): Promise<void> => {
  try {
    const filename = req.body.filename;
    if (!filename || typeof filename !== 'string') {
      res.status(400).json({ error: 'filename is required' });
      return;
    }

    const safeFilename = path.basename(filename);
    const filePath = path.join(config.uploadsDir, safeFilename);

    if (!filePath.startsWith(config.uploadsDir)) {
      res.status(400).json({ error: 'Invalid file path' });
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'CSV file not found. Please upload the file first.' });
      return;
    }

    const jobId = jobStore.create();
    res.json({ jobId });

    const skipSummary = (skipped: { reason: string }[]) => {
      const map = new Map<string, number>();
      for (const s of skipped) {
        map.set(s.reason, (map.get(s.reason) || 0) + 1);
      }
      return Array.from(map.entries()).map(([reason, count]) => ({ reason, count }));
    };

    processRecords(
      (await parseCSV(filePath)).records,
      (phase, progress, message) => {
        jobStore.update(jobId, { phase: phase as any, progress, message });
      },
    )
      .then((result) => {
        leadStore.addLeads(result.imported);
        jobStore.update(jobId, {
          phase: 'complete',
          progress: 100,
          message: 'Processing complete',
          result: {
            records: result.imported,
            skipped: result.skipped,
            totalImported: result.imported.length,
            totalSkipped: result.skipped.length,
            skipSummary: skipSummary(result.skipped),
          },
        });
        fs.unlink(filePath, () => {});
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to process records';
        jobStore.update(jobId, { phase: 'error', error: message });
      });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start processing';
    res.status(500).json({ error: message });
  }
};

export const getJobStatus = (req: Request, res: Response): void => {
  const { jobId } = req.params;
  if (!jobId || typeof jobId !== 'string') {
    res.status(400).json({ error: 'jobId is required' });
    return;
  }

  const job = jobStore.get(jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.json(job);
};
