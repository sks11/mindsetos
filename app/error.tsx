'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-md p-8 bg-white rounded-lg shadow-lg dark:bg-gray-800">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Something went wrong!</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          We're sorry for the inconvenience. Please try again.
        </p>
        <Button
          onClick={() => reset()}
          className="mt-4"
        >
          Try again
        </Button>
      </div>
    </div>
  )
} 