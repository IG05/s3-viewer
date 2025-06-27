// app/callback/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { COGNITO_CONFIG } from '@/lib/aws-config'

export default function CallbackPage() {
  const [status, setStatus] = useState('Exchanging code...')
  const router = useRouter()

  useEffect(() => {
    const exchange = async () => {
      const code = new URLSearchParams(window.location.search).get('code')
      if (!code) return setStatus('Missing code')

      try {
        const { userPoolClientId, redirectUri, cognitoDomain } = COGNITO_CONFIG
        const res = await axios.post(
          `${cognitoDomain}/oauth2/token`,
          new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: userPoolClientId,
            client_secret: "1lfc21e8e2gc6pt32ck9vhlukb1vd2359ebh14fs11h12qi3oum",
            redirect_uri: redirectUri,
          }),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }
        )

        const { id_token, access_token } = res.data
        localStorage.setItem('idToken', id_token)
        localStorage.setItem('accessToken', access_token)
        router.push('/bucketlist')
      } catch (err) {
        console.error(err)
        setStatus('Failed to exchange token')
      }
    }

    exchange()
  }, [router])

  return (
    <div className="flex items-center justify-center h-screen">
      <p>{status}</p>
    </div>
  )
}
