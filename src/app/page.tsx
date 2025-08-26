'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Restaurant } from '@/lib/types';
import { RestaurantCard, RestaurantCardSkeleton } from '@/components/restaurant-card';
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useVoting, useUserVote } from '@/hooks/useVoting';
import { useVoters } from '@/hooks/useVoters';
import { Button } from '@/components/ui/button';

type Language = 'en' | 'fi';

type DevDay = '' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'

// Motion Design Team Logo Component
function MotionDesignLogo() {
  return (
    <div className="flex items-center gap-4">
      {/* Animated Logo */}
      <div className="relative w-12 h-12">
        {/* Outer rotating ring */}
        <div className="absolute inset-0 border-2 border-white/30 rounded-full animate-spin" style={{ animationDuration: '8s' }}>
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-orange-400 rounded-full"></div>
          <div className="absolute top-1/2 -right-1 transform -translate-y-1/2 w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full"></div>
          <div className="absolute top-1/2 -left-1 transform -translate-y-1/2 w-1.5 h-1.5 bg-pink-400 rounded-full"></div>
        </div>
        
        {/* Inner pulsing circle */}
        <div className="absolute inset-2 bg-white/20 rounded-full animate-pulse flex items-center justify-center">
          <div className="w-4 h-4 bg-white rounded-full shadow-lg"></div>
        </div>
        
        {/* Motion trails */}
        <div className="absolute inset-1 border border-white/20 rounded-full animate-ping" style={{ animationDelay: '0.5s', animationDuration: '2s' }}></div>
      </div>
      
      {/* Text Logo */}
      <div className="flex flex-col">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/90 bg-clip-text">
          Motion Lunch
        </h1>
        <span className="text-xs md:text-sm text-white/70 font-medium tracking-wider uppercase">
          Design Team Voting
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('en');
  const { toast } = useToast();
  const router = useRouter();
  const [aiLimited, setAiLimited] = useState(false);

  // 👉 DEV: day override + fresh flag (persisted across reloads)
  const dayOverride: DevDay = 'tuesday'
  const fresh = false // ✅ turn fresh OFF so cache is used


  // Backend hooks
  const { restaurants: backendRestaurants, winner, loading: votingLoading, vote, removeVote, refetch } = useVoting();
  const { hasVoted, votedRestaurantId, refreshVoteStatus } = useUserVote();
  const { voters, refetchVoters } = useVoters(); // Add refetchVoters

const isVotingOpen = useMemo(() => {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Monday-Friday, 7 AM to 12 PM (noon)
  return day >= 1 && day <= 5 && hour >= 7 && hour < 12;
}, []);

  const handleRemoveVote = async () => {
  const result = await removeVote();
  if (result.success) {
    await Promise.all([
      refetch(),
      refreshVoteStatus(),
      refetchVoters() 
    ]);
    
    toast({
      title: "Vote Removed!",
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
    // Check for authentication
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
        params.set('day', dayOverride);
        if (fresh) params.set('fresh', 'true');

        const response = await fetch(`/api/menus?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          const processedRestaurants: Restaurant[] = data.restaurants.map((r: any) => ({
            id: r.id,
            name: r.name,
            location: r.location,
            description: r.description,
            rawMenu: r.rawMenu,
            parsedMenu: r.parsedMenu,
            votes: 0,
            url: r.url || undefined,
            status: r.status,
            rawSnippet: r.rawSnippet,
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
  }, [language, toast]); // dayOverride/fresh are constants now




 const handleVote = async (id: string) => {
  if (!isVotingOpen) return;

  const result = await vote(id);
  if (result.success) {
    await Promise.all([
      refetch(),
      refreshVoteStatus(),
      refetchVoters() // Add this line
    ]);
    
    const restaurantName = restaurants.find(r => r.id === id)?.name;
    toast({
      title: "Vote Cast!",
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

  // Merge frontend restaurants (with menus) with backend restaurants (with votes)
  const mergedRestaurants = useMemo(() => {
    if (!backendRestaurants.length) return restaurants;
    
    return restaurants.map(restaurant => {
      const backendRestaurant = backendRestaurants.find((br: any) => br.name === restaurant.name);
      return {
        ...restaurant,
        votes: backendRestaurant?.votes || 0,
        id: backendRestaurant?.id || restaurant.id
      };
    });
  }, [restaurants, backendRestaurants]);

  const votingStatusText = useMemo(
    () => (isVotingOpen ? "Voting is open." : "Voting is currently closed."),
    [isVotingOpen]
  );

  const handleLanguageChange = (value: string) => {
    setLanguage(value as Language);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <header className="bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white shadow-2xl overflow-hidden sticky top-0 z-20">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full animate-pulse" style={{ animationDuration: '4s' }}></div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-gradient-to-tr from-orange-500/10 to-pink-500/10 rounded-full animate-pulse" style={{ animationDelay: '2s', animationDuration: '6s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-cyan-500/5 to-yellow-500/5 rounded-full animate-spin" style={{ animationDuration: '20s' }}></div>
        </div>
        
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
        
        {/* Content */}
        <div className="relative container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
            <MotionDesignLogo />
            
            <div className="flex flex-col items-center lg:items-end gap-4">
              <div className="text-center lg:text-right">
                <h2 className="text-xl md:text-2xl font-bold mb-2 bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                  Tuesday Team Lunch
                </h2>
                <div className="flex items-center gap-2 justify-center lg:justify-end">
                  <div className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    isVotingOpen ? "bg-green-400" : "bg-red-400"
                  )}></div>
                  <Badge 
                    variant={isVotingOpen ? "secondary" : "destructive"} 
                    className={cn(
                      "transition-all duration-300 font-medium",
                      isVotingOpen 
                        ? 'bg-green-500/20 text-green-300 border-green-400/30 hover:bg-green-500/30' 
                        : 'bg-red-500/20 text-red-300 border-red-400/30'
                    )}
                  >
                    {votingStatusText}
                  </Badge>
                </div>
              </div>
              
              <div className="relative">
                <Tabs 
                  value={language} 
                  onValueChange={handleLanguageChange} 
                  className="w-[120px]"
                >
                  <TabsList className="grid w-full grid-cols-2 bg-white/10 border-white/20 backdrop-blur-md">
                    <TabsTrigger 
                      value="en" 
                      className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-white/80 hover:text-white transition-all duration-200 font-medium"
                    >
                      EN
                    </TabsTrigger>
                    <TabsTrigger 
                      value="fi" 
                      className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-white/80 hover:text-white transition-all duration-200 font-medium"
                    >
                      FI
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg blur opacity-50 group-hover:opacity-75 transition duration-1000"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
      </header>
{aiLimited && (
  <div className="mb-6 p-3 rounded-md border border-yellow-300 bg-yellow-50 text-yellow-800">
    AI parsing is rate-limited today. We still scraped sources and will parse again automatically later.
  </div>
)}

      <main className="container mx-auto p-4 md:p-8">
        {voters.count > 0 && (
          <div className="mb-6 p-4 bg-white/50 rounded-lg border border-gray-200">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold">
                {voters.count} {voters.count === 1 ? 'person has' : 'people have'} voted:
              </h3>
              {hasVoted && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRemoveVote}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  Remove My Vote
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {voters.names.map((name, index) => (
                <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800">
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
  {isLoading || votingLoading ? (
    Array.from({ length: 6 }).map((_, i) => <RestaurantCardSkeleton key={i} />)
  ) : mergedRestaurants.length === 0 ? (
    <div className="col-span-full rounded-lg border bg-white p-8 text-center text-muted-foreground">
      No restaurants found. If this seems wrong, check database connection and permissions.
    </div>
  ) : (
    mergedRestaurants.map((restaurant) => {
      const menuToDisplay = restaurant.parsedMenu; // raw fallback happens inside RestaurantCard
      return (
        <RestaurantCard
          key={restaurant.id}
          restaurant={{ ...restaurant, parsedMenu: menuToDisplay }}
          onVote={() => handleVote(restaurant.id)}
          userHasVoted={hasVoted}
          hasVotedForThis={votedRestaurantId === restaurant.id}
          isWinner={winner?.id === restaurant.id}
          isVotingOpen={isVotingOpen}
        />
      );
    })
  )}
</div>
</main>
      
      <footer className="py-6 mt-8 bg-secondary/50">
        <div className="container mx-auto text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} LARS OBERHOFER. All rights reserved.</p>
          <p>This is an external tool for choosing Tuesday's lunch.</p>
        </div>
      </footer>
    </div>
  );
}