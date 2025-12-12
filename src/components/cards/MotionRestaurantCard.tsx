import { cn } from '@/lib/utils'
import { getMenuDateLabel } from '@/lib/menuDateLabel'

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
  const isCache = Boolean(restaurant.fromCache);
  const menuDateLabel = getMenuDateLabel(restaurant.fetchedForDate)

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
        "relative flex h-full flex-col overflow-hidden rounded-2xl border transition-all duration-300 will-change-transform backdrop-blur-lg",
        isWinner 
          ? "border-cyan-300/60 bg-white/10 shadow-[0_25px_80px_-50px_rgba(0,0,0,0.8)] hover:-translate-y-1 hover:shadow-[0_35px_120px_-60px_rgba(56,189,248,0.4)]"
          : hasVotedForThis 
            ? "border-emerald-300/50 bg-white/5 shadow-[0_25px_80px_-60px_rgba(0,0,0,0.8)] hover:-translate-y-1"
            : "border-white/10 bg-white/5 shadow-[0_25px_80px_-70px_rgba(0,0,0,0.8)] hover:-translate-y-1 hover:shadow-[0_30px_120px_-80px_rgba(14,165,233,0.4)]",
      )}>
        {isWinner && (
          <div className="absolute left-0 top-0 rounded-br-xl rounded-tl-2xl bg-gradient-to-r from-cyan-400 to-violet-400 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-900 shadow-sm">
            Top pick
          </div>
        )}
        
        {restaurant.votes > 0 && (
          <div className="absolute right-3 top-3 flex items-center justify-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/20 backdrop-blur">
            {restaurant.votes} {restaurant.votes === 1 ? 'vote' : 'votes'}
          </div>
        )}
        
        <div className="flex flex-grow flex-col gap-4 p-6">
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-xl font-bold text-white">
              {restaurant.name}
              {restaurant.url && (
                <a 
                  href={restaurant.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm text-white transition hover:border-white/30 hover:bg-white/20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span aria-hidden="true">↗</span>
                  <span className="sr-only">Open menu</span>
                </a>
              )}
            </h3>
            <p className="flex items-center gap-2 text-sm text-white/70">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {restaurant.location || 'Location TBD'}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/80">
                {isCache ? 'Cached' : 'Live'}
              </span>
              {menuDateLabel && (
                <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/70">
                  Menu {menuDateLabel}
                </span>
              )}
              {restaurant.statusNote && (
                <span className="rounded-full border border-amber-300/40 bg-amber-300/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-100">
                  {restaurant.statusNote}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex-grow">
            {restaurant.parsedMenu ? (
              <div className="space-y-2 text-sm text-white/80">
                {restaurant.parsedMenu.split('\n').map((line: string, i: number) => (
                  <div 
                    key={i} 
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/90"
                  >
                    {line}
                  </div>
                ))}
              </div>
            ) : restaurant.rawMenu ? (
              <div className="text-sm italic text-white/70">
                {restaurant.rawMenu}
              </div>
            ) : (
              <div className="text-sm italic text-white/40">
                Menu information unavailable
              </div>
            )}
          </div>
          
          <div className="mt-2">
            {isVotingOpen ? (
              hasVotedForThis ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300/40 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100">
                  <span>✓ Your choice</span>
                </div>
              ) : (
                <button
                  onClick={onVote}
                  disabled={userHasVoted}
                  className={cn(
                    "w-full rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400",
                    userHasVoted
                      ? "cursor-not-allowed border border-white/10 bg-white/5 text-white/40"
                      : "border border-cyan-400/80 bg-gradient-to-r from-indigo-500 to-cyan-400 text-white shadow-[0_20px_50px_-30px_rgba(59,130,246,0.8)] hover:from-indigo-400 hover:to-cyan-300"
                  )}
                >
                  {userHasVoted ? "Already voted" : "Cast vote"}
                </button>
              )
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 py-3 text-center text-sm font-semibold text-white/60">
                Voting closed
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
