// app/api/cache/route.ts - Updated for database
import { NextRequest, NextResponse } from 'next/server'
import { DbMenuCache } from '@/lib/dbMenuCache'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Use Prisma directly to get all cached data
    const cacheData = await prisma.menuCache.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json({
      success: true,
      data: cacheData,
      count: cacheData.length
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get cache status' },
      { status: 500 }
    )
  }
}
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // NEW: targeted delete params
  const restaurantId = searchParams.get('restaurantId') ?? undefined
  const language = searchParams.get('language') ?? undefined
  const dateParam = searchParams.get('date') ?? undefined // YYYY-MM-DD
  const allDates =
    (searchParams.get('allDates') ?? 'false').toLowerCase() === 'true'

  // EXISTING: delete by age (days) or delete all
  const days = parseInt(searchParams.get('days') ?? '0', 10)

  try {
    // 1) Targeted delete (by restaurantId, optional language, optional date)
    if (restaurantId) {
      const where: any = { restaurantId }
      if (language) where.language = language

      // if not deleting all dates, default to "today" unless an explicit date is provided
      if (!allDates) {
        const date = dateParam || new Date().toISOString().slice(0, 10)
        where.date = date
      }

      const result = await prisma.menuCache.deleteMany({ where })
      return NextResponse.json({
        success: true,
        deleted: result.count,
        where,
      })
    }

    // 2) Age-based cleanup
    if (days > 0) {
      await DbMenuCache.cleanOldCache(days)
      return NextResponse.json({
        success: true,
        message: `Cache older than ${days} day(s) cleared`,
      })
    }

    // 3) Delete everything
    const result = await prisma.menuCache.deleteMany({})
    return NextResponse.json({
      success: true,
      message: 'Database cache cleared successfully',
      deleted: result.count,
    })
  } catch (error) {
    console.error('DELETE /api/cache failed:', error)
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    )
  }
}