// app/api/buckets/route.ts
import { NextResponse } from 'next/server'
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3'
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers'
import { COGNITO_CONFIG } from '@/lib/aws-config'

export async function GET(req: Request) {
  const idToken = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!idToken) return NextResponse.json({ error: 'Missing token' }, { status: 401 })

  try {
    const creds = await fromCognitoIdentityPool({
      identityPoolId: COGNITO_CONFIG.identityPoolId,
      logins: {
        [`cognito-idp.${COGNITO_CONFIG.region}.amazonaws.com/${COGNITO_CONFIG.userPoolId}`]: idToken,
      },
      clientConfig: { region: COGNITO_CONFIG.region },
    })()

    const s3 = new S3Client({ region: COGNITO_CONFIG.region, credentials: creds })
    const result = await s3.send(new ListBucketsCommand({}))

    const buckets = result.Buckets?.map((b) => b.Name!) || []
    return NextResponse.json({ buckets })
  } catch (err: any) {
    console.error('S3 ListBuckets failed:', err)
    return NextResponse.json({ error: 'Failed to list buckets' }, { status: 500 })
  }
}
