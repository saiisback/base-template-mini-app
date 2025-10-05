import { db } from './db'
import { Prisma } from '@prisma/client'

export interface CreateUserData {
  fid: number
  username: string
  pfpUrl?: string
  address?: string
}

export interface CreateCatSessionData {
  ownerId: string
  partnerId?: string
  name?: string
}

export interface LogActivityData {
  sessionId: string
  userId: string
  action: 'feed' | 'cuddle' | 'love'
}

export interface UpdateCatStatsData {
  sessionId: string
  love?: number
  hunger?: number
  happiness?: number
}

export interface LogEntryData {
  fid?: number
  level: 'info' | 'warn' | 'error'
  message: string
  meta?: unknown
}

export class CatService {
  // User management
  static async createOrUpdateUser(data: CreateUserData) {
    return await db.user.upsert({
      where: { fid: data.fid },
      update: {
        username: data.username,
        pfpUrl: data.pfpUrl,
        address: data.address,
      },
      create: {
        fid: data.fid,
        username: data.username,
        pfpUrl: data.pfpUrl,
        address: data.address,
      },
    })
  }

  static async getUserByFid(fid: number) {
    return await db.user.findUnique({
      where: { fid },
    })
  }

  static async getUserByAddress(address: string) {
    return await db.user.findUnique({
      where: { address },
    })
  }

  // Cat session management
  static async createCatSession(data: CreateCatSessionData) {
    const session = await db.catSession.create({
      data: {
        ownerId: data.ownerId,
        partnerId: data.partnerId,
        name: data.name || 'cattyyy',
      },
      include: {
        catStats: true,
      },
    })

    // Create initial cat stats
    await db.catStats.create({
      data: {
        sessionId: session.id,
        love: 50,
        hunger: 30,
        happiness: 75,
      },
    })

    return await this.getCatSession(session.id)
  }

  static async getCatSession(sessionId: string) {
    return await db.catSession.findUnique({
      where: { id: sessionId },
      include: {
        owner: true,
        partner: true,
        activities: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        catStats: true,
      },
    })
  }

  static async getUserCatSessions(userId: string) {
    return await db.catSession.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { partnerId: userId },
        ],
      },
      include: {
        owner: true,
        partner: true,
        activities: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
        catStats: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  // Activity logging
  static async logActivity(data: LogActivityData) {
    const activity = await db.activity.create({
      data: {
        sessionId: data.sessionId,
        userId: data.userId,
        action: data.action,
      },
      include: {
        user: true,
      },
    })

    // Update cat stats based on action
    await this.updateCatStatsFromAction(data.sessionId, data.action)

    return activity
  }

  static async getSessionActivities(sessionId: string, limit = 10) {
    return await db.activity.findMany({
      where: { sessionId },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })
  }

  // Cat stats management
  static async updateCatStats(data: UpdateCatStatsData) {
    return await db.catStats.upsert({
      where: { sessionId: data.sessionId },
      update: {
        love: data.love,
        hunger: data.hunger,
        happiness: data.happiness,
      },
      create: {
        sessionId: data.sessionId,
        love: data.love || 50,
        hunger: data.hunger || 30,
        happiness: data.happiness || 75,
      },
    })
  }

  static async getCatStats(sessionId: string) {
    return await db.catStats.findUnique({
      where: { sessionId },
    })
  }

  private static async updateCatStatsFromAction(sessionId: string, action: string) {
    const currentStats = await this.getCatStats(sessionId)
    if (!currentStats) return

    const updates = {
      feed: { 
        hunger: Math.min(100, currentStats.hunger + 20), 
        happiness: Math.min(100, currentStats.happiness + 5) 
      },
      cuddle: { 
        love: Math.min(100, currentStats.love + 10), 
        happiness: Math.min(100, currentStats.happiness + 15) 
      },
      love: { 
        love: Math.min(100, currentStats.love + 15), 
        happiness: Math.min(100, currentStats.happiness + 10) 
      },
    }

    const updateData = updates[action as keyof typeof updates]
    if (updateData) {
      return await this.updateCatStats({
        sessionId,
        ...updateData,
      })
    }

    return currentStats
  }

  // Wallet connection tracking
  static async logWalletConnection(data: {
    address: string
    chainId: number
    connector: string
    userId?: string
  }) {
    return await db.walletConnection.upsert({
      where: { address: data.address },
      update: {
        chainId: data.chainId,
        connector: data.connector,
        userId: data.userId,
      },
      create: {
        address: data.address,
        chainId: data.chainId,
        connector: data.connector,
        userId: data.userId,
      },
    })
  }

  static async getWalletConnection(address: string) {
    return await db.walletConnection.findUnique({
      where: { address },
      include: {
        user: true,
      },
    })
  }

  static async createLogEntry(data: LogEntryData) {
    return await db.logEntry.create({
      data: {
        fid: data.fid,
        level: data.level,
        message: data.message,
        meta: data.meta as any,
      },
    })
  }
}
