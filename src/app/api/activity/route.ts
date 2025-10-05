import { NextRequest, NextResponse } from 'next/server'
import { CatService } from '~/lib/cat-service'
import { verifyAuth } from '~/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { fid } = await verifyAuth(request)
    
    const body = await request.json()
    const { sessionId, action } = body

    if (!sessionId || !action) {
      return NextResponse.json({ error: 'Missing sessionId or action' }, { status: 400 })
    }

    if (!['feed', 'cuddle', 'love'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Get user
    const user = await CatService.getUserByFid(fid)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Log activity
    const activity = await CatService.logActivity({
      sessionId,
      userId: user.id,
      action,
    })

    // Get updated cat stats
    const stats = await CatService.getCatStats(sessionId)

    return NextResponse.json({ 
      activity,
      stats,
      message: 'Activity logged successfully'
    })
  } catch (error) {
    console.error('Error logging activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { fid } = await verifyAuth(request)
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
