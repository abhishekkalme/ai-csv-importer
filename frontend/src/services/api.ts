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

export class ApiError extends Error {
  url: string
  status?: number
  body?: string

  constructor(message: string, url: string, status?: number, body?: string) {
    super(message)
    this.name = 'ApiError'
    this.url = url
    this.status = status
    this.body = body
  }
}

async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await fetch(url, options)
  } catch (err) {
    if (err instanceof ApiError) throw err
    const baseMsg = err instanceof TypeError && err.message === 'Failed to fetch'
      ? `Network error — cannot reach the server at ${url}. This usually means CORS is misconfigured or the server is down.`
      : err instanceof Error ? err.message : 'Unknown network error'
    throw new ApiError(`${baseMsg}`, url)
  }

  if (!response.ok) {
    let body = ''
    try { body = await response.text() } catch { /* ignore */ }
    const summary = body ? `HTTP ${response.status}: ${body.slice(0, 300)}` : `HTTP ${response.status} ${response.statusText}`
    throw new ApiError(summary, url, response.status, body)
  }

  return response
}

export async function uploadCSV(file: File): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('csv', file)

  const response = await apiFetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
  })

  return response.json()
}

export async function processCSV(
  filename: string,
  signal?: AbortSignal,
  onProgress?: (phase: string, progress: number, message: string) => void
): Promise<ProcessResponse> {
  const startRes = await apiFetch(`${API_BASE}/api/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename }),
    signal,
  })

  const { jobId } = await startRes.json()
  onProgress?.('mapping', 0, 'AI is analyzing columns...')

  while (true) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    await new Promise((r) => setTimeout(r, 1500))

    const statusRes = await apiFetch(`${API_BASE}/api/process/${jobId}/status`, { signal })
    const status: JobStatusResponse = await statusRes.json()
    onProgress?.(status.phase, status.progress, status.message)

    if (status.phase === 'complete' && status.result) return status.result
    if (status.phase === 'error') throw new Error(status.error || 'Processing failed')
  }
}

export async function fetchLeads(): Promise<Lead[]> {
  const response = await apiFetch(`${API_BASE}/api/leads`)
  const data = await response.json()
  return data.leads || []
}
