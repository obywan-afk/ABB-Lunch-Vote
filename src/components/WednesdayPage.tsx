'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Restaurant } from '@/lib/types'
import { useToast } from "@/hooks/use-toast"
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useVoting, useUserVote } from '@/hooks/useVoting'
import { useVoters } from '@/hooks/useVoters'
import { Button } from '@/components/ui/button'

type Language = 'en' | 'fi'

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

// Shared Restaurant Card Skeleton for loading states
function RestaurantCardSkeleton() {
  return (
    <div className="h-96 rounded-2xl bg-white/5 animate-pulse" />
  );
}

function ABBNeuralLogo() {
  return (
    <div className="relative group">
      <div className="absolute -inset-20 opacity-30 group-hover:opacity-60 transition-opacity duration-1000">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {[...Array(8)].map((_, i) => {
            const angle = (i * 45) * Math.PI / 180;
            const x1 = 50 + Math.cos(angle) * 30;
            const y1 = 50 + Math.sin(angle) * 30;
            const x2 = 50 + Math.cos(angle) * 50;
            const y2 = 50 + Math.sin(angle) * 50;
            return (
              <line
                key={i}
                x1={`${x1}%`}
                y1={`${y1}%`}
                x2={`${x2}%`}
                y2={`${y2}%`}
                stroke="url(#neural-gradient)"
                strokeWidth="1"
                className="animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            );
          })}
          <defs>
            <linearGradient id="neural-gradient">
              <stop offset="0%" stopColor="#00d4ff" />
              <stop offset="50%" stopColor="#00ff88" />
              <stop offset="100%" stopColor="#ff6b35" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="flex items-center gap-6 relative">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-green-500/20 to-orange-500/20 rounded blur-2xl animate-electric-pulse" />
          <div className="absolute inset-0 border-2 border-cyan-400/30 rounded animate-spin" style={{ animationDuration: '10s' }}>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_#00d4ff]" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-green-400 rounded-full shadow-[0_0_10px_#00ff88]" />
          </div>
          <div className="absolute inset-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded flex items-center justify-center border border-cyan-400/50 group-hover:border-cyan-400 transition-all duration-500">
            <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-green-400 to-orange-500 bg-clip-text text-transparent font-orbitron">
              ABB
            </div>
          </div>
          <div className="absolute inset-0 rounded animate-ping opacity-30" style={{ animationDuration: '2s' }} />
        </div>
        
        <div className="flex flex-col relative">
          <div className="relative">
            <h1 className="text-3xl md:text-4xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-green-400 to-orange-500 font-orbitron">
              WIRED WEDNESDAY
            </h1>
            <div className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-shimmer" />
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs md:text-sm text-cyan-400/70 font-mono uppercase tracking-wider">
              plug in & eat up
            </span>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ABBNeuralRestaurantCard({ 
  restaurant, 
  onVote, 
  userHasVoted, 
  hasVotedForThis, 
  isWinner, 
  isVotingOpen,
  index 
}: any) {
  const [powerLevel, setPowerLevel] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPowerLevel(Math.random() * 100);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="relative group"
      style={{ 
        animationDelay: `${index * 0.1}s`,
        animation: 'gridSlide 0.8s ease-out forwards',
        opacity: 0
      }}
    >
      <div className={cn(
        "absolute -inset-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500",
        isWinner && "opacity-100",
        hasVotedForThis 
          ? "bg-gradient-to-r from-green-400 to-cyan-400 blur-xl animate-electric-pulse" 
          : "bg-gradient-to-r from-cyan-500 to-orange-500 blur-xl"
      )} />
      
      <div className={cn(
        "relative h-full backdrop-blur-xl rounded-lg border-2 transition-all duration-500 overflow-hidden",
        isWinner 
          ? "bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-400" 
          : hasVotedForThis 
            ? "bg-gradient-to-br from-green-500/20 to-cyan-500/20 border-green-400"
            : "bg-slate-900/90 border-cyan-400/30 hover:border-cyan-400",
        "shadow-2xl hover:shadow-[0_0_50px_rgba(0,212,255,0.3)]"
      )}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[linear-gradient(cyan_1px,transparent_1px),linear-gradient(90deg,cyan_1px,transparent_1px)] bg-[size:30px_30px]" />
        </div>

        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
          <div 
            className="h-full bg-gradient-to-r from-cyan-400 via-green-400 to-orange-500 transition-all duration-1000"
            style={{ width: `${powerLevel}%` }}
          />
        </div>
        
        {isWinner && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-4 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-2">
              <span className="animate-spin">⚡</span>
              SYSTEM PRIORITY
            </div>
          </div>
        )}
        
        {restaurant.votes > 0 && (
          <div className="absolute -top-3 -right-3 z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-green-400 rounded blur animate-pulse" />
              <div className="relative bg-slate-900 border-2 border-cyan-400 text-cyan-400 w-14 h-14 rounded flex items-center justify-center font-bold text-xl font-mono">
                {restaurant.votes}
              </div>
            </div>
          </div>
        )}
        
        <div className="p-6 relative">
          <div className="mb-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-2xl font-bold text-cyan-400 font-orbitron flex items-center gap-2">
                {restaurant.name}
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_#00ff88]" />
              </h3>
              {restaurant.url && (
                <a 
                  href={restaurant.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 rounded bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 transition-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-cyan-400">↗</span>
                </a>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-green-400/70 font-mono">NODE:</span>
              <span className="text-cyan-400/70">{restaurant.location || 'GRID-7'}</span>
              <div className="flex gap-1 ml-auto">
                <div className="w-1 h-3 bg-cyan-400/50 animate-pulse" />
                <div className="w-1 h-3 bg-green-400/50 animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-1 h-3 bg-orange-500/50 animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
          
          <div className="mb-4 p-3 bg-slate-950/50 rounded border border-cyan-400/20">
            <div className="text-xs text-green-400 font-mono mb-2">// MENU_DATA_STREAM</div>
            {restaurant.parsedMenu ? (
              <div className="space-y-1 text-cyan-300 text-xs font-mono">
                {restaurant.parsedMenu.split('\n').slice(0, 6).map((line: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-green-400/50">›</span>
                    <span className="truncate">{line}</span>
                  </div>
                ))}
                {restaurant.parsedMenu.split('\n').length > 6 && (
                  <div className="text-green-400/50 text-xs pt-1">
                    // +{restaurant.parsedMenu.split('\n').length - 6} more nodes
                  </div>
                )}
              </div>
            ) : restaurant.rawMenu ? (
              <div className="text-cyan-300/60 text-xs font-mono italic line-clamp-4">
                {restaurant.rawMenu}
              </div>
            ) : (
              <div className="text-orange-500/60 text-sm font-mono">
                [DATA_UNAVAILABLE]
              </div>
            )}
          </div>
          
          <div className="mt-auto">
            {isVotingOpen ? (
              hasVotedForThis ? (
                <div className="flex items-center justify-center gap-2 py-3 px-4 bg-green-500/20 rounded border-2 border-green-400">
                  <span className="text-green-400 font-bold font-mono">✓ NEURAL LINK ACTIVE</span>
                </div>
              ) : (
                <button
                  onClick={onVote}
                  disabled={userHasVoted}
                  className={cn(
                    "w-full py-3 px-4 rounded font-bold font-mono transition-all duration-300 transform relative overflow-hidden",
                    userHasVoted
                      ? "bg-slate-800 border-2 border-slate-600 text-slate-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-cyan-500 to-green-500 text-black hover:shadow-[0_0_30px_rgba(0,212,255,0.5)] hover:scale-105 border-2 border-transparent"
                  )}
                >
                  <span className="relative z-10">
                    {userHasVoted ? "SYSTEM LOCKED" : "INITIALIZE VOTE"}
                  </span>
                  {!userHasVoted && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000" />
                  )}
                </button>
              )
            ) : (
              <div className="text-center py-3 text-orange-500/60 text-sm font-mono">
                [VOTING_OFFLINE]
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface WednesdayPageProps {
  restaurants: Restaurant[]
  language: Language
  setLanguage: (lang: Language) => void
  aiLimited: boolean
}

export function WednesdayPage({ restaurants, language, setLanguage, aiLimited }: WednesdayPageProps) {
  const { toast } = useToast()
  const router = useRouter()

  const { restaurants: backendRestaurants, winner, loading: votingLoading, vote, removeVote, refetch } = useVoting()
  const { hasVoted, votedRestaurantId, refreshVoteStatus } = useUserVote()
  const { voters, refetchVoters } = useVoters()

  const isVotingOpen = useMemo(() => {
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay()
    return day >= 1 && day <= 5 && hour >= 7 && hour < 12
  }, [])

  const handleRemoveVote = async () => {
    const result = await removeVote()
    if (result.success) {
      await Promise.all([refetch(), refreshVoteStatus(), refetchVoters()])
      toast({
        title: "Vote Terminated ⚡",
        description: "Your vote has been removed.",
      })
    } else {
      toast({
        title: "Failed to Remove Vote",
        description: result.error || "Failed to remove vote.",
        variant: "destructive",
      })
    }
  }

  const handleVote = async (id: string) => {
    if (!isVotingOpen) return

    const result = await vote(id)
    if (result.success) {
      await Promise.all([refetch(), refreshVoteStatus(), refetchVoters()])
      
      const restaurantName = restaurants.find(r => r.id === id)?.name
      toast({
        title: "Neural Link Established ⚡",
        description: `You voted for ${restaurantName}.`,
      })
    } else {
      toast({
        title: "Vote Failed",
        description: result.error || "Failed to cast vote.",
        variant: "destructive",
      })
    }
  }

  const mergedRestaurants = useMemo(() => {
    if (!backendRestaurants.length) return restaurants
    
    return restaurants.map(restaurant => {
      const backendRestaurant = backendRestaurants.find((br: any) => br.name === restaurant.name)
      return {
        ...restaurant,
        votes: backendRestaurant?.votes || 0,
        id: backendRestaurant?.id || restaurant.id
      }
    }).sort((a, b) => b.votes - a.votes)
  }, [restaurants, backendRestaurants])

  return (
    <>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
        {/* Background effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(cyan_1px,transparent_1px),linear-gradient(90deg,cyan_1px,transparent_1px)] bg-[size:100px_100px] opacity-[0.03]" />
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
        </div>

        {/* Header */}
        <header className="backdrop-blur-2xl sticky top-0 z-50 bg-slate-900/80 border-b-2 border-cyan-400/30">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/20 via-transparent to-orange-900/20" />
          
          <div className="relative container mx-auto px-6 py-8">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
              <ABBNeuralLogo />
              
              <div className="flex flex-col items-center lg:items-end gap-4">
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wider mb-1 text-cyan-400/60 font-mono">
                      Wednesday Protocol
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
                        "text-sm font-bold font-mono",
                        isVotingOpen ? "text-green-400" : "text-red-400"
                      )}>
                        {isVotingOpen ? "SYSTEM ONLINE" : "SYSTEM OFFLINE"}
                      </span>
                    </div>
                  </div>
                  
                  <div className="relative group">
                    <div className="absolute -inset-2 rounded blur-lg opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-cyan-500/20 to-green-500/20" />
                    <Tabs 
                      value={language} 
                      onValueChange={(v) => setLanguage(v as Language)} 
                      className="relative"
                    >
                      <TabsList className="backdrop-blur-xl bg-slate-900 border-2 border-cyan-400/30">
                        <TabsTrigger 
                          value="en" 
                          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-green-500 data-[state=active]:text-black text-cyan-400/60 font-mono font-bold"
                        >
                          EN
                        </TabsTrigger>
                        <TabsTrigger 
                          value="fi" 
                          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-green-500 data-[state=active]:text-black text-cyan-400/60 font-mono font-bold"
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
            <div className="mb-8 p-4 rounded bg-orange-500/10 border-2 border-orange-500/50 text-orange-400">
              <div className="flex items-center gap-3 font-mono">
                <span className="text-2xl animate-pulse">⚠</span>
                <p>NEURAL PROCESSING LIMITED - Automatic parsing queued for next cycle.</p>
              </div>
            </div>
          )}

          {/* Voters section */}
          {voters.count > 0 && (
            <div className="mb-12 p-6 backdrop-blur-xl rounded bg-slate-900/80 border-2 border-cyan-400/30">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold flex items-center gap-3 text-cyan-400 font-mono">
                  <span className="animate-pulse">◆</span>
                  {voters.count} NEURAL CONNECTIONS ACTIVE
                </h3>
                {hasVoted && (
                  <button
                    onClick={handleRemoveVote}
                    className="px-4 py-2 transition-all duration-300 rounded bg-red-500/20 border-2 border-red-500 text-red-400 hover:bg-red-500/30 font-mono font-bold"
                  >
                    TERMINATE CONNECTION
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {voters.names.map((name, i) => (
                  <div
                    key={i}
                    className="px-3 py-1.5 backdrop-blur-xl text-sm rounded bg-cyan-500/20 border border-cyan-400/50 text-cyan-400 font-mono"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Restaurant grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {votingLoading ? (
              [...Array(6)].map((_, i) => (
                <RestaurantCardSkeleton key={i} />
              ))
            ) : mergedRestaurants.length === 0 ? (
              <div className="col-span-full text-center py-12 text-orange-500/60 font-mono">
                [NO_DATA_NODES_AVAILABLE]
              </div>
            ) : (
              mergedRestaurants.map((restaurant, index) => (
                <ABBNeuralRestaurantCard
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
        <footer className="relative mt-20 py-8 backdrop-blur-xl bg-slate-900/80 border-t-2 border-cyan-400/30">
          <div className="container mx-auto text-center">
            <p className="text-sm text-cyan-400/40 font-mono">
              © 2100 ABB NEURAL SYSTEMS • PRECISION AUTOMATED • GRID CONNECTED
            </p>
          </div>
        </footer>
      </div>

      {/* Global styles for animations */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        
        .font-orbitron {
          font-family: 'Orbitron', monospace;
        }
        
        @keyframes electric-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        
        @keyframes gridSlide {
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        
        .animate-electric-pulse {
          animation: electric-pulse 2s ease-in-out infinite;
        }
        
        .animate-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #00d4ff, #00ff88);
          border-radius: 3px;
        }
      `}</style>
    </>
  )
}
