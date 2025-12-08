'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Restaurant } from '@/lib/types'
import { useToast } from "@/hooks/use-toast"
import { TuesdayPage } from '@/components/TuesdayPage'
import { WednesdayPage } from '@/components/WednesdayPage'
import { ThursdayPage } from '@/components/ThursdayPage'

type Language = 'en' | 'fi'
type DevDay = '' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
type DaySelection = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

// Remove a leading "Tiistai" line (optionally wrapped with dashes)
function stripTiistaiHeader(text?: string) {
  if (!text) return text;
  const lines = String(text).split(/\r?\n/);
  if (
    lines[0] &&
    /^\s*(?:-+)?\s*tiistai\s*(?:-+)?\s*:?$/i.test(lines[0].trim())
  ) {
    lines.shift();
  }
  return lines.join('\n').trimStart();
}

export default function Home() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [language, setLanguage] = useState<Language>('en')
  const [selectedDay, setSelectedDay] = useState<DaySelection>('tuesday')
  const [aiLimited, setAiLimited] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const dayByIndex: Record<number, DaySelection | undefined> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  }

  // Get current day and set default selection
  useEffect(() => {
    const currentDay = new Date().getDay()
    const today = dayByIndex[currentDay]
    
    if (today) {
      setSelectedDay(today)
    } else {
      // Fallback to Tuesday (shouldn't happen since we cover all days 0-6)
      setSelectedDay('tuesday')
    }
  }, [])

  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('abb-lunch-vote-auth') === 'true'
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    const fetchProcessedMenus = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({ language })
        params.set('day', selectedDay)

        const response = await fetch(`/api/menus?${params.toString()}`)
        const data = await response.json()

        if (data.success) {
          const processedRestaurants: Restaurant[] = data.restaurants.map((r: any) => ({
            id: r.id,
            name: r.name,
            location: r.location,
            description: r.description,
            rawMenu: stripTiistaiHeader(r.rawMenu),
            parsedMenu: stripTiistaiHeader(r.parsedMenu),
            votes: 0,
            url: r.url || undefined,
            status: r.status,
            rawSnippet: stripTiistaiHeader(r.rawSnippet),
            fromCache: Boolean(r.fromCache),
            fetchedForDate: r.dateKey,
            statusNote: r.status?.note,
          }))

          setRestaurants(processedRestaurants)
          setAiLimited(Boolean(data.meta?.aiLimited))
        } else {
          throw new Error(data.error || 'Failed to fetch processed menus')
        }
      } catch (error) {
        console.error('Failed to fetch processed menus:', error)
        toast({
          title: 'Error',
          description: 'Could not load menus. Please try again.',
          variant: 'destructive',
        })
        setRestaurants([])
      }
      setIsLoading(false)
    }

    fetchProcessedMenus()
  }, [language, selectedDay, toast])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
          <p className="mt-4 text-lg text-white/60">Loading restaurants...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Render appropriate day component */}
      {selectedDay === 'wednesday' ? (
        <WednesdayPage
          restaurants={restaurants}
          language={language}
          setLanguage={setLanguage}
          aiLimited={aiLimited}
        />
      ) : selectedDay === 'thursday' ? (
        <ThursdayPage
          restaurants={restaurants}
          language={language}
          setLanguage={setLanguage}
          aiLimited={aiLimited}
        />
      ) : (
        // TuesdayPage as fallback for tuesday, monday, friday, saturday, sunday
        <TuesdayPage
          restaurants={restaurants}
          language={language}
          setLanguage={setLanguage}
          aiLimited={aiLimited}
        />
      )}
    </div>
  )
}
