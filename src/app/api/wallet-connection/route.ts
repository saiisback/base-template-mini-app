import { NextRequest, NextResponse } from 'next/server'
import { CatService } from '~/lib/cat-service'
import { verifyAuth } from '~/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const fid = await verifyAuth(request)
    if (!fid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { address, chainId, connector } = body

    if (!address || !chainId || !connector) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get or create user
    const user = await CatService.getUserByFid(fid)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Log wallet connection
    const connection = await CatService.logWalletConnection({
      address,
      chainId,
      connector,
      userId: user.id,
    })

    // Update user's address if not set
    if (!user.address) {
      await CatService.createOrUpdateUser({
        fid,
        username: user.username,
        pfpUrl: user.pfpUrl || undefined,
        address,
      })
    }

    return NextResponse.json({ 
      connection,
      message: 'Wallet connection logged successfully'
    })
  } catch (error) {
    console.error('Error logging wallet connection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
