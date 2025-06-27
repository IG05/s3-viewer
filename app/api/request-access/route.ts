// app/api/request-access/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { validateCognitoToken } from '@/lib/cognito'
import { ddbDocClient, PutCommand } from '@/lib/aws'

export async function POST(req: NextRequest) {
  try {
    // 1. Extract Authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Missing or invalid Authorization header' }, { status: 401 })
    }
    const token = authHeader.split(' ')[1]

    // 2. Validate token
    const user = await validateCognitoToken(token)

    // 3. Parse JSON body
    const body = await req.json()
    const { bucket, reason, durationHours } = body

    if (
      typeof bucket !== 'string' ||
      typeof reason !== 'string' ||
      typeof durationHours !== 'number' ||
      durationHours <= 0
    ) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 })
    }

    // 4. Prepare DynamoDB item
    const requestId = uuidv4()
    const nowISO = new Date().toISOString()

    const putParams = {
      TableName: process.env.ACCESS_REQUESTS_TABLE_NAME || 'access_requests',
      Item: {
        requestId,
        userId: user.sub,
        bucket,
        reason,
        durationHours,
        status: 'pending',
        createdAt: nowISO,
      },
    }

    // 5. Store in DynamoDB
    await ddbDocClient.send(new PutCommand(putParams))

    // 6. Return success
    return NextResponse.json({ message: 'Access request submitted successfully' }, { status: 200 })
  } catch (error: any) {
    console.error('Request access error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
