import { NextRequest, NextResponse } from 'next/server'
import { CatService } from '~/lib/cat-service'
import { verifyAuth } from '~/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Get wallet address from Authorization header
    const authHeader = request.headers.get('authorization')
    const userFid = authHeader?.replace('Bearer ', '')
    
    if (!userFid) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 })
    }
    
    const body = await request.json()
    const { address, chainId, connector } = body

    await CatService.createLogEntry({
      level: 'info',
      message: 'Wallet connection request received',
      context: { address, chainId, connector, userFid },
    })

    if (!address || !chainId || !connector) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get or create user by wallet address
    let user = await CatService.getUserByWalletAddress(address)
    if (!user) {
      // Create user if they don't exist
      user = await CatService.createOrUpdateUser({
        fid: Math.abs(parseInt(address.slice(-8), 16)) % 2147483647,
        username: `wallet_${address.slice(-6)}`,
        pfpUrl: undefined,
        address,
      })
    }

    // Log wallet connection
    const connection = await CatService.logWalletConnection({
      address,
      chainId,
      connector,
      userId: user.id,
    })

    await CatService.createLogEntry({
      level: 'info',
      message: 'Wallet connection logged',
      context: { connectionId: connection.id, address },
    })

    return NextResponse.json({ 
      connection,
      message: 'Wallet connection logged successfully'
    })
  } catch (error) {
    console.error('Error logging wallet connection:', error)
    
    try {
      await CatService.createLogEntry({
        level: 'error',
        message: 'Error logging wallet connection',
        context: { 
          error: String(error),
          stack: error instanceof Error ? error.stack : 'No stack trace'
        },
      })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const fid = await verifyAuth(request)
    if (!fid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 })
    }

    const connection = await CatService.getWalletConnection(address)
    return NextResponse.json({ connection })
  } catch (error) {
    console.error('Error fetching wallet connection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
