// lib/aws.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb'
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts'

// Configure AWS region from environment variable or hardcode here
const REGION = process.env.AWS_REGION || 'us-east-1'

// DynamoDB low-level client
const ddbClient = new DynamoDBClient({ region: REGION })

// DynamoDB Document client for easier JS object handling
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient)

// STS client for assumeRole calls
const stsClient = new STSClient({ region: REGION })

export {
  ddbClient,
  ddbDocClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  stsClient,
  AssumeRoleCommand,
}
