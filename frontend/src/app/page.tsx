'use client'

import { useState } from 'react'
import ImportCSVModal from '@/components/ImportCSVModal'

export default function LeadSourcesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenModal = () => setIsModalOpen(true)
  const handleCloseModal = () => setIsModalOpen(false)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-8 px-10 pb-20 dark:bg-gray-900">
      
      {/* Header section */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 dark:text-gray-100">Lead Sources</h1>
        <p className="text-gray-500 font-medium dark:text-gray-400">Import and manage leads from CSV files.</p>
      </div>

      {/* Import CSV Card */}
      <button 
        onClick={handleOpenModal}
        className="flex items-center p-6 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer text-left group max-w-lg dark:bg-gray-800 dark:border-gray-700 dark:hover:shadow-gray-900/30"
      >
        <div className="w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center mr-5 group-hover:bg-teal-100 transition-colors dark:bg-teal-900/30 dark:group-hover:bg-teal-900/50">
          <svg className="w-6 h-6 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-1 dark:text-gray-100">Import Leads via CSV</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Upload a CSV file to bulk import leads into your system.</p>
        </div>
      </button>

      <ImportCSVModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  )
}
