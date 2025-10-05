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
    const { partnerFid, name } = body

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

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Error creating cat session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
