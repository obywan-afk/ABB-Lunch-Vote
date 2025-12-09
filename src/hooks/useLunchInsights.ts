'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type WeatherInfo = {
  temperature: number
  description: string
  high?: number
  low?: number
  precipitation?: number
  wind?: number
  weekForecast?: Array<{
    day: string
    high: number
    low: number
    code: number
  }>
}

export type DailyHighlight = {
  title: string
  url?: string
  source: string
}

const weatherDescriptions: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Freezing fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Freezing rain',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Snowfall',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Rain showers',
  81: 'Showers',
  82: 'Heavy showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Storm with hail',
  99: 'Heavy storm',
}

function getWeatherDescription(code?: number) {
  if (typeof code !== 'number') return 'Weather update'
  return weatherDescriptions[code] ?? 'Weather update'
}

export function getHostFromUrl(url?: string) {
  if (!url) return ''
  try {
    const host = new URL(url).hostname
    return host.startsWith('www.') ? host.slice(4) : host
  } catch {
    return ''
  }
}

async function fetchLunchInsights() {
  const weekForecast: WeatherInfo['weekForecast'] = []
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = new Date()
  let weatherInfo: WeatherInfo | null = null
  let dailyHighlight: DailyHighlight | null = null

  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=60.1699&longitude=24.9384&current_weather=true&timezone=Europe/Helsinki&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&forecast_days=7',
    )

    if (res.ok) {
      const data = await res.json()

      for (let i = 0; i < 7; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)
        const dayName = i === 0 ? 'Today' : dayNames[date.getDay()]

        if (data?.daily?.temperature_2m_max?.[i] !== undefined) {
          weekForecast.push({
            day: dayName,
            high: Math.round(data.daily.temperature_2m_max[i]),
            low: Math.round(data.daily.temperature_2m_min[i]),
            code: data.daily.weathercode[i],
          })
        }
      }

      weatherInfo = {
        temperature: Math.round(data?.current_weather?.temperature ?? 0),
        description: getWeatherDescription(
          data?.current_weather?.weathercode,
        ),
        high:
          typeof data?.daily?.temperature_2m_max?.[0] === 'number'
            ? Math.round(data.daily.temperature_2m_max[0])
            : undefined,
        low:
          typeof data?.daily?.temperature_2m_min?.[0] === 'number'
            ? Math.round(data.daily.temperature_2m_min[0])
            : undefined,
        precipitation:
          typeof data?.daily?.precipitation_probability_max?.[0] === 'number'
            ? Math.round(data.daily.precipitation_probability_max[0])
            : undefined,
        wind:
          typeof data?.current_weather?.windspeed === 'number'
            ? Math.round(data.current_weather.windspeed)
            : undefined,
        weekForecast: weekForecast.length > 0 ? weekForecast : undefined,
      }
    }
  } catch (error) {
    console.error('Weather fetch failed', error)
  }

  try {
    const subreddits = ['web_design', 'design', 'userexperience', 'UI_Design']
    const randomSub = subreddits[Math.floor(Math.random() * subreddits.length)]
    const res = await fetch(
      `https://www.reddit.com/r/${randomSub}/hot.json?limit=10`,
    )
    if (res.ok) {
      const data = await res.json()
      const posts = data?.data?.children?.filter(
        (post: any) =>
          !post.data.stickied &&
          !post.data.is_self &&
          post.data.url &&
          post.data.score > 10,
      )
      if (posts && posts.length > 0) {
        const post = posts[0].data
        dailyHighlight = {
          title: post.title,
          url: post.url,
          source: `r/${randomSub}`,
        }
      }
    }
  } catch (error) {
    console.error('Design news fetch failed', error)
  }

  if (!dailyHighlight) {
    try {
      const quoteRes = await fetch(
        'https://api.quotable.io/random?tags=food|happiness|success',
      )
      if (quoteRes.ok) {
        const quote = await quoteRes.json()
        if (quote?.content) {
          dailyHighlight = {
            title: `${quote.content} — ${quote.author || 'Unknown'}`,
            source: 'Quotable',
          }
        }
      }
    } catch (error) {
      console.error('Quote fetch failed', error)
    }
  }

  return { weatherInfo, dailyHighlight }
}

export function useLunchInsights() {
  const [weatherInfo, setWeatherInfo] = useState<WeatherInfo | null>(null)
  const [dailyHighlight, setDailyHighlight] = useState<DailyHighlight | null>(
    null,
  )
  const [infoLoading, setInfoLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const applyInsights = useCallback(
    (data: { weatherInfo: WeatherInfo | null; dailyHighlight: DailyHighlight | null }) => {
      if (!mountedRef.current) return
      setWeatherInfo(data.weatherInfo)
      setDailyHighlight(data.dailyHighlight)
    },
    [],
  )

  const refresh = useCallback(async () => {
    setInfoLoading(true)
    try {
      const data = await fetchLunchInsights()
      applyInsights(data)
      setError(null)
    } catch (err) {
      if (!mountedRef.current) return
      const message =
        err instanceof Error ? err.message : 'Failed to load lunch info'
      setError(message)
    } finally {
      if (mountedRef.current) {
        setInfoLoading(false)
      }
    }
  }, [applyInsights])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { weatherInfo, dailyHighlight, infoLoading, error, refresh }
}
