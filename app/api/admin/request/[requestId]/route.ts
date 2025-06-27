import { NextRequest, NextResponse } from 'next/server'
import { validateCognitoToken } from '@/lib/cognito'
import { ddbDocClient, GetCommand, PutCommand, UpdateCommand } from '@/lib/aws'

export async function POST(req: NextRequest, { params }: { params: { requestId: string } }) {
  try {
    const { requestId } = params

    // Auth & admin check
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

    // Parse body { action: "approve" | "deny", durationHours?: number }
    const body = await req.json()
    const { action, durationHours } = body
    if (!['approve', 'deny'].includes(action)) {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400 })
    }

    // Get the request from DynamoDB
    const getParams = {
      TableName: process.env.ACCESS_REQUESTS_TABLE_NAME || 'access_requests',
      Key: { requestId },
    }
    const requestData = await ddbDocClient.send(new GetCommand(getParams))
    if (!requestData.Item) {
      return NextResponse.json({ message: 'Request not found' }, { status: 404 })
    }

    if (requestData.Item.status !== 'pending') {
      return NextResponse.json({ message: 'Request already processed' }, { status: 400 })
    }

    if (action === 'deny') {
      // Update request status to denied
      const updateParams = {
        TableName: process.env.ACCESS_REQUESTS_TABLE_NAME || 'access_requests',
        Key: { requestId },
        UpdateExpression: 'SET #st = :denied',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: { ':denied': 'denied' },
      }
      await ddbDocClient.send(new UpdateCommand(updateParams))
      return NextResponse.json({ message: 'Request denied' }, { status: 200 })
    }

    // Approve action
    if (!durationHours || typeof durationHours !== 'number' || durationHours <= 0) {
      return NextResponse.json({ message: 'Invalid durationHours' }, { status: 400 })
    }

    // Calculate expiresAt timestamp
    const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000).toISOString()

    // Update request status to approved
    const updateRequestParams = {
      TableName: process.env.ACCESS_REQUESTS_TABLE_NAME || 'access_requests',
      Key: { requestId },
      UpdateExpression: 'SET #st = :approved',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':approved': 'approved' },
    }
    await ddbDocClient.send(new UpdateCommand(updateRequestParams))

    // Add to temp_access table
    const tempAccessParams = {
      TableName: process.env.TEMP_ACCESS_TABLE_NAME || 'temp_access',
      Item: {
        userId: requestData.Item.userId,
        bucket: requestData.Item.bucket,
        roleArn: process.env[`TEMP_ROLE_ARN_${requestData.Item.bucket.toUpperCase()}`], // map your bucket to role ARN in env
        expiresAt,
      },
    }
    await ddbDocClient.send(new PutCommand(tempAccessParams))

    return NextResponse.json({ message: 'Request approved and access granted' }, { status: 200 })
  } catch (err: any) {
    console.error('Admin approve/deny error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
