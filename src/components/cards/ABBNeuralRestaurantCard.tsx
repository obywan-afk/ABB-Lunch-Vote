import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { getMenuDateLabel } from '@/lib/menuDateLabel'

interface ABBNeuralRestaurantCardProps {
  restaurant: any
  onVote: () => void
  userHasVoted: boolean
  hasVotedForThis: boolean
  isWinner: boolean
  isVotingOpen: boolean
  index: number
}

export function ABBNeuralRestaurantCard({ 
  restaurant, 
  onVote, 
  userHasVoted, 
  hasVotedForThis, 
  isWinner, 
  isVotingOpen,
  index 
}: ABBNeuralRestaurantCardProps) {
  const [powerLevel, setPowerLevel] = useState(0)
  const menuDateLabel = getMenuDateLabel(restaurant.fetchedForDate)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPowerLevel(Math.random() * 100)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div 
      className="relative group h-full"
      style={{ 
        animationDelay: `${index * 0.1}s`,
        animation: 'gridSlide 0.8s ease-out forwards',
        opacity: 0
      }}
    >
      <div className={cn(
        "absolute -inset-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none",
        isWinner && "opacity-100",
        hasVotedForThis 
          ? "bg-gradient-to-r from-green-400 to-cyan-400 blur-xl animate-electric-pulse" 
          : "bg-gradient-to-r from-cyan-500 to-orange-500 blur-xl"
      )} />
      
      <div className={cn(
        "relative backdrop-blur-xl rounded-lg border-2 transition-all duration-500 overflow-hidden",
        isWinner 
          ? "bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-400" 
          : hasVotedForThis 
            ? "bg-gradient-to-br from-green-500/20 to-cyan-500/20 border-green-400"
            : "bg-slate-900/90 border-cyan-400/30 hover:border-cyan-400",
        "shadow-2xl hover:shadow-[0_0_50px_rgba(0,212,255,0.3)]",
        "flex flex-col"
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
        
        <div className="p-6 relative flex flex-col flex-grow">
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
              <div className="ml-auto flex items-center gap-2">
                {menuDateLabel && (
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-cyan-100/80">
                    Menu {menuDateLabel}
                  </span>
                )}
                <div className="flex gap-1">
                  <div className="w-1 h-3 bg-cyan-400/50 animate-pulse" />
                  <div className="w-1 h-3 bg-green-400/50 animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-1 h-3 bg-orange-500/50 animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-4 p-3 bg-slate-950/50 rounded border border-cyan-400/20 flex-grow">
            <div className="text-xs text-green-400 font-mono mb-2">// MENU_DATA_STREAM</div>
            {restaurant.parsedMenu ? (
              <div className="space-y-1 text-cyan-300 text-xs font-mono">
                {restaurant.parsedMenu.split('\n').map((line: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-green-400/50">›</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            ) : restaurant.rawMenu ? (
              <div className="text-cyan-300/60 text-xs font-mono italic">
                {restaurant.rawMenu}
              </div>
            ) : (
              <div className="text-orange-500/60 text-sm font-mono">
                [DATA_UNAVAILABLE]
              </div>
            )}
          </div>
          
          <div className="mt-4">
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
  )
}
