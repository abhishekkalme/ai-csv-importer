'use client'

import type { ProcessResult } from '@/types'

interface ResultsTableProps {
  data: ProcessResult
  onBack: () => void
  onReset: () => void
}

export default function ResultsTable({ data, onBack, onReset }: ResultsTableProps) {
  const { records, skipped, totalImported, totalSkipped } = data

  const dynamicHeaders = records.length > 0 ? Object.keys(records[0]) : []

  const handleExportCSV = () => {
    if (records.length === 0) return
    
    const headers = dynamicHeaders.join(',')
    const rows = records.map(record => 
      dynamicHeaders.map(header => {
        const value = record[header] || ''
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
    
    const csvContent = [headers, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `csv_import_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="max-w-full mx-auto">
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Import Results</h2>
            <p className="text-gray-600">
              {totalImported} records imported, {totalSkipped} skipped
            </p>
          </div>
          
          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            <button
              onClick={onBack}
              className="btn-secondary"
            >
              Back to Preview
            </button>
            <button
              onClick={onReset}
              className="btn-secondary"
            >
              Import Another File
            </button>
            <button
              onClick={handleExportCSV}
              className="btn-primary"
            >
              Export as CSV
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{totalImported}</p>
                <p className="text-sm text-green-700">Successfully Imported</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                <svg
                  className="w-6 h-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{totalSkipped}</p>
                <p className="text-sm text-yellow-700">Skipped Records</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{totalImported + totalSkipped}</p>
                <p className="text-sm text-blue-700">Total Records</p>
              </div>
            </div>
          </div>
        </div>
        
        {records.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Successfully Parsed Records ({records.length})
            </h3>
            <div className="table-container" style={{ maxHeight: '400px' }}>
              <table className="w-full">
                  <thead className="table-header">
                    <tr>
                      {dynamicHeaders.map((header) => (
                        <th
                          key={header}
                          className="table-cell-header whitespace-nowrap"
                        >
                          {header.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {records.map((record, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        {dynamicHeaders.map((header) => (
                          <td
                            key={header}
                            className="table-cell max-w-xs truncate"
                            title={record[header] || ''}
                          >
                            {record[header] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
              </table>
            </div>
          </div>
        )}
        
        {skipped.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Skipped Records ({skipped.length})
            </h3>
            <div className="space-y-3">
              {skipped.map((item, index) => (
                <div
                  key={index}
                  className="bg-red-50 border border-red-200 rounded-lg p-4"
                >
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-sm font-medium text-red-600">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800 mb-1">
                        {item.reason}
                      </p>
                      <p className="text-xs text-red-600">
                        Original data: {JSON.stringify(item.original_data).substring(0, 200)}...
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-8 flex justify-end space-x-3">
          <button
            onClick={onBack}
            className="btn-secondary"
          >
            Back to Preview
          </button>
          <button
            onClick={onReset}
            className="btn-primary"
          >
            Import Another File
          </button>
        </div>
      </div>
    </div>
  )
}