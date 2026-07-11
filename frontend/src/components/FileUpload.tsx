'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { uploadCSV } from '@/services/api'
import type { CSVData } from '@/types'

interface FileUploadProps {
  onUploadSuccess: (data: CSVData) => void
  onUploadError: (error: string) => void
}

export default function FileUpload({ onUploadSuccess, onUploadError }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    
    const file = acceptedFiles[0]
    setUploadedFile(file)
    setIsUploading(true)
    
    try {
      const data = await uploadCSV(file)
      onUploadSuccess(data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during upload'
      onUploadError(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }, [onUploadSuccess, onUploadError])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    multiple: false,
    disabled: isUploading,
  })

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload CSV File</h2>
          <p className="text-gray-600">
            Upload your CSV file and we'll intelligently extract CRM data using AI
          </p>
        </div>
        
        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? 'active' : ''} ${isDragReject ? 'border-red-500 bg-red-50' : ''} ${isUploading ? 'disabled' : ''}`}
        >
          <input {...getInputProps()} />
          
          {isUploading ? (
            <div className="flex flex-col items-center">
              <div className="spinner mb-4"></div>
              <p className="text-gray-600">Uploading {uploadedFile?.name}...</p>
            </div>
          ) : isDragActive ? (
            <div className="flex flex-col items-center">
              <svg
                className="w-16 h-16 text-primary-500 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-lg font-medium text-primary-600">Drop your CSV file here</p>
              <p className="text-sm text-gray-500 mt-1">Release to upload</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <svg
                className="w-16 h-16 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-lg font-medium text-gray-700">
                Drag & drop your CSV file here
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or click to select a file
              </p>
              <p className="text-xs text-gray-400 mt-4">
                Supports: Facebook Lead Export, Google Ads, Excel sheets, CRM exports, etc.
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Your CSV will be previewed before AI processing begins
          </p>
        </div>
      </div>
      
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Supported CSV Formats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            'Facebook Lead Export',
            'Google Ads Export',
            'Excel Sheets',
            'CRM Exports',
            'Sales Reports',
            'Marketing CSVs',
            'Manual Spreadsheets',
            'Any Valid CSV',
          ].map((format) => (
            <div
              key={format}
              className="bg-white rounded-lg p-3 border border-gray-200 text-center"
            >
              <p className="text-sm text-gray-700">{format}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}