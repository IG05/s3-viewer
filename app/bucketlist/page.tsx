'use client'

import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const [buckets, setBuckets] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadBuckets = async () => {
      try {
        const idToken = localStorage.getItem('idToken')
        if (!idToken) throw new Error('Not logged in')

        const res = await fetch('/api/buckets', {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        })

        if (!res.ok) throw new Error(`API failed: ${res.status}`)

        const data = await res.json()
        setBuckets(data.buckets || [])
      } catch (err: any) {
        console.error('Failed to load buckets:', err)
        setError(err.message || 'Failed to fetch buckets')
      } finally {
        setLoading(false)
      }
    }

    loadBuckets()
  }, [])

  return (
    <main className="max-w-5xl mx-auto p-8 bg-white rounded-md shadow min-h-[80vh]">
      <h1 className="text-3xl font-semibold text-gray-900 mb-8">
        Accessible S3 Buckets
      </h1>

      {loading && (
        <div className="flex justify-center my-16">
          <svg
            className="animate-spin h-10 w-10 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-label="Loading"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
        </div>
      )}

      {error && (
        <p className="bg-red-100 text-red-700 p-4 rounded mb-8">
          {error}
        </p>
      )}

      {!loading && buckets.length === 0 && !error && (
        <p className="text-gray-600 italic text-center mt-12">
          No accessible buckets found.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {buckets.map((name) => (
          <li
            key={name}
            className="bg-gray-50 shadow-sm rounded-lg px-5 py-4 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow duration-300"
            tabIndex={0}
            role="button"
            aria-label={`Open bucket ${name}`}
            onClick={() => alert(`Clicked bucket: ${name}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                alert(`Clicked bucket: ${name}`)
              }
            }}
          >
            <span className="font-semibold text-gray-900 truncate">{name}</span>
            <span className="inline-block px-3 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full whitespace-nowrap">
              Accessible
            </span>
          </li>
        ))}
      </div>
    </main>
  )
}
