import { Request, Response } from 'express';
import { parseCSV } from '../utils/csvParser';

export const uploadCSV = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No CSV file uploaded' });
      return;
    }

    const { headers, records } = await parseCSV(req.file.path);

    res.json({
      success: true,
      filename: req.file.filename,
      headers,
      preview: records.slice(0, 100),
      totalRows: records.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process CSV file';
    res.status(500).json({ error: message });
  }
};
