const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export interface UploadResponse {
  success: boolean
  filename: string
  headers: string[]
  preview: Record<string, string>[]
  totalRows: number
}

export interface ProcessResponse {
  success: boolean
  records: Record<string, string>[]
  skipped: { original_data: Record<string, string>; reason: string }[]
  totalImported: number
  totalSkipped: number
  skipSummary: { reason: string; count: number }[]
}

export interface Lead {
  id: number
  created_at: string
  name: string
  email: string
  country_code: string
  mobile_without_country_code: string
  company: string
  city: string
  state: string
  country: string
  lead_owner: string
  crm_status: string
  crm_note: string
  data_source: string
  possession_time: string
  description: string
}

export interface JobStatusResponse {
  jobId: string
  phase: string
  progress: number
  message: string
  result?: ProcessResponse
  error?: string
}

export async function uploadCSV(file: File): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('csv', file)

  const response = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to upload CSV')
  }

  return response.json()
}

export async function processCSV(
  filename: string,
  signal?: AbortSignal,
  onProgress?: (phase: string, progress: number, message: string) => void
): Promise<ProcessResponse> {
  const startRes = await fetch(`${API_BASE}/api/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename }),
    signal,
  })

  if (!startRes.ok) {
    const errorData = await startRes.json()
    throw new Error(errorData.error || 'Failed to process CSV')
  }

  const { jobId } = await startRes.json()
  onProgress?.('mapping', 0, 'AI is analyzing columns...')

  while (true) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    await new Promise((r) => setTimeout(r, 1500))

    const statusRes = await fetch(`${API_BASE}/api/process/${jobId}/status`, { signal })
    if (!statusRes.ok) throw new Error('Failed to fetch job status')

    const status: JobStatusResponse = await statusRes.json()
    onProgress?.(status.phase, status.progress, status.message)

    if (status.phase === 'complete' && status.result) return status.result
    if (status.phase === 'error') throw new Error(status.error || 'Processing failed')
  }
}

export async function fetchLeads(): Promise<Lead[]> {
  const response = await fetch(`${API_BASE}/api/leads`)

  if (!response.ok) {
    throw new Error('Failed to fetch leads')
  }

  const data = await response.json()
  return data.leads || []
}
