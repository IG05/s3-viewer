// lib/cognito.ts
import jwt from 'jsonwebtoken'
import jwkToPem from 'jwk-to-pem'
import fetch from 'node-fetch'

// Your Cognito User Pool info — put in env or config
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_WI2MT3Zdq'
const REGION = process.env.AWS_REGION || 'us-east-1'
const CLIENT_ID = process.env.COGNITO_APP_CLIENT_ID || '1km91vegtpf7imr8d6spimodja'

const jwksUrl = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`

// Cache JWKS keys
let pems: { [key: string]: string } = {}

async function getPems() {
  if (Object.keys(pems).length === 0) {
    const res = await fetch(jwksUrl)
    const { keys } = await res.json()
    keys.forEach((key: any) => {
      pems[key.kid] = jwkToPem(key)
    })
  }
  return pems
}

export interface CognitoUserPayload {
  sub: string
  email?: string
  'cognito:groups'?: string[]
  [key: string]: any
}

/**
 * Validates the JWT token and returns decoded payload if valid.
 * Throws error if invalid.
 */
export async function validateCognitoToken(
  token: string
): Promise<CognitoUserPayload> {
  const pems = await getPems()

  // Decode token header to get kid
  const decodedHeader: any = jwt.decode(token, { complete: true })
  if (!decodedHeader) throw new Error('Invalid JWT token')

  const kid = decodedHeader.header.kid
  const pem = pems[kid]
  if (!pem) throw new Error('Invalid token: PEM not found')

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      pem,
      {
        issuer: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`,
        audience: CLIENT_ID,
      },
      (err, decoded) => {
        if (err) reject(err)
        else resolve(decoded as CognitoUserPayload)
      }
    )
  })
}
