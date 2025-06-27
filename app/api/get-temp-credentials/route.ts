// app/api/get-temp-credentials/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateCognitoToken } from '@/lib/cognito'
import { ddbDocClient, GetCommand, stsClient, AssumeRoleCommand } from '@/lib/aws'

export async function GET(req: NextRequest) {
  try {
    // 1. Validate Authorization header and token
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Missing or invalid Authorization header' }, { status: 401 })
    }
    const token = authHeader.split(' ')[1]
    const user = await validateCognitoToken(token)

    // 2. Get 'bucket' from query params
    const { searchParams } = new URL(req.url)
    const bucket = searchParams.get('bucket')
    if (!bucket) {
      return NextResponse.json({ message: 'Missing bucket query parameter' }, { status: 400 })
    }

    // 3. Check temp_access table for user + bucket
    const getParams = {
      TableName: process.env.TEMP_ACCESS_TABLE_NAME || 'temp_access',
      Key: {
        userId: user.sub,
        bucket,
      },
    }

    const data = await ddbDocClient.send(new GetCommand(getParams))

    if (!data.Item) {
      return NextResponse.json({ message: 'No temporary access found for this bucket' }, { status: 403 })
    }

    const { roleArn, expiresAt } = data.Item
    if (new Date(expiresAt) < new Date()) {
      return NextResponse.json({ message: 'Temporary access expired' }, { status: 403 })
    }

    // 4. AssumeRole with STS to get temporary credentials
    const assumeRoleParams = {
      RoleArn: roleArn,
      RoleSessionName: `temp-access-${user.sub}-${bucket}`,
      DurationSeconds: 3600, // 1 hour session (adjust as needed)
    }

    const assumeRoleCommand = new AssumeRoleCommand(assumeRoleParams)
    const stsResponse = await stsClient.send(assumeRoleCommand)

    if (!stsResponse.Credentials) {
      return NextResponse.json({ message: 'Failed to assume role' }, { status: 500 })
    }

    const { AccessKeyId, SecretAccessKey, SessionToken, Expiration } = stsResponse.Credentials

    // 5. Return credentials
    return NextResponse.json({
      accessKeyId: AccessKeyId,
      secretAccessKey: SecretAccessKey,
      sessionToken: SessionToken,
      expiration: Expiration,
      region: process.env.AWS_REGION || 'us-east-1',
    }, { status: 200 })

  } catch (error: any) {
    console.error('Get temp credentials error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
