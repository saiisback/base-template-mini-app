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
    const { sessionId, action } = body

    await CatService.createLogEntry({
      fid,
      level: 'info',
      message: 'Activity log request received',
      meta: { sessionId, action },
    })

    if (!sessionId || !action) {
      return NextResponse.json({ error: 'Missing sessionId or action' }, { status: 400 })
    }

    if (!['feed', 'cuddle', 'love'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Get or create user
    let user = await CatService.getUserByFid(fid)
    if (!user) {
      // Create user if they don't exist
      user = await CatService.createOrUpdateUser({
        fid,
        username: `user_${fid}`,
        pfpUrl: undefined,
      })
    }

    // Log activity
    const activity = await CatService.logActivity({
      sessionId,
      userId: user.id,
      action,
    })

    // Get updated cat stats
    const stats = await CatService.getCatStats(sessionId)

    await CatService.createLogEntry({
      fid,
      level: 'info',
      message: 'Activity logged',
      meta: { activityId: activity.id, sessionId },
    })

    return NextResponse.json({ 
      activity,
      stats,
      message: 'Activity logged successfully'
    })
  } catch (error) {
    console.error('Error logging activity:', error)
    await CatService.createLogEntry({
      level: 'error',
      message: 'Error logging activity',
      meta: { error: String(error) },
    })
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
