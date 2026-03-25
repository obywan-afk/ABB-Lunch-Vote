import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { EnhancedMenuProcessor } from '@/lib/enhancedMenuProcessor'
import { dayOverrideToFiEn, dateForNextWeekdayFi, todayKeyEuropeHelsinki, weekdayLabelFi } from '@/lib/menu/day'

type Language = 'en' | 'fi'

let lastCleanupDate: string | null = null

const RESTAURANT_URLS: Record<string, string> = {
  tellus: 'https://www.compass-group.fi/menuapi/feed/rss/current-week?costNumber=3105&language=en/',
  por: 'https://por.fi/menu/',
  'valimo-park': 'https://ravintolapalvelut.iss.fi/ravintola-faundori/',
  valaja: 'https://www.sodexo.fi/en/restaurants/restaurant-valaja',
  'antell-kuohu': 'https://www.antell.fi/ravintolat/ravintola-kuohu/',
  factory: 'https://ravintolafactory.com/lounasravintolat/ravintolat/helsinki-pitajanmaki/',
  'ravintola-valimo': 'https://www.ravintolavalimo.fi/',
}

const FALLBACK_RESTAURANTS = [
  { id: 'tellus', name: 'Tellus', location: 'Pitaejanmaeki', description: 'Compass Group lunch restaurant' },
  { id: 'por', name: 'Por', location: 'Pitaejanmaeki', description: 'POR lunch restaurant' },
  { id: 'valimo-park', name: 'Faundori', location: 'Valimo Park', description: 'ISS restaurant at Valimo Park' },
  { id: 'valaja', name: 'Valaja', location: 'Pitaejanmaeki', description: 'Sodexo restaurant Valaja' },
  { id: 'antell-kuohu', name: 'Antell Kuohu', location: 'Pitaejanmaeki', description: 'Antell lunch restaurant' },
  { id: 'factory', name: 'Factory', location: 'Pitaejanmaeki', description: 'Factory lunch buffet' },
  { id: 'ravintola-valimo', name: 'Ravintola Valimo', location: 'Valimo', description: 'Ravintola Valimo lunch menu' },
] as const

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim())
}

function inferParseStatus(menuText?: string): { parse: 'ok' | 'rate_limited' | 'failed'; note: string } {
  const text = menuText?.trim() ?? ''

  if (!text) {
    return { parse: 'failed', note: 'No menu content returned' }
  }

  if (/rate-limited|too many requests|quota/i.test(text)) {
    return { parse: 'rate_limited', note: 'Live fetch returned a temporary parser limit message' }
  }

  if (/could not fetch menu|menu not available|please check .* directly/i.test(text)) {
    return { parse: 'failed', note: 'Live fetch returned a fallback message' }
  }

  return { parse: 'ok', note: '' }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const language = (searchParams.get('language') || 'en') as Language
  const forceFresh = searchParams.get('fresh') === 'true'

  const dayParam = searchParams.get('day') || ''
  const dayOverride = dayParam ? dayOverrideToFiEn(dayParam) : null
  const targetDayFi = dayOverride?.fi || undefined

  const todayFi = weekdayLabelFi()
  const isToday = targetDayFi && targetDayFi.toLowerCase() === todayFi.toLowerCase()
  const dateKey = targetDayFi
    ? isToday
      ? todayKeyEuropeHelsinki()
      : dateForNextWeekdayFi(targetDayFi)
    : undefined
  const effectiveDateKey = dateKey ?? todayKeyEuropeHelsinki()

  console.log(`Processing menus for language: ${language} (fresh=${forceFresh}, day=${targetDayFi ?? 'auto'}, dateKey=${dateKey ?? 'today'})`)

  const today = todayKeyEuropeHelsinki()
  if (lastCleanupDate !== today) {
    lastCleanupDate = today
    if (process.env.NEXTAUTH_URL) {
      void fetch(`${process.env.NEXTAUTH_URL}/api/cache/cleanup`, {
        method: 'POST',
        headers: { 'x-cron-secret': process.env.CRON_SECRET || '' },
      })
        .then((response) => response.json())
        .then((result) => console.log('Auto-cleanup result:', result))
        .catch((error) => console.error('Auto-cleanup failed:', error))
    } else {
      console.log('Skipping auto-cleanup: NEXTAUTH_URL not configured')
    }
  }

  try {
    const dbRestaurants = hasDatabaseUrl()
      ? await prisma.restaurant.findMany({
          select: { id: true, name: true, location: true, description: true },
        })
      : FALLBACK_RESTAURANTS

    if (!hasDatabaseUrl()) {
      console.log('DATABASE_URL not configured, using static restaurant metadata fallback')
    }

    if (dbRestaurants.length === 0) {
      return NextResponse.json({
        success: true,
        language,
        restaurants: [],
        meta: { emptyDb: true, aiLimited: false },
        timestamp: new Date().toISOString(),
      })
    }

    const restaurants = await Promise.all(
      dbRestaurants.map(async (restaurant) => {
        try {
          const result = await EnhancedMenuProcessor.processRestaurantWithCache(
            restaurant.id,
            restaurant.name,
            language,
            { targetDayFi, dateKey, skipCache: !!forceFresh }
          )

          return {
            id: restaurant.id,
            name: restaurant.name,
            location: restaurant.location,
            description: restaurant.description,
            url: RESTAURANT_URLS[restaurant.id],
            rawSnippet: result.rawMenu?.slice(0, 160),
            parsedMenu: result.parsedMenu,
            fromCache: !forceFresh && result.fromCache,
            dateKey: effectiveDateKey,
            status: {
              scraped: true,
              parse: inferParseStatus(result.parsedMenu || result.rawMenu).parse,
              note: result.fromCache
                ? `Loaded from DB cache (${effectiveDateKey})`
                : inferParseStatus(result.parsedMenu || result.rawMenu).note || `Live scraped & cached (${effectiveDateKey})`,
            },
          }
        } catch (error) {
          console.log(`Unexpected error processing ${restaurant.name}:`, error)
          return {
            id: restaurant.id,
            name: restaurant.name,
            location: restaurant.location,
            description: restaurant.description,
            url: RESTAURANT_URLS[restaurant.id],
            fromCache: false,
            dateKey: effectiveDateKey,
            error: true,
            status: { scraped: false, parse: 'failed' as const, note: 'Unexpected error occurred' },
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      language,
      restaurants,
      meta: { aiLimited: false, liveDataOnly: true, cacheSource: 'database' },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Menu processing failed:', error)
    return NextResponse.json({ error: 'Failed to process menus' }, { status: 500 })
  }
}
