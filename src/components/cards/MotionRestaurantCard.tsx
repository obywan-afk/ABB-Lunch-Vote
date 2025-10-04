import { cn } from '@/lib/utils'

interface MotionRestaurantCardProps {
  restaurant: any
  onVote: () => void
  userHasVoted: boolean
  hasVotedForThis: boolean
  isWinner: boolean
  isVotingOpen: boolean
  index: number
}

export function MotionRestaurantCard({ 
  restaurant, 
  onVote, 
  userHasVoted, 
  hasVotedForThis, 
  isWinner, 
  isVotingOpen,
  index 
}: MotionRestaurantCardProps) {
  return (
    <div 
      className="relative group h-full"
      style={{ 
        animationDelay: `${index * 0.1}s`,
        animation: 'slideUp 0.8s ease-out forwards',
        opacity: 0
      }}
    >
      <div className={cn(
        "absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 blur-xl pointer-events-none",
        isWinner && "opacity-100 animate-pulse",
        hasVotedForThis ? "bg-gradient-to-r from-green-500 to-emerald-500" : "bg-gradient-to-r from-violet-500 to-cyan-500"
      )} />
      
      <div className={cn(
        "relative backdrop-blur-xl rounded-2xl border transition-all duration-500",
        isWinner 
          ? "bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30" 
          : hasVotedForThis 
            ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30"
            : "bg-white/10 border-white/20 hover:bg-white/20",
        "shadow-2xl hover:shadow-3xl hover:scale-[1.02]",
        "flex flex-col"
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
        
        <div className="p-6 flex flex-col flex-grow">
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
          
          <div className="mb-4 flex-grow">
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
          
          <div className="mt-4">
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
  )
}
