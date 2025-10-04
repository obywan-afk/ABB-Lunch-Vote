'use client'

import type { Restaurant } from '@/lib/types'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from '@/lib/utils'
import { useDayVoting } from '@/hooks/useDayVoting'
import { RetroRestaurantCard } from '@/components/cards/RetroRestaurantCard'
import { LunchNotesDrawer } from '@/components/LunchNotesDrawer'
import { TIP_JAR_URL } from '@/lib/config'

type Language = 'en' | 'fi'

function RestaurantCardSkeleton() {
  return (
    <div className="rounded-lg bg-gradient-to-br from-purple-950/40 to-pink-950/40 animate-pulse border-2 border-purple-500/20" style={{ minHeight: '400px' }} />
  )
}

function VHSLogo() {
  return (
    <div className="relative group">
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-pink-500/30 via-purple-500/30 to-cyan-500/30 blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative">
        {/* Main text with chrome effect */}
        <div className="relative">
          <h1 className="text-5xl md:text-7xl font-black italic tracking-tight">
            <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-b from-pink-300 via-purple-300 to-purple-600 blur-[2px]">
              THURSDAY
            </span>
            <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-b from-white via-pink-200 to-purple-400 transform translate-x-[2px] translate-y-[2px]">
              THURSDAY
            </span>
            <span className="relative text-transparent bg-clip-text bg-gradient-to-b from-white via-pink-100 to-purple-300">
              THURSDAY
            </span>
          </h1>
          
          {/* Subtitle with VHS tracking effect */}
          <div className="relative -mt-2">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
              <span className="text-cyan-400 text-sm md:text-base font-mono tracking-[0.3em] uppercase px-3">
                Night Sessions
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
            </div>
          </div>
          
          {/* VHS timestamp */}
          <div className="absolute -bottom-6 right-0 font-mono text-xs text-cyan-300/60 tracking-wider">
            REC ● {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  )
}

interface ThursdayPageProps {
  restaurants: Restaurant[]
  language: Language
  setLanguage: (lang: Language) => void
  aiLimited: boolean
}

export function ThursdayPage({ restaurants, language, setLanguage, aiLimited }: ThursdayPageProps) {
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

  return (
    <>
      {/* Lunch Notes Drawer */}
      <LunchNotesDrawer />
      
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-purple-950 via-pink-950 to-black">
        {/* Animated retro grid background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {/* Sunset gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/50 via-pink-900/30 to-transparent" />
          
          {/* Animated grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,255,0.1)_2px,transparent_2px),linear-gradient(90deg,rgba(0,255,255,0.1)_2px,transparent_2px)] bg-[size:100px_100px] animate-grid" />
          
          {/* Palm trees silhouettes */}
          <div className="absolute bottom-0 left-0 w-full h-96 bg-gradient-to-t from-black/80 to-transparent">
            <div className="absolute bottom-0 left-10 text-[300px] opacity-20 transform -rotate-6">🌴</div>
            <div className="absolute bottom-0 right-20 text-[250px] opacity-20 transform rotate-6">🌴</div>
          </div>
          
          {/* Sun/moon orb */}
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2">
            <div className="relative w-64 h-64">
              <div className="absolute inset-0 bg-gradient-to-b from-yellow-400 via-pink-500 to-purple-600 rounded-full blur-3xl opacity-40 animate-pulse" />
              <div className="absolute inset-8 bg-gradient-to-b from-yellow-300 via-pink-400 to-purple-500 rounded-full blur-xl opacity-60" />
            </div>
          </div>
          
          {/* VHS static overlay */}
          <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay">
            <div 
              className="absolute inset-0 animate-static"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence baseFrequency='0.85' seed='5' /%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`
              }}
            />
          </div>
        </div>

        {/* Header */}
        <header className="relative z-50 backdrop-blur-md bg-black/30 border-b border-pink-500/30">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-pink-900/20 to-cyan-900/20" />
          
          <div className="relative container mx-auto px-6 py-8">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
              <VHSLogo />
              
              <div className="flex items-center gap-6">
                {/* Status indicator */}
                <div className="flex items-center gap-3 px-4 py-2 bg-black/50 rounded border border-cyan-500/30">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    isVotingOpen ? "bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]" : "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.8)]"
                  )}>
                    <div className={cn(
                      "w-3 h-3 rounded-full animate-ping",
                      isVotingOpen ? "bg-green-400" : "bg-red-400"
                    )} />
                  </div>
                  <span className={cn(
                    "font-mono text-sm tracking-wider",
                    isVotingOpen ? "text-green-400" : "text-red-400"
                  )}>
                    {isVotingOpen ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>
                
                {/* Language selector with retro style */}
                <div className="relative group">
                  <div className="absolute -inset-2 rounded blur-md opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-pink-500/30 to-cyan-500/30" />
                  <Tabs 
                    value={language} 
                    onValueChange={(v) => setLanguage(v as Language)} 
                    className="relative"
                  >
                    <TabsList className="bg-black/50 border border-purple-500/30">
                      <TabsTrigger 
                        value="en" 
                        className="font-mono data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-purple-600 data-[state=active]:text-white text-purple-300"
                      >
                        EN
                      </TabsTrigger>
                      <TabsTrigger 
                        value="fi" 
                        className="font-mono data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-purple-600 data-[state=active]:text-white text-purple-300"
                      >
                        FI
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="relative container mx-auto px-6 py-12 z-10">
          {/* AI Limited warning with VHS style */}
          {aiLimited && (
            <div className="mb-8 rounded bg-black/60 border-2 border-yellow-500/60 p-4 backdrop-blur-md">
              <div className="flex items-center gap-3 font-mono">
                <span className="text-2xl animate-pulse">⚠</span>
                <p className="text-yellow-400 text-sm tracking-wider">SYSTEM_NOTICE: AI_RATE_LIMITED // PARSING_QUEUE_ACTIVE</p>
              </div>
            </div>
          )}

          {/* Voters section with retro terminal style */}
          {voters.count > 0 && (
            <div className="mb-12 p-6 backdrop-blur-md rounded-lg bg-black/40 border-2 border-cyan-500/40">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400">
                  ACTIVE_VOTERS [{voters.count}]
                </h3>
                {hasVoted && (
                  <button
                    onClick={handleRemoveVote}
                    className="px-4 py-2 bg-red-900/50 border-2 border-red-500/60 text-red-400 font-mono text-sm tracking-wider hover:bg-red-800/50 transition-all duration-300"
                  >
                    [REVOKE]
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {voters.names.map((name, i) => (
                  <div
                    key={i}
                    className="px-4 py-2 bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-pink-500/40 text-pink-300 font-mono text-sm animate-fadeIn"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    USER:{name}
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
              <div className="col-span-full text-center py-12 text-purple-400/60 font-mono">
                NO_DATA_AVAILABLE
              </div>
            ) : (
              mergedRestaurants.map((restaurant, index) => (
                <RetroRestaurantCard
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

        {/* Footer with VHS timestamp */}
        <footer className="relative mt-20 py-8 backdrop-blur-md bg-black/50 border-t border-pink-500/30 z-10">
          <div className="container mx-auto">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-3 text-center md:text-left">
                <p className="font-mono text-xs text-purple-400/60 tracking-wider">
                  © SYSTEM_1998 // FLUORESCENT_NIGHTS_V2.0 // ALL_RIGHTS_RESERVED // LARS OBERHOFER
                </p>
                <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-pink-200/60">
                  Feeling the retro tune? There’s a quiet link to
                  {' '}
                  <a
                    href={TIP_JAR_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-pink-100/80 underline decoration-dotted underline-offset-4 transition hover:text-pink-100"
                  >
                    <span aria-hidden="true">☕</span>
                    <span>buy me a coffee</span>
                  </a>
                  . Totally optional, always appreciated.
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-cyan-400/60">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span>REC</span>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Global styles for vaporwave animations */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes grid {
          0% { transform: translate(0, 0); }
          100% { transform: translate(100px, 100px); }
        }
        
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        
        @keyframes static {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-1%, -1%); }
          20% { transform: translate(1%, 1%); }
          30% { transform: translate(-1%, 1%); }
          40% { transform: translate(1%, -1%); }
          50% { transform: translate(-1%, 0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        .animate-grid {
          animation: grid 20s linear infinite;
        }
        
        .animate-scan {
          animation: scan 8s linear infinite;
        }
        
        .animate-static {
          animation: static 0.5s steps(10) infinite;
        }
        
        .perspective-1000 {
          perspective: 1000px;
        }
        
        .rotate-y-5:hover {
          transform: rotateY(5deg);
        }
      `}</style>
    </>
  )
}
