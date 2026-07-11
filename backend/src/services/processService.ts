import { mapColumns, extractFields } from './geminiService';

export interface ProcessResult {
  imported: Record<string, string>[];
  skipped: { original_data: Record<string, string>; reason: string }[];
}

export type ProgressCallback = (phase: string, progress: number, message: string) => void;

const hasValidEmail = (value: string): boolean => {
  const v = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
};

const hasValidPhone = (value: string): boolean => {
  const v = value.trim();
  const digits = v.replace(/\D/g, '');
  const isDateLike = /^\d{4}[\s\-/]\d{2}[\s\-/]\d{2}/.test(v);
  return digits.length >= 7 && digits.length <= 15 && !isDateLike;
};

function findEmailOrPhone(record: Record<string, string>): { email: string; phone: string } {
  let email = '';
  let phone = '';
  for (const val of Object.values(record)) {
    const v = val.trim();
    if (!email && hasValidEmail(v)) email = v;
    if (!phone && hasValidPhone(v)) phone = v;
    if (email && phone) break;
  }
  return { email, phone };
}

function hasContactInfo(record: Record<string, string>): boolean {
  const { email, phone } = findEmailOrPhone(record);
  return !!email || !!phone;
}

export async function processRecords(
  records: Record<string, string>[],
  onProgress?: ProgressCallback,
): Promise<ProcessResult> {
  if (records.length === 0) {
    return { imported: [], skipped: [] };
  }

  const headers = Object.keys(records[0]);

  onProgress?.('mapping', 10, 'AI is analyzing column headers...');

  const { mappings } = await mapColumns(headers, records);

  onProgress?.('mapping', 50, 'Column mapping complete, extracting CRM fields...');

  const imported: Record<string, string>[] = [];
  const skipped: { original_data: Record<string, string>; reason: string }[] = [];

  const BATCH_SIZE = 50;

  for (let start = 0; start < records.length; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE, records.length);
    const batch = records.slice(start, end);

    const extracted = extractFields(batch, mappings);

    for (let i = 0; i < extracted.length; i++) {
      const ext = extracted[i];
      const original = batch[i];
      const email = ext.email || '';
      const phone = ext.mobile_without_country_code || '';

      if (email || phone) {
        imported.push(ext);
      } else {
        const hasAnyContact = hasContactInfo(original);
        if (hasAnyContact) {
          imported.push(ext);
        } else {
          skipped.push({
            original_data: original,
            reason: 'No email or mobile number found',
          });
        }
      }
    }

    const pct = Math.round(50 + (end / records.length) * 40);
    onProgress?.('extracting', Math.min(pct, 90), `Processed ${end} of ${records.length} rows...`);
  }

  onProgress?.('complete', 100, 'Processing complete');

  return { imported, skipped };
}
