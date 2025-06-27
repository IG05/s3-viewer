// app/page.tsx
'use client'

import { COGNITO_CONFIG } from '@/lib/aws-config'

export default function HomePage() {
  const handleLogin = () => {
    const { cognitoDomain, userPoolClientId, redirectUri } = COGNITO_CONFIG
    const loginUrl = `${cognitoDomain}/login?response_type=code&client_id=${userPoolClientId}&redirect_uri=${redirectUri}`
    window.location.href = loginUrl
  }

  return (
    <main className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-2xl font-bold">S3 Access Manager</h1>
      <button
        onClick={handleLogin}
        className="px-6 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
      >
        Login with Cognito
      </button>
    </main>
  )
}
