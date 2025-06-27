import { NextRequest, NextResponse } from 'next/server'
import { validateCognitoToken } from '@/lib/cognito'
import { ddbDocClient, QueryCommand } from '@/lib/aws'

export async function GET(req: NextRequest) {
  try {
    // Auth & admin check
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.split(' ')[1]
    const user = await validateCognitoToken(token)

    // Simple admin group check (adjust as per your setup)
    const groups = user['cognito:groups'] || []
    if (!groups.includes('admin')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    // Query access_requests table for pending
    const params = {
      TableName: process.env.ACCESS_REQUESTS_TABLE_NAME || 'access_requests',
      IndexName: undefined, // no GSI needed if scanning
      FilterExpression: '#st = :pending',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':pending': 'pending' },
    }

    // Scan with filter because no GSI (not ideal for prod, consider GSI on status)
    const data = await ddbDocClient.scan(params)

    return NextResponse.json({ requests: data.Items || [] }, { status: 200 })
  } catch (err: any) {
    console.error('Admin list pending error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
