export interface CSVData {
  headers: string[]
  preview: Record<string, string>[]
  totalRows: number
  filename: string
}

export interface ProcessResult {
  records: Record<string, string>[]
  skipped: { original_data: Record<string, string>; reason: string }[]
  totalImported: number
  totalSkipped: number
  skipSummary?: { reason: string; count: number }[]
}

export type Step = 'upload' | 'preview' | 'processing' | 'results'
