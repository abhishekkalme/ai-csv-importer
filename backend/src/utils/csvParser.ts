import fs from 'fs';
import { parse } from 'csv-parse';

export interface ParseResult {
  headers: string[];
  records: Record<string, string>[];
}

export const parseCSV = (filePath: string): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      reject(new Error(`File not found: ${filePath}`));
      return;
    }

    const records: Record<string, string>[] = [];
    const stream = fs.createReadStream(filePath);

    let firstChunk = true;

    stream
      .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))
      .on('data', (record: Record<string, string>) => {
        records.push(record);
      })
      .on('error', (error: Error) => reject(error))
      .on('end', () => {
        const headers = records.length > 0 ? Object.keys(records[0]) : [];
        resolve({ headers, records });
      });
  });
};
