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

function MotionLogo() {
  return (
    <div className="relative group cursor-pointer">
      <div className="absolute -inset-10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.2}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <div className="flex items-center gap-6 relative">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 to-cyan-600/30 rounded-full blur-xl animate-morph" />
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '20s' }}>
            <div className="absolute inset-0 border-2 border-transparent border-t-cyan-400/40 border-r-purple-400/40 rounded-full" />
          </div>
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }}>
            <div className="absolute inset-2 border border-transparent border-b-pink-400/30 border-l-orange-400/30 rounded-full" />
          </div>
          <div className="absolute inset-3 bg-gradient-to-br from-white to-white/80 rounded-full shadow-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
            <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-full animate-pulse" />
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
  );
}

function MotionRestaurantCard({ 
  restaurant, 
  onVote, 
  userHasVoted, 
  hasVotedForThis, 
  isWinner, 
  isVotingOpen,
  index 
}: any) {
  return (
    <div 
      className="relative group"
      style={{ 
        animationDelay: `${index * 0.1}s`,
        animation: 'slideUp 0.8s ease-out forwards',
        opacity: 0
      }}
    >
      <div className={cn(
        "absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 blur-xl",
        isWinner && "opacity-100 animate-pulse",
        hasVotedForThis ? "bg-gradient-to-r from-green-500 to-emerald-500" : "bg-gradient-to-r from-violet-500 to-cyan-500"
      )} />
      
      <div className={cn(
        "relative h-full backdrop-blur-xl rounded-2xl border transition-all duration-500",
        isWinner 
          ? "bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30" 
          : hasVotedForThis 
            ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30"
            : "bg-white/10 border-white/20 hover:bg-white/20",
        "shadow-2xl hover:shadow-3xl hover:scale-[1.02]"
      )}>
        {isWinner && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-4 py-1 rounded-full text-xs font-bold shadow-lg animate-bounce">
              👑 WINNER
            </div>
          </div>
        )}
        
        {restaurant.votes > 0 && (
          <div className="absolute -top-3 -right-3 z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full blur animate-pulse" />
              <div className="relative bg-gradient-to-r from-violet-600 to-purple-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-xl">
                {restaurant.votes}
              </div>
            </div>
          </div>
        )}
        
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              {restaurant.name}
              {restaurant.url && (
                <a 
                  href={restaurant.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-sm">🔗</span>
                </a>
              )}
            </h3>
            <p className="text-white/60 text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              {restaurant.location || 'Location TBD'}
            </p>
          </div>
          
          <div className="mb-4 max-h-64 overflow-y-auto custom-scrollbar">
            {restaurant.parsedMenu ? (
              <div className="space-y-2 text-white/80 text-sm">
                {restaurant.parsedMenu.split('\n').map((line: string, i: number) => (
                  <div 
                    key={i} 
                    className="pl-4 border-l-2 border-cyan-400/20 hover:border-cyan-400/50 transition-colors"
                  >
                    {line}
                  </div>
                ))}
              </div>
            ) : restaurant.rawMenu ? (
              <div className="text-white/60 text-sm italic">
                {restaurant.rawMenu}
              </div>
            ) : (
              <div className="text-white/40 text-sm italic">
                Menu information unavailable
              </div>
            )}
          </div>
          
          <div className="mt-auto">
            {isVotingOpen ? (
              hasVotedForThis ? (
                <div className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/30">
                  <span className="text-green-400 font-semibold">✓ Your Choice</span>
                </div>
              ) : (
                <button
                  onClick={onVote}
                  disabled={userHasVoted}
                  className={cn(
                    "w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 transform",
                    userHasVoted
                      ? "bg-white/5 border border-white/10 text-white/40 cursor-not-allowed"
                      : "bg-gradient-to-r from-violet-500 to-cyan-500 text-white hover:from-violet-600 hover:to-cyan-600 hover:scale-105 shadow-lg hover:shadow-xl"
                  )}
                >
                  {userHasVoted ? "Already Voted" : "Cast Vote"}
                </button>
              )
            ) : (
              <div className="text-center py-3 text-white/40 text-sm">
                Voting closed
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TuesdayPageProps {
  restaurants: Restaurant[]
  language: Language
  setLanguage: (lang: Language) => void
  aiLimited: boolean
}

export function TuesdayPage({ restaurants, language, setLanguage, aiLimited }: TuesdayPageProps) {
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
        title: "Vote Removed! 🔄",
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
        title: "Vote Cast! 🎉",
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
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        {/* Background effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
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
              <MotionLogo />
              
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
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
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
          <div className="container mx-auto text-center">
            <p className="text-sm text-white/40">
              © {new Date().getFullYear()} MOTION DESIGN TEAM • Crafted with precision
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
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #8b5cf6, #06b6d4);
          border-radius: 3px;
        }
      `}</style>
    </>
  )
}
