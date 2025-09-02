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

// VHS Logo Component
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
  );
}

// Retro Restaurant Card
function RetroRestaurantCard({ 
  restaurant, 
  onVote, 
  userHasVoted, 
  hasVotedForThis, 
  isWinner, 
  isVotingOpen,
  index 
}: any) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className="relative group perspective-1000"
      style={{ 
        animationDelay: `${index * 0.1}s`,
        animation: 'fadeInUp 0.8s ease-out forwards',
        opacity: 0
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Neon glow background */}
      <div className={cn(
        "absolute -inset-1 rounded-lg opacity-60 group-hover:opacity-100 transition-all duration-500 blur-xl",
        isWinner && "opacity-100 animate-pulse",
        hasVotedForThis 
          ? "bg-gradient-to-r from-cyan-500 to-pink-500" 
          : "bg-gradient-to-r from-purple-600 to-pink-600"
      )} />
      
      {/* Main card with transform */}
      <div className={cn(
        "relative h-full rounded-lg border-2 transition-all duration-500 transform-gpu",
        isWinner 
          ? "bg-gradient-to-br from-yellow-900/40 via-pink-900/40 to-purple-900/40 border-yellow-400/60" 
          : hasVotedForThis 
            ? "bg-gradient-to-br from-cyan-900/40 via-purple-900/40 to-pink-900/40 border-cyan-400/60"
            : "bg-gradient-to-br from-purple-950/60 via-pink-950/60 to-black/80 border-purple-500/40",
        "backdrop-blur-md shadow-2xl",
        isHovered && "scale-[1.02] rotate-y-5"
      )}>
        
        {/* Scan lines overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent animate-scan" />
        </div>
        
        {/* VHS tracking noise */}
        <div className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-30">
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence baseFrequency='0.9' /%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`
            }}
          />
        </div>
        
        {/* Winner badge */}
        {isWinner && (
          <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-pink-400 blur animate-pulse" />
              <div className="relative bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 text-black px-6 py-2 font-black text-xs tracking-wider shadow-xl transform skew-x-12">
                ★ WINNER ★
              </div>
            </div>
          </div>
        )}
        
        {/* Vote counter */}
        {restaurant.votes > 0 && (
          <div className="absolute -top-3 -right-3 z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full blur-md animate-pulse" />
              <div className="relative bg-gradient-to-r from-pink-600 to-purple-600 text-white w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shadow-2xl border-2 border-white/30">
                {restaurant.votes}
              </div>
            </div>
          </div>
        )}
        
        <div className="p-6 relative z-10">
          {/* Header with chrome text */}
          <div className="mb-6">
            <h3 className="text-3xl font-black italic mb-2 relative inline-block">
              <span className="absolute inset-0 text-pink-400 blur-sm">{restaurant.name}</span>
              <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-200 to-cyan-200">
                {restaurant.name}
              </span>
            </h3>
            
            <div className="flex items-center gap-3 text-sm">
              <span className="text-cyan-400 font-mono">▸</span>
              <span className="text-purple-300/80">{restaurant.location || 'LOCATION_NULL'}</span>
              {restaurant.url && (
                <a 
                  href={restaurant.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-auto px-3 py-1 bg-gradient-to-r from-purple-600/50 to-pink-600/50 rounded border border-pink-400/30 text-white/80 hover:text-white transition-colors text-xs font-mono"
                  onClick={(e) => e.stopPropagation()}
                >
                  WWW
                </a>
              )}
            </div>
          </div>
          
          {/* Menu display with retro terminal style - no scroll */}
          <div className="mb-6 p-4 bg-black/50 rounded border border-cyan-500/30">
            <div className="font-mono text-xs text-cyan-400 mb-2 opacity-60">
              ▸ MENU.TXT
            </div>
            {restaurant.parsedMenu ? (
              <div className="space-y-1 text-green-400 text-xs font-mono">
                {restaurant.parsedMenu.split('\n').slice(0, 6).map((line: string, i: number) => (
                  <div key={i} className="flex">
                    <span className="text-purple-400/60 mr-2 select-none">{String(i + 1).padStart(2, '0')}</span>
                    <span className="truncate">{line}</span>
                  </div>
                ))}
                {restaurant.parsedMenu.split('\n').length > 6 && (
                  <div className="text-purple-400/60 text-xs pt-1">
                    ... +{restaurant.parsedMenu.split('\n').length - 6} more items
                  </div>
                )}
              </div>
            ) : restaurant.rawMenu ? (
              <div className="text-yellow-400/80 text-xs font-mono line-clamp-4">
                {restaurant.rawMenu}
              </div>
            ) : (
              <div className="text-red-400/60 text-sm font-mono animate-pulse">
                ERROR: MENU_DATA_NOT_FOUND
              </div>
            )}
          </div>
          
          {/* Vote button with retro style */}
          <div className="mt-auto">
            {isVotingOpen ? (
              hasVotedForThis ? (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-pink-500 blur-md opacity-50" />
                  <div className="relative flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-cyan-600/30 to-pink-600/30 rounded border-2 border-cyan-400/60">
                    <span className="text-cyan-300 font-black tracking-wider">◆ SELECTED ◆</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={onVote}
                  disabled={userHasVoted}
                  className={cn(
                    "relative w-full py-3 px-4 rounded font-black tracking-wider transition-all duration-300 transform group/btn overflow-hidden",
                    userHasVoted
                      ? "bg-gray-900/50 border-2 border-gray-600/30 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-pink-600/50 to-purple-600/50 border-2 border-pink-400/60 text-white hover:scale-105 hover:border-cyan-400/80"
                  )}
                >
                  {/* Button glow effect */}
                  {!userHasVoted && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                  )}
                  <span className="relative">
                    {userHasVoted ? "ACCESS_DENIED" : "▸ CAST VOTE"}
                  </span>
                </button>
              )
            ) : (
              <div className="text-center py-3 text-red-400/60 text-sm font-mono animate-pulse">
                [VOTING_CLOSED]
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ThursdayPageProps {
  restaurants: Restaurant[]
  language: Language
  setLanguage: (lang: Language) => void
  aiLimited: boolean
}

export function ThursdayPage({ restaurants, language, setLanguage, aiLimited }: ThursdayPageProps) {
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
        title: "Vote Removed",
        description: "Your vote has been cleared from the system.",
      })
    } else {
      toast({
        title: "Error",
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
        title: "Vote Registered",
        description: `Selected: ${restaurantName}`,
      })
    } else {
      toast({
        title: "Error",
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
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {votingLoading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="h-96 rounded-lg bg-gradient-to-br from-purple-950/40 to-pink-950/40 animate-pulse border-2 border-purple-500/20" />
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
            <div className="flex justify-between items-center">
              <p className="font-mono text-xs text-purple-400/60 tracking-wider">
                © SYSTEM_1998 // FLUORESCENT_NIGHTS_V2.0 // ALL_RIGHTS_RESERVED // LARS OBERHOFER
              </p>
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
        
        /* Custom scrollbar with neon style */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 0, 255, 0.2);
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #ec4899, #8b5cf6);
          border-radius: 0;
          box-shadow: 0 0 10px rgba(236, 72, 153, 0.5);
        }
        
        /* Chrome text effect helper */
        .chrome-text {
          background: linear-gradient(
            180deg,
            #fff 0%,
            #999 50%,
            #fff 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
        }
        
        /* VHS glitch effect on hover */
        @keyframes glitch {
          0%, 100% {
            text-shadow: 
              2px 2px 0 rgba(255, 0, 255, 0.8),
              -2px -2px 0 rgba(0, 255, 255, 0.8);
          }
          25% {
            text-shadow: 
              -2px 2px 0 rgba(255, 0, 255, 0.8),
              2px -2px 0 rgba(0, 255, 255, 0.8);
          }
          50% {
            text-shadow: 
              2px -2px 0 rgba(255, 0, 255, 0.8),
              -2px 2px 0 rgba(0, 255, 255, 0.8);
          }
        }
        
        .glitch-hover:hover {
          animation: glitch 0.3s infinite;
        }
      `}</style>
    </>
  )
}