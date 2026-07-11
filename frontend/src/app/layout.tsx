import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GrowEasy AI CSV Importer',
  description: 'Intelligently extract CRM lead information from any CSV format',
}

import Sidebar from '@/components/Sidebar'
import ThemeProvider from '@/components/ThemeProvider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} flex h-screen overflow-hidden`}>
        <ThemeProvider>
          <Sidebar />
          <div className="flex-1 overflow-y-auto flex flex-col w-full relative">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}