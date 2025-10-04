'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Restaurant } from '@/lib/types'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from '@/lib/utils'
import { useDayVoting } from '@/hooks/useDayVoting'
import { MotionRestaurantCard } from '@/components/cards/MotionRestaurantCard'
import { LunchNotesDrawer } from '@/components/LunchNotesDrawer'
import { TIP_JAR_URL } from '@/lib/config'

type Language = 'en' | 'fi'

function RestaurantCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white/5 animate-pulse" style={{ minHeight: '400px' }} />
  )
}

function MotionLogo({ partyMode, onClick }: { partyMode: boolean; onClick: () => void }) {
  const particleCount = partyMode ? 25 : 6;
  const animationSpeed = partyMode ? 0.5 : 1;
  
  return (
    <div 
      className="relative group cursor-pointer" 
      onClick={onClick}
      style={{
        transform: partyMode ? 'scale(1.1)' : 'scale(1)',
        transition: 'transform 0.3s ease-out'
      }}
    >
      <div className="absolute -inset-10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
        {[...Array(particleCount)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.2}s`,
              animationDuration: `${(3 + Math.random() * 2) * animationSpeed}s`
            }}
          />
        ))}
      </div>

      <div className="flex items-center gap-6 relative">
        <div 
          className="relative w-16 h-16"
          style={{
            filter: partyMode ? 'hue-rotate(0deg) brightness(1.3)' : 'none',
            animation: partyMode ? 'hueRotate 2s linear infinite' : 'none'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 to-cyan-600/30 rounded-full blur-xl animate-morph" />
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: partyMode ? '10s' : '20s' }}>
            <div className="absolute inset-0 border-2 border-transparent border-t-cyan-400/40 border-r-purple-400/40 rounded-full" />
          </div>
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: partyMode ? '7.5s' : '15s', animationDirection: 'reverse' }}>
            <div className="absolute inset-2 border border-transparent border-b-pink-400/30 border-l-orange-400/30 rounded-full" />
          </div>
          <div 
            className="absolute inset-3 bg-gradient-to-br from-white to-white/80 rounded-full shadow-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500"
            style={{
              transform: partyMode ? 'scale(1.2)' : 'scale(1)'
            }}
          >
            <div 
              className="w-6 h-6 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-full animate-pulse"
              style={{
                animationDuration: partyMode ? '0.5s' : '2s'
              }}
            />
          </div>
          <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ animationDuration: '3s' }} />
        </div>
        
        <div className="flex flex-col relative">
          <div className="relative">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-purple-100 animate-gradient">
              MOTION
            </h1>
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
          <div className="relative -mt-2">
            <span className="text-lg md:text-xl font-light tracking-[0.3em] text-white/90 uppercase">
              Tuesday Lab
            </span>
            <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent mt-1 animate-shimmer" />
          </div>
        </div>
      </div>
    </div>
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
        className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950"
        style={{
          filter: konamiActivated ? 'brightness(1.2) saturate(1.5)' : 'none',
          transition: 'filter 0.3s ease'
        }}
      >
        {/* Konami Code Activation Banner */}
        {konamiActivated && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] animate-slideDown">
            <div className="backdrop-blur-xl bg-gradient-to-r from-violet-500/30 to-cyan-500/30 border-2 border-white/20 rounded-2xl px-8 py-4 shadow-2xl">
              <div className="flex items-center gap-4">
                <span className="text-4xl animate-bounce">🎮</span>
                <div>
                  <p className="text-xl font-bold text-white">KONAMI CODE ACTIVATED!</p>
                  <p className="text-sm text-white/80">Welcome to the secret club 🌟</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Background effects */}
        <div 
          className="fixed inset-0 overflow-hidden pointer-events-none"
          style={{
            filter: konamiActivated ? 'hue-rotate(180deg)' : 'none',
            transition: 'filter 2s ease'
          }}
        >
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>

        {/* Header */}
        <header className="backdrop-blur-2xl sticky top-0 z-50 bg-black/20 border-b border-white/10">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-900/20 via-transparent to-cyan-900/20" />
          
          <div className="relative container mx-auto px-6 py-8">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
              <MotionLogo partyMode={partyMode} onClick={handleLogoClick} />
              
              <div className="flex flex-col items-center lg:items-end gap-4">
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wider mb-1 text-white/60">
                      Tuesday Edition
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "relative w-3 h-3",
                        isVotingOpen ? "bg-green-400" : "bg-red-400"
                      )}>
                        <div className={cn(
                          "absolute inset-0 animate-ping",
                          isVotingOpen ? "bg-green-400" : "bg-red-400"
                        )} />
                      </div>
                      <span className={cn(
                        "text-sm font-medium",
                        isVotingOpen ? "text-green-400" : "text-red-400"
                      )}>
                        {isVotingOpen ? "VOTING ACTIVE" : "VOTING CLOSED"}
                      </span>
                    </div>
                  </div>
                  
                  <div className="relative group">
                    <div className="absolute -inset-2 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-violet-500/20 to-cyan-500/20" />
                    <Tabs 
                      value={language} 
                      onValueChange={(v) => setLanguage(v as Language)} 
                      className="relative"
                    >
                      <TabsList className="backdrop-blur-xl bg-white/5 border border-white/10">
                        <TabsTrigger 
                          value="en" 
                          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white text-white/60"
                        >
                          EN
                        </TabsTrigger>
                        <TabsTrigger 
                          value="fi" 
                          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white text-white/60"
                        >
                          FI
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="relative container mx-auto px-6 py-12">
          {/* AI Limited warning */}
          {aiLimited && (
            <div className="mb-8 rounded-2xl backdrop-blur-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl animate-pulse">⚠️</span>
                <p>AI parsing is rate-limited. Menus will be parsed automatically when available.</p>
              </div>
            </div>
          )}

          {/* Voters section */}
          {voters.count > 0 && (
            <div className="mb-12 p-6 backdrop-blur-xl rounded-2xl bg-white/5 border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold flex items-center gap-3 text-white">
                  <span className="text-3xl">🗳️</span>
                  {voters.count} {voters.count === 1 ? 'Vote Cast' : 'Votes Cast'}
                </h3>
                {hasVoted && (
                  <button
                    onClick={handleRemoveVote}
                    className="px-4 py-2 transition-all duration-300 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                  >
                    Remove My Vote
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {voters.names.map((name, i) => (
                  <div
                    key={i}
                    className="px-3 py-1.5 backdrop-blur-xl text-sm rounded-full bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-white/20 text-white/80"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Restaurant grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 items-stretch">
            {votingLoading ? (
              [...Array(6)].map((_, i) => (
                <RestaurantCardSkeleton key={i} />
              ))
            ) : mergedRestaurants.length === 0 ? (
              <div className="col-span-full text-center py-12 text-white/40">
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
        </main>

        {/* Footer */}
        <footer className="relative mt-20 py-8 backdrop-blur-xl bg-black/30 border-t border-white/10">
          <div className="container mx-auto flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-white/40">
              © {new Date().getFullYear()} Lars Oberhofer • Crafted with coffee,hunger and ❤️ in Helsinki
            </p>
            <p className="max-w-xl text-xs text-white/50">
              If these menus are useful to you, and provide value, feel free to support one of my coffee fueled development sessions by{' '}
              <a
                href={TIP_JAR_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-white/70 underline decoration-dotted underline-offset-4 transition hover:text-white"
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
          50% { transform: translateY(-20px); }
        }
        
        @keyframes morph {
          0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
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
      `}</style>
    </>
  )
}
