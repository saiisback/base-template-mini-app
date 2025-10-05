import { NextRequest, NextResponse } from 'next/server'
import { CatService } from '~/lib/cat-service'
import { verifyAuth } from '~/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Get wallet address from Authorization header
    const authHeader = request.headers.get('authorization')
    const walletAddress = authHeader?.replace('Bearer ', '')
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing wallet address' }, { status: 401 })
    }
    
    const body = await request.json()
    const { sessionId, action, walletAddress: bodyWalletAddress } = body
    
    // Use wallet address from body if provided, otherwise from header
    const finalWalletAddress = bodyWalletAddress || walletAddress

    await CatService.createLogEntry({
      level: 'info',
      message: 'Activity log request received',
      context: { walletAddress: finalWalletAddress, sessionId, action },
    })

    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 })
    }

    if (!['feed', 'cuddle', 'love'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Get or create user by wallet address
    let user = await CatService.getUserByWalletAddress(finalWalletAddress)
    if (!user) {
      // Create user if they don't exist
      user = await CatService.createOrUpdateUser({
        fid: Math.abs(parseInt(finalWalletAddress.slice(-8), 16)) % 2147483647, // Keep within 32-bit signed int range
        username: `wallet_${finalWalletAddress.slice(-6)}`,
        pfpUrl: undefined,
        address: finalWalletAddress,
      })
    }

    // Log activity - create a session if none provided
    let finalSessionId = sessionId
    if (!finalSessionId || finalSessionId === 'no-session') {
      // Create a simple session
      const session = await CatService.createCatSession({
        ownerId: user.id,
        partnerId: undefined,
        name: 'Quick Cat Session'
      })
      finalSessionId = session?.id || 'fallback-session'
    }

    const activity = await CatService.logActivity({
      sessionId: finalSessionId,
      userId: user.id,
      action,
    })

    // Get updated cat stats
    const stats = await CatService.getCatStats(finalSessionId)

    await CatService.createLogEntry({
      level: 'info',
      message: 'Activity logged successfully',
      context: { activityId: activity.id, sessionId: finalSessionId, walletAddress: finalWalletAddress },
    })

    return NextResponse.json({ 
      activity,
      stats,
      sessionId: finalSessionId,
      message: 'Activity logged successfully'
    })
  } catch (error) {
    console.error('Error logging activity:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    try {
      await CatService.createLogEntry({
        level: 'error',
        message: 'Error logging activity',
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
    const sessionId = searchParams.get('sessionId')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const activities = await CatService.getSessionActivities(sessionId, limit)
    return NextResponse.json({ activities })
  } catch (error) {
    console.error('Error fetching activities:', error)
    await CatService.createLogEntry({
      level: 'error',
      message: 'Error fetching activities',
      meta: { error: String(error) },
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

