import { NextRequest, NextResponse } from 'next/server'
import { validateCognitoToken } from '@/lib/cognito'
import { ddbDocClient } from '@/lib/aws'
import { ScanCommand } from '@aws-sdk/lib-dynamodb'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const user = await validateCognitoToken(token)

    const groups = user['cognito:groups'] || []
    if (!groups.includes('admin')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const params = {
      TableName: process.env.ACCESS_REQUESTS_TABLE_NAME || 'access_requests',
      FilterExpression: '#st = :pending',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':pending': 'pending' },
    }

    const data = await ddbDocClient.send(new ScanCommand(params))

    return NextResponse.json({ requests: data.Items || [] }, { status: 200 })
  } catch (err: any) {
    console.error('Admin list pending error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
