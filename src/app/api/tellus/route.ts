// app/api/tellus/route.ts
import { NextResponse, NextRequest } from 'next/server'
import { DbMenuCache } from '@/lib/dbMenuCache'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const language = (searchParams.get('language') || 'en') as 'en' | 'fi'
  const cacheKey = 'tellus-rss' // avoid clashing with processed Tellus cache

  try {
    // 1) Cache first
    const cached = await DbMenuCache.getCachedProcessedMenu(cacheKey, language)
    if (cached?.rawMenu) {
      return new NextResponse(cached.rawMenu, {
        headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
      })
    }

    // 2) Fetch fresh
    const url = `https://www.compass-group.fi/menuapi/feed/rss/current-week?costNumber=3105&language=${language}`
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch menu, status: ${res.status}` },
        { status: res.status }
      )
    }

    const xml = await res.text()

    // 3) Save XML to cache (store same string in both fields)
    await DbMenuCache.setCachedProcessedMenu(cacheKey, 'Tellus RSS', language, xml, xml)

    return new NextResponse(xml, {
      headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
    })
  } catch (err) {
    console.error('Error fetching Tellus menu:', err)
    return NextResponse.json({ error: 'Error fetching Tellus menu.' }, { status: 500 })
  }
}
