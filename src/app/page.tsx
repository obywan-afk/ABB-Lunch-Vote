'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Restaurant } from '@/lib/types';
import { initialRestaurants } from '@/lib/restaurant-data';
import { parseRestaurantMenu } from '@/ai/flows/parse-restaurant-menu';
import { RestaurantCard, RestaurantCardSkeleton } from '@/components/restaurant-card';
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Language = 'en' | 'fi';

async function fetchTellusMenu(language: Language): Promise<string> {
  try {
    const response = await fetch(`/api/tellus?language=${language}`);
    if (!response.ok) {
      return `Could not fetch Tellus menu. Status: ${response.status}`;
    }
    const text = await response.text();
    
    // Basic XML parsing to find Tuesday's menu
    if (typeof window !== 'undefined') {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        const items = xmlDoc.getElementsByTagName('item');
        for (let i = 0; i < items.length; i++) {
          const title = items[i].getElementsByTagName('title')[0].textContent;
          if (title?.toLowerCase().includes('tuesday') || title?.toLowerCase().includes('tiistai')) {
            const description = items[i].getElementsByTagName('description')[0].textContent;
            // The description is HTML, so we need to clean it up.
            const descriptionElement = document.createElement('div');
            descriptionElement.innerHTML = description || '';
            return descriptionElement.innerText.trim() || `Menu for Tuesday not found in description. Language: ${language}`;
          }
        }
    }
    return `Tuesday menu not found for Tellus. Language: ${language}`;
  } catch (error) {
    console.error("Error fetching Tellus menu:", error);
    return "Error fetching Tellus menu.";
  }
}


export default function Home() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants);
  const [isLoading, setIsLoading] = useState(true);
  const [votedRestaurantId, setVotedRestaurantId] = useState<string | null>(null);
  const [isVotingOpen, setIsVotingOpen] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Check for authentication
    const isAuthenticated = sessionStorage.getItem('abb-lunch-vote-auth') === 'true';
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    const checkVotingTime = () => {
      const now = new Date();
      const day = now.getDay();
      const hour = now.getHours();
      // Voting is open on Monday (1) and Tuesday (2) before noon (12:00)
      const votingActive = day === 1 || (day === 2 && hour < 12);
      setIsVotingOpen(votingActive);
    };

    checkVotingTime();
    // Check every minute
    const interval = setInterval(checkVotingTime, 60000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const processMenus = async () => {
      setIsLoading(true);
      try {
        const restaurantsWithData = await Promise.all(
          initialRestaurants.map(async (restaurant) => {
            if (restaurant.id === 'tellus') {
              const menu = await fetchTellusMenu(language);
              if (language === 'en') {
                return { ...restaurant, rawMenu: menu };
              } else {
                return { ...restaurant, rawMenuFi: menu };
              }
            }
            return restaurant;
          })
        );
        
        const parsedRestaurants = await Promise.all(
          restaurantsWithData.map(async (restaurant) => {
            const menuToParse = language === 'en' ? restaurant.rawMenu : restaurant.rawMenuFi;
            const parsedMenuKey = language === 'en' ? 'parsedMenu' : 'parsedMenuFi';

            if (!menuToParse || menuToParse.trim() === '') {
              return { ...restaurant, [parsedMenuKey]: "Menu not available." };
            }
            try {
              const result = await parseRestaurantMenu({
                restaurantName: restaurant.name,
                menuText: menuToParse,
              });
              return {
                ...restaurant,
                [parsedMenuKey]: result.parsedMenu,
              };
            } catch (error) {
               console.error(`Failed to parse menu for ${restaurant.name}:`, error);
               // Fallback to raw menu if parsing fails for a specific restaurant
               return { ...restaurant, [parsedMenuKey]: menuToParse };
            }
          })
        );
        setRestaurants(parsedRestaurants);
      } catch (error) {
        console.error("Failed to process menus:", error);
        toast({
          title: "Error",
          description: "Could not load all menus. Displaying available data.",
          variant: "destructive",
        });
        // Fallback to initial data with raw menus if the whole process fails
        setRestaurants(initialRestaurants.map(r => ({...r, parsedMenu: r.rawMenu || "Menu not available.", parsedMenuFi: r.rawMenuFi || "Menu not available."})));
      }
      setIsLoading(false);
    };

    processMenus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);
  
  const handleVote = (id: string) => {
    if (!isVotingOpen || votedRestaurantId) return;

    setRestaurants((prevRestaurants) =>
      prevRestaurants.map((r) => (r.id === id ? { ...r, votes: r.votes + 1 } : r))
    );
    setVotedRestaurantId(id);
    const restaurantName = restaurants.find(r => r.id === id)?.name;
    toast({
      title: "Vote Cast!",
      description: `You voted for ${restaurantName}.`,
    });
  };

  const winningRestaurant = useMemo(() => {
     if (isLoading) return null;
     // Sort by votes, then by name to have a stable sort for ties
     const sortedByVotes = [...restaurants].sort((a, b) => {
        if (b.votes !== a.votes) {
            return b.votes - a.votes;
        }
        return a.name.localeCompare(b.name);
     });

     const leader = sortedByVotes[0];
     // A winner is only declared if they have at least 5 votes.
     if (leader && leader.votes >= 5) {
       return leader;
     }
     return null;
  }, [restaurants, isLoading]);

  const votingStatusText = useMemo(() => {
    if (isVotingOpen) {
      const now = new Date();
      if (now.getDay() === 1) return "Voting is open until Tuesday at noon.";
      if (now.getDay() === 2) return "Voting closes today at noon.";
    }
    return "Voting is currently closed.";
  }, [isVotingOpen]);

  const handleLanguageChange = (value: string) => {
    setLanguage(value as Language);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-6 shadow-md sticky top-0 z-20">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
             <svg role="img" aria-label="ABB Logo" width="120" height="40" viewBox="0 0 120 40" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.4 27.2h-3.2L8 16.8h.2l3.2 10.4zM2.3 8v24h18.4V8H2.3zm15.4 21H5.5V11h12.2v18zM31.1 8v24h18.4V8H31.1zm15.4 21h-12V11h12v18zM38.8 27.2h-3.2L32.4 16.8h.2l3.2 10.4zM55.9 8v24h18.4V8H55.9zm15.4 21H59.1V11h12.2v18zM63.6 27.2h-3.2L57.2 16.8h.2l3.2 10.4z" />
              <path d="M96.7 13.9c-1.3-1.3-3.1-2.1-5.1-2.1s-3.8.8-5.1 2.1-2.1 3.1-2.1 5.1 2 5.1 5.1 5.1 3.8-.8 5.1-2.1c1.3-1.4 2.1-3.2 2.1-5.1-.1-2-.9-3.7-2.1-5.1zm-8.4 8.4c-1.2 0-2.3-.5-3.1-1.3s-1.3-1.9-1.3-3.1.5-2.3 1.3-3.1 1.9-1.3 3.1-1.3 2.3.5 3.1 1.3 1.3 1.9 1.3 3.1c0 2.4-1.9 4.4-4.4 4.4zM118.8 32h-3.7l-7.9-12.1v12.1h-3V8h3.7l7.9 12.1V8h3v24z" />
            </svg>
            <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">
              Lunch Vote
            </h1>
          </div>
           <div className="flex flex-col items-center gap-2">
            <div className="text-center md:text-right">
              <h2 className="text-lg font-semibold">Tuesday Lunch Poll</h2>
              <Badge variant={isVotingOpen ? "secondary" : "destructive"} className={cn(isVotingOpen ? 'bg-green-100 text-green-900' : '', 'transition-colors')}>
                  {votingStatusText}
              </Badge>
            </div>
            <Tabs defaultValue="en" onValueChange={handleLanguageChange} className="w-[100px]">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="en">EN</TabsTrigger>
                <TabsTrigger value="fi">FI</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => <RestaurantCardSkeleton key={index} />)
            : restaurants.map((restaurant) => {
                const menuToDisplay = language === 'en' ? restaurant.parsedMenu : restaurant.parsedMenuFi;
                return (
                  <RestaurantCard
                    key={restaurant.id}
                    restaurant={{...restaurant, parsedMenu: menuToDisplay}}
                    onVote={() => handleVote(restaurant.id)}
                    userHasVoted={!!votedRestaurantId}
                    hasVotedForThis={votedRestaurantId === restaurant.id}
                    isWinner={winningRestaurant?.id === restaurant.id}
                    isVotingOpen={isVotingOpen}
                  />
                )
            })}
        </div>
      </main>
       <footer className="py-6 mt-8 bg-secondary/50">
        <div className="container mx-auto text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} ABB. All rights reserved.</p>
          <p>This is an internal tool for choosing Tuesday's lunch.</p>
        </div>
      </footer>
    </div>
  );
}
