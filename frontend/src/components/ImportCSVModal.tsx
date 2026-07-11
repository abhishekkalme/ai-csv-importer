'use client'

import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { uploadCSV, processCSV, ApiError } from '@/services/api'
import type { ProcessResult, Step } from '@/types'

interface ImportCSVModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ImportCSVModal({ isOpen, onClose }: ImportCSVModalProps) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [result, setResult] = useState<ProcessResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progressMessage, setProgressMessage] = useState('')
  const fileRef = useRef<File | null>(null)

  const reset = useCallback(() => {
    setStep('upload')
    setFile(null)
    setPreviewHeaders([])
    setPreviewRows([])
    setTotalRows(0)
    setResult(null)
    setError(null)
    setErrorDetails(null)
    setUploading(false)
    setProcessing(false)
    setProgressMessage('')
    fileRef.current = null
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    setError(null)
    const f = acceptedFiles[0]
    setFile(f)
    fileRef.current = f

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (!text) {
        setError('Failed to read file')
        return
      }

      const previewResult = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        preview: 10,
      })
      setPreviewHeaders(previewResult.meta.fields || [])
      setPreviewRows(previewResult.data as Record<string, string>[])

      const fullResult = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
      })
      setTotalRows(fullResult.data.length)

      setStep('preview')
    }
    reader.onerror = () => {
      setError('Failed to read file')
      setFile(null)
      fileRef.current = null
    }
    reader.readAsText(f)
  }, [])

  const downloadTemplate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const headers = [
      'created_at', 'name', 'email', 'country_code', 'mobile_without_country_code',
      'company', 'city', 'state', 'country', 'lead_owner', 'crm_status', 'crm_note',
      'data_source', 'possession_time', 'description',
    ]
    const sampleRow = [
      '2026-07-11 10:00:00', 'John Doe', 'john@example.com', '+91', '9876543210',
      'Acme Corp', 'Mumbai', 'Maharashtra', 'India', '', 'GOOD_LEAD_FOLLOW_UP', '',
      '', '', '',
    ]
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'grow_easy_csv_template.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }, [])

  const handleExportCSV = useCallback(() => {
    if (!result || result.records.length === 0) return
    const headers = Object.keys(result.records[0])
    const rows = result.records.map((record) =>
      headers.map((h) => {
        const val = record[h] || ''
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`
        }
        return val
      }).join(',')
    )
    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `grow_easy_import_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }, [result])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.csv'] },
    multiple: false,
    disabled: uploading || processing,
  })

  const [progressValue, setProgressValue] = useState(0)

  const handleProcess = async () => {
    const currentFile = fileRef.current
    if (!currentFile) {
      setError('No file selected')
      return
    }

    setProcessing(true)
    setStep('processing')
    setProgressMessage('Uploading file...')
    setProgressValue(0)
    setError(null)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 180000)

    const patienceId = setTimeout(() => {
      setProgressMessage('Still processing... this may take a minute or two for large files.')
    }, 30000)

    try {
      const uploadResult = await uploadCSV(currentFile)
      setProgressValue(5)
      const res = await processCSV(uploadResult.filename, controller.signal, (phase, progress, message) => {
        setProgressValue(progress)
        setProgressMessage(message)
      })
      clearTimeout(patienceId)
      setProgressValue(100)
      setResult(res)
      setStep('results')
    } catch (err) {
      clearTimeout(patienceId)
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Request timed out after 3 minutes. The AI service may be overloaded. Please try again.')
        setErrorDetails(null)
      } else if (err instanceof ApiError) {
        setError(err.message)
        const parts = [`URL: ${err.url}`]
        if (err.status) parts.push(`Status: ${err.status}`)
        if (err.body) parts.push(`Response: ${err.body.slice(0, 500)}`)
        setErrorDetails(parts.join('\n'))
      } else {
        setError(err instanceof Error ? err.message : 'Processing failed')
        setErrorDetails(null)
      }
      setStep('preview')
    } finally {
      clearTimeout(timeoutId)
      clearTimeout(patienceId)
      setProcessing(false)
      setProgressMessage('')
      setProgressValue(0)
    }
  }

  if (!isOpen) return null

  const displayHeaders = previewHeaders
  const displayPreview = previewRows

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm transition-opacity dark:bg-gray-950/60">
      <div className="bg-white rounded-[24px] w-full max-w-[700px] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden max-h-[90vh] dark:bg-gray-800 dark:shadow-gray-900/50">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-4 flex justify-between items-start border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1 dark:text-gray-100">
              {step === 'upload' && 'Import Leads via CSV'}
              {step === 'preview' && 'Preview CSV Data'}
              {step === 'processing' && 'Processing with AI'}
              {step === 'results' && 'Import Results'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {step === 'upload' && 'Upload a CSV file to bulk import leads into your system.'}
              {step === 'preview' && `Review the parsed data before AI processing. ${totalRows} rows detected.`}
              {step === 'processing' && 'Our AI is intelligently mapping and extracting CRM fields...'}
              {step === 'results' && `${result?.totalImported || 0} imported, ${result?.totalSkipped || 0} skipped`}
            </p>
          </div>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-8 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl dark:bg-red-900/30 dark:border-red-800">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap break-words">{error}</p>
                {errorDetails && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-500 cursor-pointer hover:text-red-700 dark:hover:text-red-300">Technical details</summary>
                    <pre className="mt-1 text-xs text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-950/30 p-2 rounded overflow-auto max-h-32">{errorDetails}</pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="px-8 py-6 overflow-y-auto flex-1 min-h-0">

          {/* Step: Upload */}
          {step === 'upload' && (
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800/50 dark:hover:bg-gray-700/50'
              }`}
            >
              <input {...getInputProps()} />
              
              <div className="w-14 h-14 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm mb-5 dark:bg-gray-800 dark:border-gray-600">
                <svg className="w-6 h-6 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-1 dark:text-gray-100">
                Drop your CSV file here
              </h3>
              <p className="text-sm text-gray-500 mb-6 dark:text-gray-400">or click to browse files</p>

              <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 mb-6 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300">
                <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Supported file: .csv (max 5MB)</span>
              </div>

              <p className="text-[11px] text-gray-400 max-w-lg leading-relaxed px-4 dark:text-gray-500">
                Our AI automatically maps any CSV format to GrowEasy CRM fields. 
                Headers like Name, Email, Phone, Company, etc. are intelligently recognized.
              </p>

              <button onClick={downloadTemplate} className="mt-6 flex items-center space-x-2 px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-sm font-semibold transition-colors dark:bg-teal-900/30 dark:text-teal-400 dark:hover:bg-teal-900/50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download Sample CSV Template</span>
              </button>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && file && (
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-2xl shadow-sm dark:bg-gray-800 dark:border-gray-600">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center dark:bg-teal-900/30">
                    <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{file.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(1)} KB &middot; {totalRows} rows &middot; {previewHeaders.length} columns</p>
                  </div>
                </div>
                <button onClick={() => { reset() }} className="text-gray-400 hover:text-gray-600 p-2 dark:hover:text-gray-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden dark:border-gray-600">
                <div className="overflow-auto max-h-64">
                  <table className="w-full text-left border-collapse min-w-max">
                    <thead className="bg-[#fcfdfd] border-b border-gray-200 sticky top-0 dark:bg-gray-800/80 dark:border-gray-700">
                      <tr>
                        {displayHeaders.map((h, i) => (
                          <th key={i} className="py-3 px-4 text-[10px] font-bold text-gray-600 tracking-wider uppercase whitespace-nowrap dark:text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100 dark:bg-gray-800/50 dark:divide-gray-700">
                      {displayPreview.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 text-xs dark:hover:bg-gray-700/50">
                          {displayHeaders.map((h, j) => (
                            <td key={j} className="py-3 px-4 text-gray-700 max-w-[150px] truncate dark:text-gray-300" title={row[h] || ''}>
                              {row[h] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start dark:bg-blue-900/20 dark:border-blue-800">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Preview Mode</p>
                  <p className="text-sm text-blue-700 mt-1 dark:text-blue-400">
                    No AI processing has been done yet. Click &quot;Confirm &amp; Process with AI&quot; to intelligently map your CSV data to GrowEasy CRM format.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step: Processing */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-6 dark:border-teal-900 dark:border-t-teal-400" />
              <h3 className="text-lg font-bold text-gray-900 mb-2 dark:text-gray-100">AI Processing in Progress</h3>
              <p className="text-sm text-gray-500 text-center max-w-sm dark:text-gray-400">
                Our AI is mapping columns, extracting fields, and validating data.
                This may take a moment...
              </p>

              {/* Progress bar */}
              <div className="w-full max-w-xs mt-6">
                <div className="bg-gray-200 rounded-full h-2 dark:bg-gray-600">
                  <div
                    className="bg-teal-500 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(progressValue, 5)}%` }}
                  />
                </div>
                <p className="text-xs text-teal-600 mt-3 font-medium text-center dark:text-teal-400">
                  {progressMessage || 'Starting...'}
                </p>
              </div>
            </div>
          )}

          {/* Step: Results */}
          {step === 'results' && result && (
            <div className="flex flex-col space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center dark:bg-green-900/20 dark:border-green-800">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.totalImported}</p>
                  <p className="text-xs text-green-700 font-medium mt-1 dark:text-green-500">Imported</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center dark:bg-yellow-900/20 dark:border-yellow-800">
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{result.totalSkipped}</p>
                  <p className="text-xs text-yellow-700 font-medium mt-1 dark:text-yellow-500">Skipped</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center dark:bg-blue-900/20 dark:border-blue-800">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{result.totalImported + result.totalSkipped}</p>
                  <p className="text-xs text-blue-700 font-medium mt-1 dark:text-blue-500">Total</p>
                </div>
              </div>

              {result.records.length > 0 && (
                <div className="border border-gray-200 rounded-2xl overflow-hidden dark:border-gray-600">
                  <div className="overflow-auto max-h-64">
                    <table className="w-full text-left border-collapse min-w-max">
                      <thead className="bg-[#fcfdfd] border-b border-gray-200 sticky top-0 dark:bg-gray-800/80 dark:border-gray-700">
                        <tr>
                          {Object.keys(result.records[0]).map((h, i) => (
                            <th key={i} className="py-2 px-3 text-[10px] font-bold text-gray-600 tracking-wider uppercase whitespace-nowrap dark:text-gray-400">{h.replace(/_/g, ' ')}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100 dark:bg-gray-800/50 dark:divide-gray-700">
                        {result.records.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50 text-xs dark:hover:bg-gray-700/50">
                            {Object.keys(result.records[0]).map((h, j) => (
                              <td key={j} className="py-2 px-3 text-gray-700 max-w-[150px] truncate dark:text-gray-300">{row[h] || '-'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.skipped.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-2 dark:text-gray-300">Skipped Records</h4>
                  {result.skipped.slice(0, 3).map((item, i) => (
                    <div key={i} className="p-3 bg-red-50 border border-red-200 rounded-xl mb-2 dark:bg-red-900/20 dark:border-red-800">
                      <p className="text-xs font-medium text-red-700 dark:text-red-400">{item.reason}</p>
                    </div>
                  ))}
                  {result.skipped.length > 3 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">... and {result.skipped.length - 3} more</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-8 py-4 border-t border-gray-100 flex items-center gap-4 dark:border-gray-700">
          {step === 'upload' && (
            <button onClick={handleClose} className="flex-1 py-3.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-bold text-gray-700 transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
              Cancel
            </button>
          )}

          {step === 'preview' && (
            <>
              <button onClick={() => { reset() }} className="flex-1 py-3.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-bold text-gray-700 transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                Upload New File
              </button>
              <button onClick={handleProcess} className="flex-1 py-3.5 px-4 bg-orange-500 hover:bg-orange-600 rounded-xl text-sm font-bold text-white transition-colors flex justify-center dark:bg-orange-600 dark:hover:bg-orange-700">
                Confirm & Process with AI
              </button>
            </>
          )}

          {step === 'processing' && (
            <div className="flex-1 py-3.5 px-4 bg-gray-100 rounded-xl text-sm font-bold text-gray-500 text-center dark:bg-gray-700 dark:text-gray-400">
              Processing... please wait
            </div>
          )}

          {step === 'results' && (
            <>
              <button onClick={handleClose} className="py-3.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-bold text-gray-700 transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                Close
              </button>
              <button onClick={() => { reset() }} className="py-3.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-bold text-gray-700 transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                Import Another File
              </button>
              {result && result.records.length > 0 && (
                <button onClick={handleExportCSV} className="flex-1 py-3.5 px-4 bg-orange-500 hover:bg-orange-600 rounded-xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-2 dark:bg-orange-600 dark:hover:bg-orange-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export as CSV
                </button>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  )
}
