import { useState } from 'react'
import { cn } from '@/lib/utils'
import { getMenuDateLabel } from '@/lib/menuDateLabel'

interface RetroRestaurantCardProps {
  restaurant: any
  onVote: () => void
  userHasVoted: boolean
  hasVotedForThis: boolean
  isWinner: boolean
  isVotingOpen: boolean
  index: number
}

export function RetroRestaurantCard({ 
  restaurant, 
  onVote, 
  userHasVoted, 
  hasVotedForThis, 
  isWinner, 
  isVotingOpen,
  index 
}: RetroRestaurantCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const menuDateLabel = getMenuDateLabel(restaurant.fetchedForDate)
  
  return (
    <div 
      className="relative group perspective-1000 h-full"
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
        "absolute -inset-1 rounded-lg opacity-60 group-hover:opacity-100 transition-all duration-500 blur-xl pointer-events-none",
        isWinner && "opacity-100 animate-pulse",
        hasVotedForThis 
          ? "bg-gradient-to-r from-cyan-500 to-pink-500" 
          : "bg-gradient-to-r from-purple-600 to-pink-600"
      )} />
      
      {/* Main card with transform */}
      <div className={cn(
        "relative rounded-lg border-2 transition-all duration-500 transform-gpu",
        isWinner 
          ? "bg-gradient-to-br from-yellow-900/40 via-pink-900/40 to-purple-900/40 border-yellow-400/60" 
          : hasVotedForThis 
            ? "bg-gradient-to-br from-cyan-900/40 via-purple-900/40 to-pink-900/40 border-cyan-400/60"
            : "bg-gradient-to-br from-purple-950/60 via-pink-950/60 to-black/80 border-purple-500/40",
        "backdrop-blur-md shadow-2xl",
        isHovered && "scale-[1.02] rotate-y-5",
        "flex flex-col"
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
        
        <div className="p-6 relative z-10 flex flex-col flex-grow">
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
              {menuDateLabel && (
                <span className="rounded-full border border-pink-400/40 bg-pink-500/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.3em] text-pink-100/80">
                  Menu {menuDateLabel}
                </span>
              )}
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
          
          {/* Menu display with retro terminal style */}
          <div className="mb-6 p-4 bg-black/50 rounded border border-cyan-500/30 flex-grow">
            <div className="font-mono text-xs text-cyan-400 mb-2 opacity-60">
              ▸ MENU.TXT
            </div>
            {restaurant.parsedMenu ? (
              <div className="space-y-1 text-green-400 text-xs font-mono">
                {restaurant.parsedMenu.split('\n').map((line: string, i: number) => (
                  <div key={i} className="flex">
                    <span className="text-purple-400/60 mr-2 select-none">{String(i + 1).padStart(2, '0')}</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            ) : restaurant.rawMenu ? (
              <div className="text-yellow-400/80 text-xs font-mono">
                {restaurant.rawMenu}
              </div>
            ) : (
              <div className="text-red-400/60 text-sm font-mono animate-pulse">
                ERROR: MENU_DATA_NOT_FOUND
              </div>
            )}
          </div>
          
          {/* Vote button with retro style */}
          <div className="mt-4">
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
  )
}
