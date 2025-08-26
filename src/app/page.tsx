'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Restaurant } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useVoting, useUserVote } from '@/hooks/useVoting';
import { useVoters } from '@/hooks/useVoters';
import { Button } from '@/components/ui/button';

type Language = 'en' | 'fi';
type DevDay = '' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'



// ============= SHARED COMPONENTS =============

// Shared Restaurant Card Skeleton for loading states
function RestaurantCardSkeleton() {
  return (
    <div className="h-96 rounded-2xl bg-white/5 animate-pulse" />
  );
}

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


// ============= MONDAY: MOTION DESIGN THEME =============

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
              Lunch Lab
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

// ============= TUESDAY: ABB NEURAL GRID THEME =============

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
              <span className="animate-spin">⚡</span> SYSTEM PRIORITY
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
          
          <div className="mb-4 p-3 bg-slate-950/50 rounded border border-cyan-400/20 max-h-64 overflow-y-auto custom-scrollbar">
            <div className="text-xs text-green-400 font-mono mb-2">// MENU_DATA_STREAM</div>
            {restaurant.parsedMenu ? (
              <div className="space-y-2 text-cyan-300 text-sm font-mono">
                {restaurant.parsedMenu.split('\n').map((line: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-green-400/50">›</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            ) : restaurant.rawMenu ? (
              <div className="text-cyan-300/60 text-sm font-mono italic">
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

// ============= MAIN COMPONENT =============

export default function Home() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('en');
  const { toast } = useToast();
  const router = useRouter();
  const [aiLimited, setAiLimited] = useState(false);

  type DevDay = '' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

const dayByIndex: Record<number, DevDay> = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
};

  // Theme detection - use actual day or override for testing
  const currentDay = new Date().getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
  
  // Development override - set to '' to use actual day, or force a specific day
  const dayOverride: DevDay = ''; // Set to 'monday' or 'tuesday' to test themes
  const fresh = false;

  // Theme = Neural on Wednesday; otherwise Motion
const isTuesdayTheme = (dayOverride ? dayOverride === 'wednesday' : currentDay === 3);

// The day we actually want to FETCH from the API (use real weekday unless overridden)
const requestedDay: DevDay = dayOverride || dayByIndex[currentDay] || 'wednesday';





  const { restaurants: backendRestaurants, winner, loading: votingLoading, vote, removeVote, refetch } = useVoting();
  const { hasVoted, votedRestaurantId, refreshVoteStatus } = useUserVote();
  const { voters, refetchVoters } = useVoters();

  const isVotingOpen = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    return day >= 1 && day <= 5 && hour >= 7 && hour < 12;
  }, []);

  const handleRemoveVote = async () => {
    const result = await removeVote();
    if (result.success) {
      await Promise.all([refetch(), refreshVoteStatus(), refetchVoters()]);
      toast({
        title: isTuesdayTheme ? "Vote Terminated ⚡" : "Vote Removed! 🔄",
        description: "Your vote has been removed.",
      });
    } else {
      toast({
        title: "Failed to Remove Vote",
        description: result.error || "Failed to remove vote.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('abb-lunch-vote-auth') === 'true';
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    const fetchProcessedMenus = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ language });
params.set('day', requestedDay);
        if (fresh) params.set('fresh', 'true');

        const response = await fetch(`/api/menus?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          const processedRestaurants: Restaurant[] = data.restaurants.map((r: any) => ({
  id: r.id,
  name: r.name,
  location: r.location,
  description: r.description,
  rawMenu: stripTiistaiHeader(r.rawMenu),
  parsedMenu: stripTiistaiHeader(r.parsedMenu),
  votes: 0,
  url: r.url || undefined,
  status: r.status,
  rawSnippet: stripTiistaiHeader(r.rawSnippet),
}));

          setRestaurants(processedRestaurants);
          setAiLimited(Boolean(data.meta?.aiLimited));
        } else {
          throw new Error(data.error || 'Failed to fetch processed menus');
        }
      } catch (error) {
        console.error('Failed to fetch processed menus:', error);
        toast({
          title: 'Error',
          description: 'Could not load menus. Please try again.',
          variant: 'destructive',
        });
        setRestaurants([]);
      }
      setIsLoading(false);
    };

    fetchProcessedMenus();
}, [language, toast, requestedDay, fresh]);

  const handleVote = async (id: string) => {
    if (!isVotingOpen) return;

    const result = await vote(id);
    if (result.success) {
      await Promise.all([refetch(), refreshVoteStatus(), refetchVoters()]);
      
      const restaurantName = restaurants.find(r => r.id === id)?.name;
      toast({
        title: isTuesdayTheme ? "Neural Link Established ⚡" : "Vote Cast! 🎉",
        description: `You voted for ${restaurantName}.`,
      });
    } else {
      toast({
        title: "Vote Failed",
        description: result.error || "Failed to cast vote.",
        variant: "destructive",
      });
    }
  };

  const mergedRestaurants = useMemo(() => {
    if (!backendRestaurants.length) return restaurants;
    
    return restaurants.map(restaurant => {
      const backendRestaurant = backendRestaurants.find((br: any) => br.name === restaurant.name);
      return {
        ...restaurant,
        votes: backendRestaurant?.votes || 0,
        id: backendRestaurant?.id || restaurant.id
      };
    }).sort((a, b) => b.votes - a.votes);
  }, [restaurants, backendRestaurants]);

  // Render appropriate theme
  return (
    <>
      <div className={cn(
        "min-h-screen relative overflow-hidden",
        isTuesdayTheme 
          ? "bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950" 
          : "bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950"
      )}>
        {/* Background effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {isTuesdayTheme ? (
            <>
              <div className="absolute inset-0 bg-[linear-gradient(cyan_1px,transparent_1px),linear-gradient(90deg,cyan_1px,transparent_1px)] bg-[size:100px_100px] opacity-[0.03]" />
              <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-20 right-1/4 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
              <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
            </>
          ) : (
            <>
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" />
              <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
              <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-3xl animate-pulse" />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
            </>
          )}
        </div>

        {/* Header */}
        <header className={cn(
          "backdrop-blur-2xl sticky top-0 z-50",
          isTuesdayTheme 
            ? "bg-slate-900/80 border-b-2 border-cyan-400/30" 
            : "bg-black/20 border-b border-white/10"
        )}>
          <div className={cn(
            "absolute inset-0",
            isTuesdayTheme 
              ? "bg-gradient-to-r from-cyan-900/20 via-transparent to-orange-900/20" 
              : "bg-gradient-to-r from-violet-900/20 via-transparent to-cyan-900/20"
          )} />
          
          <div className="relative container mx-auto px-6 py-8">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
              {isTuesdayTheme ? <ABBNeuralLogo /> : <MotionLogo />}
              
              <div className="flex flex-col items-center lg:items-end gap-4">
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className={cn(
                      "text-xs uppercase tracking-wider mb-1",
                      isTuesdayTheme ? "text-cyan-400/60 font-mono" : "text-white/60"
                    )}>
                      {isTuesdayTheme ? "Wednesday Protocol" : "Monday Edition"}
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
                        "text-sm",
                        isTuesdayTheme ? "font-bold font-mono" : "font-medium",
                        isVotingOpen ? "text-green-400" : "text-red-400"
                      )}>
                        {isVotingOpen 
                          ? (isTuesdayTheme ? "SYSTEM ONLINE" : "VOTING ACTIVE") 
                          : (isTuesdayTheme ? "SYSTEM OFFLINE" : "VOTING CLOSED")}
                      </span>
                    </div>
                  </div>
                  
                  <div className="relative group">
                    <div className={cn(
                      "absolute -inset-2 rounded blur-lg opacity-0 group-hover:opacity-100 transition-opacity",
                      isTuesdayTheme 
                        ? "bg-gradient-to-r from-cyan-500/20 to-green-500/20" 
                        : "bg-gradient-to-r from-violet-500/20 to-cyan-500/20 rounded-xl"
                    )} />
                    <Tabs 
                      value={language} 
                      onValueChange={(v) => setLanguage(v as Language)} 
                      className="relative"
                    >
                      <TabsList className={cn(
                        "backdrop-blur-xl",
                        isTuesdayTheme 
                          ? "bg-slate-900 border-2 border-cyan-400/30" 
                          : "bg-white/5 border border-white/10"
                      )}>
                        <TabsTrigger 
                          value="en" 
                          className={cn(
                            isTuesdayTheme 
                              ? "data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-green-500 data-[state=active]:text-black text-cyan-400/60 font-mono font-bold"
                              : "data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white text-white/60"
                          )}
                        >
                          EN
                        </TabsTrigger>
                        <TabsTrigger 
                          value="fi" 
                          className={cn(
                            isTuesdayTheme 
                              ? "data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-green-500 data-[state=active]:text-black text-cyan-400/60 font-mono font-bold"
                              : "data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white text-white/60"
                          )}
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
            <div className={cn(
              "mb-8 p-4 rounded",
              isTuesdayTheme 
                ? "bg-orange-500/10 border-2 border-orange-500/50 text-orange-400"
                : "rounded-2xl backdrop-blur-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400"
            )}>
              <div className={cn(
                "flex items-center gap-3",
                isTuesdayTheme && "font-mono"
              )}>
                <span className="text-2xl animate-pulse">{isTuesdayTheme ? "⚠" : "⚠️"}</span>
                <p>{isTuesdayTheme 
                  ? "NEURAL PROCESSING LIMITED - Automatic parsing queued for next cycle."
                  : "AI parsing is rate-limited. Menus will be parsed automatically when available."}</p>
              </div>
            </div>
          )}

          {/* Voters section */}
          {voters.count > 0 && (
            <div className={cn(
              "mb-12 p-6 backdrop-blur-xl",
              isTuesdayTheme 
                ? "rounded bg-slate-900/80 border-2 border-cyan-400/30"
                : "rounded-2xl bg-white/5 border border-white/10"
            )}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={cn(
                  "text-xl font-bold flex items-center gap-3",
                  isTuesdayTheme ? "text-cyan-400 font-mono" : "text-white"
                )}>
                  {isTuesdayTheme ? (
                    <>
                      <span className="animate-pulse">◆</span>
                      {voters.count} NEURAL CONNECTIONS ACTIVE
                    </>
                  ) : (
                    <>
                      <span className="text-3xl">🗳️</span>
                      {voters.count} {voters.count === 1 ? 'Vote Cast' : 'Votes Cast'}
                    </>
                  )}
                </h3>
                {hasVoted && (
                  <button
                    onClick={handleRemoveVote}
                    className={cn(
                      "px-4 py-2 transition-all duration-300",
                      isTuesdayTheme 
                        ? "rounded bg-red-500/20 border-2 border-red-500 text-red-400 hover:bg-red-500/30 font-mono font-bold"
                        : "rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                    )}
                  >
                    {isTuesdayTheme ? "TERMINATE CONNECTION" : "Remove My Vote"}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {voters.names.map((name, i) => (
                  <div
                    key={i}
                    className={cn(
                      "px-3 py-1.5 backdrop-blur-xl text-sm",
                      isTuesdayTheme 
                        ? "rounded bg-cyan-500/20 border border-cyan-400/50 text-cyan-400 font-mono"
                        : "rounded-full bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-white/20 text-white/80"
                    )}
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
            {isLoading || votingLoading ? (
              [...Array(6)].map((_, i) => (
                <RestaurantCardSkeleton key={i} />
              ))
            ) : mergedRestaurants.length === 0 ? (
              <div className={cn(
                "col-span-full text-center py-12",
                isTuesdayTheme ? "text-orange-500/60 font-mono" : "text-white/40"
              )}>
                {isTuesdayTheme ? "[NO_DATA_NODES_AVAILABLE]" : "No restaurants available"}
              </div>
            ) : (
              mergedRestaurants.map((restaurant, index) => (
                isTuesdayTheme ? (
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
                ) : (
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
                )
              ))
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className={cn(
          "relative mt-20 py-8 backdrop-blur-xl",
          isTuesdayTheme 
            ? "bg-slate-900/80 border-t-2 border-cyan-400/30" 
            : "bg-black/30 border-t border-white/10"
        )}>
          <div className="container mx-auto text-center">
            <p className={cn(
              "text-sm",
              isTuesdayTheme ? "text-cyan-400/40 font-mono" : "text-white/40"
            )}>
              {isTuesdayTheme 
                ? "© 2100 ABB NEURAL SYSTEMS • PRECISION AUTOMATED • GRID CONNECTED"
                : `© ${new Date().getFullYear()} MOTION DESIGN TEAM • Crafted with precision`}
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
        
        @keyframes electric-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        
        @keyframes electric-flow {
          0% { transform: translateY(-100%) rotate(0deg); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(100vh) rotate(5deg); opacity: 0; }
        }
        
        @keyframes gridSlide {
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
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
        
        .animate-electric-pulse {
          animation: electric-pulse 2s ease-in-out infinite;
        }
        
        .animate-electric-flow {
          animation: electric-flow 4s linear infinite;
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
  );
}