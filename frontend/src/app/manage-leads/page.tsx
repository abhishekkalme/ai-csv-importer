'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { fetchLeads } from '@/services/api'
import type { Lead } from '@/services/api'

const ROW_HEIGHT = 53

export default function ManageLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    fetchLeads()
      .then(setLeads)
      .catch(() => setLeads([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = leads.filter((lead) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      lead.name.toLowerCase().includes(q) ||
      lead.email.toLowerCase().includes(q) ||
      lead.mobile_without_country_code.includes(q)
    )
  })

  const tableContainerRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: useCallback(() => tableContainerRef.current, []),
    estimateSize: useCallback(() => ROW_HEIGHT, []),
    overscan: 10,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0
  const paddingBottom = virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0

  const totalImported = leads.length

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-8 px-10 pb-20 dark:bg-gray-900">
      
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 dark:text-gray-100">Manage Your Leads</h1>
        <p className="text-gray-500 font-medium dark:text-gray-400">Monitor lead status, assign tasks, and close deals faster.</p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin dark:border-teal-900 dark:border-t-teal-400" />
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col flex-1 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Your Leads</h2>
          </div>
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4 dark:bg-gray-700">
                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1 dark:text-gray-100">No leads yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Import a CSV file to add leads to your system.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col flex-1 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
          
          <div className="p-5 border-b border-gray-200 flex items-center justify-between dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Your Leads ({totalImported})</h2>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or phone..." 
                  className="pl-4 pr-12 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm w-72 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-500"
                />
                <div className="absolute right-0 top-0 bottom-0 bg-teal-700 text-white w-10 flex items-center justify-center rounded-r-xl pointer-events-none dark:bg-teal-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div ref={tableContainerRef} className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse min-w-max">
              <thead className="bg-white border-b border-gray-200 sticky top-0 z-10 dark:bg-gray-800 dark:border-gray-700">
                <tr>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-900 tracking-wider dark:text-gray-100">LEAD NAME</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-900 tracking-wider dark:text-gray-100">EMAIL</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-900 tracking-wider dark:text-gray-100">CONTACT</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-900 tracking-wider dark:text-gray-100">DATE CREATED</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-900 tracking-wider dark:text-gray-100">COMPANY</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-900 tracking-wider dark:text-gray-100">STATUS</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-900 tracking-wider dark:text-gray-100">CITY</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-900 tracking-wider dark:text-gray-100">SOURCE</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-900 tracking-wider dark:text-gray-100">LEAD OWNER</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-900 tracking-wider dark:text-gray-100">NOTES</th>
                </tr>
              </thead>
              <tbody>
                {paddingTop > 0 && (
                  <tr>
                    <td style={{ height: paddingTop }} colSpan={10} />
                  </tr>
                )}
                {virtualItems.map((virtualRow) => {
                  const lead = filtered[virtualRow.index]
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50 text-sm dark:hover:bg-gray-700/50" style={{ height: ROW_HEIGHT }}>
                      <td className="py-4 px-6 font-bold text-gray-900 dark:text-gray-100">{lead.name || '-'}</td>
                      <td className="py-4 px-6 text-gray-600 font-medium dark:text-gray-300">{lead.email || '-'}</td>
                      <td className="py-4 px-6 text-gray-600 font-medium dark:text-gray-300">
                        {lead.country_code}{lead.mobile_without_country_code || '-'}
                      </td>
                      <td className="py-4 px-6 text-gray-500 dark:text-gray-400">{lead.created_at || '-'}</td>
                      <td className="py-4 px-6 text-gray-900 font-medium dark:text-gray-100">{lead.company || '-'}</td>
                      <td className="py-4 px-6">
                        <StatusBadge status={lead.crm_status} />
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">{lead.city || '-'}</td>
                      <td className="py-4 px-6 text-gray-500 text-xs dark:text-gray-400">{lead.data_source?.replace(/_/g, ' ') || '-'}</td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">{lead.lead_owner || '-'}</td>
                      <td className="py-4 px-6 text-gray-400 text-xs max-w-[200px] truncate dark:text-gray-500" title={lead.crm_note || ''}>{lead.crm_note || '-'}</td>
                    </tr>
                  )
                })}
                {paddingBottom > 0 && (
                  <tr>
                    <td style={{ height: paddingBottom }} colSpan={10} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No leads match your search.
            </div>
          )}

        </div>
      )}

    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'SALE_DONE') {
    return (
      <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 font-bold rounded-lg text-xs tracking-wide dark:bg-blue-900/30 dark:text-blue-400">
        Sale Done
      </span>
    )
  }
  if (status === 'DID_NOT_CONNECT') {
    return (
      <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 font-bold rounded-lg text-xs tracking-wide dark:bg-gray-700 dark:text-gray-400">
        Not Connected
      </span>
    )
  }
  if (status === 'GOOD_LEAD_FOLLOW_UP') {
    return (
      <span className="inline-block px-3 py-1 bg-green-50 text-green-600 font-bold rounded-lg text-xs tracking-wide dark:bg-green-900/30 dark:text-green-400">
        Good Lead
      </span>
    )
  }
  if (status === 'BAD_LEAD') {
    return (
      <span className="inline-block px-3 py-1 bg-red-50 text-red-600 font-bold rounded-lg text-xs tracking-wide dark:bg-red-900/30 dark:text-red-400">
        Bad Lead
      </span>
    )
  }
  if (status) {
    return (
      <span className="inline-block px-3 py-1 bg-gray-50 text-gray-500 font-bold rounded-lg text-xs tracking-wide dark:bg-gray-800 dark:text-gray-400">
        {status.replace(/_/g, ' ')}
      </span>
    )
  }
  return <span className="text-gray-300 dark:text-gray-600">—</span>
}
