import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { EnhancedMenuProcessor } from '@/lib/enhancedMenuProcessor'
import { dayOverrideToFiEn, dateForNextWeekdayFi, todayKeyEuropeHelsinki, weekdayLabelFi } from '@/lib/menu/day'

type Language = 'en' | 'fi'

// Track if cleanup has run today
let lastCleanupDate: string | null = null;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const language = (searchParams.get('language') || 'en') as Language
  const forceFresh = searchParams.get('fresh') === 'true'

  // Debug day ?day=monday|tuesday|...
  const dayParam = searchParams.get('day') || ''
  const dayOverride = dayParam ? dayOverrideToFiEn(dayParam) : null
  const targetDayFi = dayOverride?.fi || undefined
  
  // Check if requested day is today (case-insensitive comparison)
  const todayFi = weekdayLabelFi()
  const isToday = targetDayFi && targetDayFi.toLowerCase() === todayFi.toLowerCase()
  
  // Use today's date if requesting today, otherwise get next occurrence
  const dateKey = targetDayFi 
    ? (isToday ? todayKeyEuropeHelsinki() : dateForNextWeekdayFi(targetDayFi))
    : undefined

  console.log(`🚀 Processing menus for language: ${language} (fresh=${forceFresh}, day=${targetDayFi ?? 'auto'}, dateKey=${dateKey ?? 'today'})`)

  // Auto-cleanup: Run once per day on first request
  const today = todayKeyEuropeHelsinki();
  if (lastCleanupDate !== today) {
    try {
      // Only call cleanup if NEXTAUTH_URL is configured
      if (process.env.NEXTAUTH_URL) {
        const response = await fetch(`${process.env.NEXTAUTH_URL}/api/cache/cleanup`, {
          method: 'POST',
          headers: {
            'x-cron-secret': process.env.CRON_SECRET || ''
          }
        });
        const result = await response.json();
        console.log('Auto-cleanup result:', result);
      } else {
        console.log('Skipping auto-cleanup: NEXTAUTH_URL not configured');
      }
      lastCleanupDate = today;
    } catch (error) {
      console.error('Auto-cleanup failed:', error);
    }
  }

  try {
    const dbRestaurants = await prisma.restaurant.findMany({
      select: { id: true, name: true, location: true, description: true },
    })

    if (dbRestaurants.length === 0) {
      return NextResponse.json({
        success: true,
        language,
        restaurants: [],
        meta: { emptyDb: true, aiLimited: false },
        timestamp: new Date().toISOString(),
      })
    }

    const processedMenus: Array<{
      id: string
      name: string
      location: string | null
      description: string | null
      rawSnippet?: string
      parsedMenu?: string
      fromCache: boolean
      error?: boolean
      status: {
        scraped: boolean
        parse: 'ok' | 'rate_limited' | 'failed' | 'skipped'
        note: string
      }
    }> = []

    let aiLimited = false // kept for response shape

    for (const r of dbRestaurants) {
      try {
        const result = await EnhancedMenuProcessor.processRestaurantWithCache(
          r.id,
          r.name,
          language,
          {
            targetDayFi,
            dateKey,
            skipCache: !!forceFresh, // only bypass when "fresh=true"
          }
        )
        processedMenus.push({
          id: r.id,
          name: r.name,
          location: r.location,
          description: r.description,
          rawSnippet: result.rawMenu?.slice(0,160),
          parsedMenu: result.parsedMenu,
          fromCache: !forceFresh && result.fromCache,
          status: {
            scraped: true,
            parse: 'ok',
            note: result.fromCache
              ? `Loaded from DB cache (${dateKey})`
              : `Live scraped & cached (${dateKey})`
          }
        })
      } catch (e) {
        console.log(`❌ Unexpected error processing ${r.name}:`, e)
        processedMenus.push({
          id: r.id,
          name: r.name,
          location: r.location,
          description: r.description,
          fromCache: false,
          error: true,
          status: { scraped: false, parse: 'failed', note: 'Unexpected error occurred' },
        })
      }
    }

    return NextResponse.json({
      success: true,
      language,
      restaurants: processedMenus,
      meta: { aiLimited, liveDataOnly: true, cacheSource: 'database' },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Menu processing failed:', error)
    return NextResponse.json({ error: 'Failed to process menus' }, { status: 500 })
  }
}
