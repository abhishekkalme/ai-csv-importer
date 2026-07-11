'use client'

interface ProgressIndicatorProps {
  message: string
  submessage?: string
}

export default function ProgressIndicator({ message, submessage }: ProgressIndicatorProps) {
  return (
    <div className="max-w-md mx-auto">
      <div className="card text-center">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-primary-100 rounded-full flex items-center justify-center">
            <div className="spinner"></div>
          </div>
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 mb-2">{message}</h2>
        {submessage && (
          <p className="text-gray-600">{submessage}</p>
        )}
      </div>
    </div>
  )
}