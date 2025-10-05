import { NextRequest, NextResponse } from 'next/server'
import { CatService } from '~/lib/cat-service'
import { verifyAuth } from '~/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Get user identifier from Authorization header
    const authHeader = request.headers.get('authorization')
    const userFid = authHeader?.replace('Bearer ', '')
    
    if (!userFid) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 })
    }
    
    const body = await request.json()
    const { partnerFid, name } = body

    await CatService.createLogEntry({
      level: 'info',
      message: 'Create cat session request received',
      context: { userFid, partnerFid, name },
    })

    // Get or create user - try by FID first, then create if needed
    let user = await CatService.getUserByFid(parseInt(userFid))
    if (!user) {
      // Create user if they don't exist
      user = await CatService.createOrUpdateUser({
        fid: parseInt(userFid),
        username: `user_${userFid}`,
        pfpUrl: undefined,
      })
    }

    // Get or create partner if provided
    let partner = null
    if (partnerFid) {
      partner = await CatService.getUserByFid(partnerFid)
      if (!partner) {
        // Create partner if they don't exist
        partner = await CatService.createOrUpdateUser({
          fid: partnerFid,
          username: `partner_${partnerFid}`,
          pfpUrl: undefined,
        })
      }
    }

    // Create cat session
    const session = await CatService.createCatSession({
      ownerId: user.id,
      partnerId: partner?.id,
      name,
    })

    await CatService.createLogEntry({
      level: 'info',
      message: 'Cat session created',
      context: { userFid, sessionId: session?.id },
    })

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Error creating cat session:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    try {
      await CatService.createLogEntry({
        level: 'error',
        message: 'Error creating cat session',
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
    
    const user = await CatService.getUserByFid(fid)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const sessions = await CatService.getUserCatSessions(user.id)
    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error fetching cat sessions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
