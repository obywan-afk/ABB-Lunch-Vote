'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Restaurant } from '@/lib/types'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from '@/lib/utils'
import { useDayVoting } from '@/hooks/useDayVoting'
import { MotionRestaurantCard } from '@/components/cards/MotionRestaurantCard'
import { LunchNotesDrawer } from '@/components/LunchNotesDrawer'
import { TIP_JAR_URL } from '@/lib/config'
import { TicTacToePanel } from '@/components/games/TicTacToePanel'
import { useLunchInsights, getHostFromUrl } from '@/hooks/useLunchInsights'

type Language = 'en' | 'fi'

function RestaurantCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.6)] animate-pulse" style={{ minHeight: '360px' }} />
  )
}

function MotionLogo({ partyMode, onClick }: { partyMode: boolean; onClick: () => void }) {
  const particleCount = partyMode ? 18 : 8;
  const animationSpeed = partyMode ? 0.8 : 1;
  
  return (
    <button
      onClick={onClick}
      className="group relative flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.8)] backdrop-blur"
      style={{
        transform: partyMode ? 'scale(1.02)' : 'scale(1)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      <div className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-violet-500/10 opacity-0 blur-2xl transition group-hover:opacity-100" />
      <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white font-black tracking-tight shadow-md">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-white/30 to-white/0 blur-[1px]" />
        <div className="absolute inset-0 animate-spin-slow rounded-xl border border-white/20" />
      </div>
      <div className="flex flex-col items-start text-left">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Motion</span>
        <span className="text-xl font-black leading-none text-white">Tuesday</span>
        <span className="text-sm text-white/60">Future Lunch Lab</span>
      </div>

      <div className="pointer-events-none absolute -right-5 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white shadow-inner transition group-hover:flex">
        <span className="text-lg">✦</span>
      </div>

      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100">
        {[...Array(particleCount)].map((_, i) => (
          <div
            key={i}
            className="animate-float absolute h-1.5 w-1.5 rounded-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-400"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.12}s`,
              animationDuration: `${(3 + Math.random() * 1.5) * animationSpeed}s`,
              opacity: 0.6,
            }}
          />
        ))}
      </div>
    </button>
  )
}

interface TuesdayPageProps {
  restaurants: Restaurant[]
  language: Language
  setLanguage: (lang: Language) => void
  aiLimited: boolean
}

export function TuesdayPage({ restaurants, language, setLanguage, aiLimited }: TuesdayPageProps) {
  const {
    mergedRestaurants,
    winner,
    votingLoading,
    hasVoted,
    votedRestaurantId,
    isVotingOpen,
    voters,
    handleVote,
    handleRemoveVote,
  } = useDayVoting(restaurants)

  const { weatherInfo, dailyHighlight, infoLoading } = useLunchInsights()

  // Easter Egg: Party Mode (Logo Click Counter)
  const [partyMode, setPartyMode] = useState(false)
  const [clickCount, setClickCount] = useState(0)
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleLogoClick = useCallback(() => {
    setClickCount(prev => prev + 1)
    
    // Reset timer
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
    }
    
    // Set a 2-second window for clicks
    clickTimerRef.current = setTimeout(() => {
      setClickCount(0)
    }, 2000)
  }, [])

  useEffect(() => {
    if (clickCount >= 7 && !partyMode) {
      setPartyMode(true)
      setClickCount(0)
      
      // Party mode lasts 5 seconds
      setTimeout(() => {
        setPartyMode(false)
      }, 5000)
    }
  }, [clickCount, partyMode])

  // Easter Egg: Konami Code
  const [konamiActivated, setKonamiActivated] = useState(false)
  const konamiSequence = useRef<string[]>([])
  const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      konamiSequence.current.push(e.key)
      if (konamiSequence.current.length > KONAMI_CODE.length) {
        konamiSequence.current.shift()
      }
      
      if (JSON.stringify(konamiSequence.current) === JSON.stringify(KONAMI_CODE)) {
        setKonamiActivated(true)
        konamiSequence.current = []
        
        // Konami effect lasts 10 seconds
        setTimeout(() => {
          setKonamiActivated(false)
        }, 10000)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Easter Egg: Console Message
  useEffect(() => {
    console.log(`
%c
███╗   ███╗ ██████╗ ████████╗██╗ ██████╗ ███╗   ██╗
████╗ ████║██╔═══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║
██╔████╔██║██║   ██║   ██║   ██║██║   ██║██╔██╗ ██║
██║╚██╔╝██║██║   ██║   ██║   ██║██║   ██║██║╚██╗██║
██║ ╚═╝ ██║╚██████╔╝   ██║   ██║╚██████╔╝██║ ╚████║
╚═╝     ╚═╝ ╚═════╝    ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝

%c🚀 Welcome to the MOTION Tuesday Lab!
%c👨‍💻 Built with ❤️  by Lars Oberhofer
%c🎮 Try clicking the logo 7 times quickly...
%c⌨️  Or try the Konami code: ↑↑↓↓←→←→BA
`, 
      'color: #8b5cf6; font-weight: bold;',
      'color: #06b6d4; font-size: 14px;',
      'color: #a78bfa; font-size: 12px;',
      'color: #22d3ee; font-size: 12px;',
      'color: #c084fc; font-size: 12px;'
    );
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current)
      }
    }
  }, [])

  return (
    <>
      {/* Lunch Notes Drawer */}
    <LunchNotesDrawer />
    
      <div 
        className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0b1224] via-[#0f1a32] to-[#0b1224] text-white"
        style={{
          filter: konamiActivated ? 'brightness(1.08) saturate(1.08)' : 'none',
          transition: 'filter 0.3s ease',
        }}
      >
        {/* Konami Code Activation Banner */}
        {konamiActivated && (
          <div className="fixed left-1/2 top-24 z-[60] -translate-x-1/2 animate-slideDown">
            <div className="rounded-2xl border border-cyan-400/30 bg-white/5 px-8 py-4 text-cyan-100 shadow-[0_25px_70px_-45px_rgba(0,0,0,0.8)] backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <span className="text-3xl animate-bounce">🎮</span>
                <div className="space-y-1">
                  <p className="text-lg font-bold uppercase tracking-[0.08em]">Konami unlocked</p>
                  <p className="text-sm text-cyan-100/80">Welcome to the secret club 🌟</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Background effects */}
        <div 
          className="pointer-events-none fixed inset-0 overflow-hidden"
          style={{
            filter: konamiActivated ? 'hue-rotate(35deg)' : 'none',
            transition: 'filter 1s ease',
          }}
        >
          <div className="absolute -left-40 top-10 h-80 w-80 rounded-full bg-cyan-500/20 blur-[140px]" />
          <div className="absolute right-[-120px] top-1/3 h-96 w-96 rounded-full bg-violet-500/20 blur-[140px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:80px_80px]" />
        </div>

        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
          
          <div className="container relative mx-auto px-6 py-5">
            <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
              <MotionLogo partyMode={partyMode} onClick={handleLogoClick} />
              
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 shadow-sm shadow-black/40 backdrop-blur">
                  <div className={cn(
                    "relative h-3 w-3 rounded-full",
                    isVotingOpen ? "bg-emerald-400" : "bg-amber-400"
                  )}>
                    <div className={cn(
                      "absolute inset-0 animate-ping rounded-full",
                      isVotingOpen ? "bg-emerald-300/60" : "bg-amber-300/60"
                    )} />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[11px] uppercase tracking-[0.18em] text-white/60">Status</span>
                    <span className={cn(
                      "text-sm font-semibold",
                      isVotingOpen ? "text-emerald-200" : "text-amber-200"
                    )}>
                      {isVotingOpen ? "Voting active" : "Voting closed"}
                    </span>
                  </div>
                </div>
                
                <Tabs 
                  value={language} 
                  onValueChange={(v) => setLanguage(v as Language)} 
                  className="relative"
                >
                  <TabsList className="rounded-xl border border-white/10 bg-white/5 p-1 shadow-inner shadow-black/30 backdrop-blur">
                    <TabsTrigger 
                      value="en" 
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500/80 data-[state=active]:to-cyan-500/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-900/40 rounded-lg px-4 py-2 text-sm font-semibold text-white/70 transition hover:text-white"
                    >
                      EN
                    </TabsTrigger>
                    <TabsTrigger 
                      value="fi" 
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500/80 data-[state=active]:to-cyan-500/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-900/40 rounded-lg px-4 py-2 text-sm font-semibold text-white/70 transition hover:text-white"
                    >
                      FI
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>
        </header>

        <main className="container relative mx-auto px-6 py-8">
          {/* Hero Section */}
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Tuesday lunch</p>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80">
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isVotingOpen ? "bg-emerald-400" : "bg-amber-300"
                )} />
                <span className="font-semibold">{isVotingOpen ? "Open" : "Closed"}</span>
              </div>
            </div>
            <h1 className="text-2xl font-black leading-tight text-white md:text-3xl">
              Choose today's restaurant
            </h1>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/80">
                <span className="text-white/60">Votes:</span>
                <span className="font-semibold text-white">{voters.count}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/80">
                <span className="text-white/60">Options:</span>
                <span className="font-semibold text-white">{mergedRestaurants.length}</span>
              </div>
            </div>
          </div>

          {/* Horizontal Weather & Info Banner */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-inner shadow-black/40 backdrop-blur-lg">
            <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:gap-6">
              {/* Weather snapshot */}
              <div className="flex items-center gap-4 lg:border-r lg:border-white/10 lg:pr-6">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-white/80">Helsinki now</span>
                  <p className="text-[10px] text-white/50">Open-Meteo</p>
                </div>
                {weatherInfo ? (
                  <>
                    <div className="text-center">
                      <div className="text-4xl font-black leading-none text-white">{weatherInfo.temperature}°</div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/60">{weatherInfo.description}</div>
                    </div>
                    <div className="flex gap-3">
                      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-white/50">High/Low</p>
                        <p className="text-sm font-semibold text-white">
                          {typeof weatherInfo?.high === 'number' ? `${weatherInfo.high}°` : '—'} / {typeof weatherInfo?.low === 'number' ? `${weatherInfo.low}°` : '—'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-white/50">Wind/Rain</p>
                        <p className="text-sm font-semibold text-white">
                          {typeof weatherInfo?.wind === 'number' ? `${weatherInfo.wind} km/h` : '—'} • {typeof weatherInfo?.precipitation === 'number' ? `${weatherInfo.precipitation}%` : '—'}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-white/50">
                    {infoLoading ? 'Loading…' : 'No data'}
                  </div>
                )}
              </div>

              {/* 7-Day Forecast - horizontal scrollable on mobile */}
              {weatherInfo?.weekForecast && weatherInfo.weekForecast.length > 0 && (
                <div className="flex-1 lg:border-r lg:border-white/10 lg:pr-6">
                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">7-Day Forecast</span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {weatherInfo.weekForecast.map((day, i) => (
                      <div 
                        key={i} 
                        className="flex min-w-[60px] flex-col items-center gap-1 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-center"
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">{day.day}</span>
                        <span className="text-sm font-bold text-white">{day.high}°</span>
                        <span className="text-[10px] text-white/50">{day.low}°</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Daily Highlight - compact */}
              <div className="flex-1 lg:max-w-xs">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">Daily Highlight</span>
                  {dailyHighlight && (
                    <span className="text-[9px] uppercase tracking-wider text-white/40">{dailyHighlight.source}</span>
                  )}
                </div>
                {dailyHighlight ? (
                  dailyHighlight.url ? (
                    <a
                      href={dailyHighlight.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative block overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-3 transition-all duration-300 hover:border-cyan-400/30"
                    >
                      <div className="absolute right-2 top-2 text-white/30 transition-all group-hover:text-cyan-400">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                      <div className="pr-6">
                        <p className="line-clamp-2 text-xs font-semibold leading-relaxed text-white/90">
                          {dailyHighlight.title}
                        </p>
                        {getHostFromUrl(dailyHighlight.url) && (
                          <p className="mt-1 text-[10px] text-cyan-300/60">
                            {getHostFromUrl(dailyHighlight.url)}
                          </p>
                        )}
                      </div>
                    </a>
                  ) : (
                    <div className="rounded-lg border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-3">
                      <p className="line-clamp-2 text-xs font-medium leading-relaxed text-white/80 italic">
                        {dailyHighlight.title}
                      </p>
                    </div>
                  )
                ) : (
                  <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-center">
                    <p className="text-[10px] text-white/40">
                      {infoLoading ? 'Loading…' : 'No highlight'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Limited warning */}
          {aiLimited && (
            <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-amber-50 shadow-[0_25px_80px_-60px_rgba(0,0,0,0.8)] backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-amber-50">AI parsing is temporarily rate-limited.</p>
                  <p className="text-sm text-amber-100/80">Menus will be parsed automatically when available.</p>
                </div>
              </div>
            </div>
          )}

          {/* Voters section */}
          {voters.count > 0 && (
            <div className="mb-12 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_80px_-60px_rgba(0,0,0,0.8)] backdrop-blur">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="flex items-center gap-3 text-xl font-bold text-white">
                  <span className="text-2xl">🗳️</span>
                  {voters.count} {voters.count === 1 ? 'vote cast' : 'votes cast'}
                </h3>
                {hasVoted && (
                  <button
                    onClick={handleRemoveVote}
                    className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
                  >
                    Remove My Vote
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {voters.names.map((name, i) => (
                  <div
                    key={i}
                    className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-medium text-white/80"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Restaurant grid */}
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {votingLoading ? (
              [...Array(6)].map((_, i) => (
                <RestaurantCardSkeleton key={i} />
              ))
            ) : mergedRestaurants.length === 0 ? (
              <div className="col-span-full py-12 text-center text-white/50">
                No restaurants available
              </div>
            ) : (
              mergedRestaurants.map((restaurant, index) => (
                <MotionRestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  onVote={() => handleVote(restaurant.id)}
                  userHasVoted={hasVoted}
                  hasVotedForThis={votedRestaurantId === restaurant.id}
                  isWinner={winner?.id === restaurant.id}
                  isVotingOpen={isVotingOpen}
                  index={index}
                />
              ))
            )}
          </div>

          {/* Mini-game */}
          <TicTacToePanel />
        </main>

        {/* Footer */}
        <footer className="relative mt-20 border-t border-white/10 bg-slate-950/70 py-8 backdrop-blur">
          <div className="container mx-auto flex flex-col items-center gap-3 text-center text-sm text-white/60">
            <p className="text-sm text-white/70">
              © {new Date().getFullYear()} Lars Oberhofer • Crafted with coffee, hunger and ❤️ in Helsinki
            </p>
            <p className="max-w-xl text-xs text-white/60">
              If these menus are useful to you, and provide value, feel free to support one of my coffee fueled development sessions by{' '}
              <a
                href={TIP_JAR_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-cyan-200 underline decoration-dotted underline-offset-4 transition hover:text-white"
              >
                <span aria-hidden="true">☕</span>
                <span>buying me a coffee</span>
              </a>
              . Thank you!
            </p>
          </div>
        </footer>
      </div>

      {/* Global styles for animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }
        
        @keyframes morph {
          0%, 100% { border-radius: 48% 52% 40% 60% / 52% 40% 60% 48%; }
          50% { border-radius: 58% 42% 55% 45% / 48% 58% 42% 52%; }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes slideUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translate(-50%, -100%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        
        @keyframes hueRotate {
          0% { filter: hue-rotate(0deg) brightness(1.3); }
          100% { filter: hue-rotate(360deg) brightness(1.3); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-morph {
          animation: morph 8s ease-in-out infinite;
        }
        
        .animate-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite;
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        
        .animate-slideDown {
          animation: slideDown 0.5s ease-out;
        }
        
        .shadow-3xl {
          box-shadow: 0px 30px 80px rgba(15, 23, 42, 0.08);
        }
        
        .animate-spin-slow {
          animation: spin 12s linear infinite;
        }
      `}</style>
    </>
  )
}
