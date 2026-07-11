'use client'

import type { CSVData } from '@/types'

interface PreviewTableProps {
  data: CSVData
  onConfirm: () => void
  onReset: () => void
}

export default function PreviewTable({ data, onConfirm, onReset }: PreviewTableProps) {
  const { headers, preview, totalRows, filename } = data

  return (
    <div className="max-w-full mx-auto">
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">CSV Preview</h2>
            <p className="text-gray-600">
              Showing {preview.length} of {totalRows} rows from <span className="font-medium">{filename}</span>
            </p>
          </div>
          
          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            <button
              onClick={onReset}
              className="btn-secondary"
            >
              Upload New File
            </button>
            <button
              onClick={onConfirm}
              className="btn-primary"
            >
              Confirm & Process with AI
            </button>
          </div>
        </div>
        
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-blue-500 mt-0.5 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-800">
                Preview Mode
              </p>
              <p className="text-sm text-blue-700 mt-1">
                No AI processing has been done yet. Click &quot;Confirm & Process with AI&quot; to intelligently map your CSV data to GrowEasy CRM format.
              </p>
            </div>
          </div>
        </div>
        
        <div className="table-container" style={{ maxHeight: '500px' }}>
          <table className="w-full">
            <thead className="table-header">
              <tr>
                {headers.map((header, index) => (
                  <th
                    key={index}
                    className="table-cell-header whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {preview.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {headers.map((header, colIndex) => (
                    <td
                      key={colIndex}
                      className="table-cell max-w-xs truncate"
                      title={row[header] || ''}
                    >
                      {row[header] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {totalRows > preview.length && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              ... and {totalRows - preview.length} more rows will be processed
            </p>
          </div>
        )}
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onReset}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn-primary"
          >
            Confirm & Process with AI
          </button>
        </div>
      </div>
    </div>
  )
}