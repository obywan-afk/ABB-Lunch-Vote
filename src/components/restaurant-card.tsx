'use client';

import type { Restaurant } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Vote, UtensilsCrossed, Crown, ExternalLink, Info } from 'lucide-react';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onVote: () => void;
  userHasVoted: boolean;
  hasVotedForThis: boolean;
  isWinner: boolean;
  isVotingOpen: boolean;
}

// Helper function to clean up menu text by removing day headers
function cleanMenuText(text: string): string {
  if (!text) return text;
  
  return text
    // Remove day headers like "--- Monday ---", "--- Tiistai ---", etc.
    .replace(/---\s*(Maanantai|Tiistai|Keskiviikko|Torstai|Perjantai|Monday|Tuesday|Wednesday|Thursday|Friday)\s*---\s*/gi, '')
    // Clean up any extra blank lines that might result
    .replace(/^\s*\n/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function RestaurantCard({
  restaurant,
  onVote,
  userHasVoted,
  hasVotedForThis,
  isWinner,
  isVotingOpen,
}: RestaurantCardProps) {
  const parsed = restaurant.parsedMenu?.trim();
  const raw = restaurant.rawMenu?.trim();
  const status = restaurant.status; // { scraped, parse, note } if provided by API

  // Clean up the menu text to remove day headers
  const cleanedParsed = parsed ? cleanMenuText(parsed) : parsed;
  const cleanedRaw = raw ? cleanMenuText(raw) : raw;

  // style helpers for status badges
  const parseVariant =
    status?.parse === 'ok' ? 'default'
    : status?.parse === 'rate_limited' ? 'secondary'
    : status?.parse === 'skipped' ? 'outline'
    : 'destructive';

  return (
    <Card
      className={cn(
        "flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
        isWinner && "border-accent ring-2 ring-accent shadow-lg",
        hasVotedForThis && "border-primary/50 ring-2 ring-primary/50",
        !isVotingOpen && "opacity-80 grayscale-[50%]"
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex-1">
            <div className="flex items-center gap-3">
              <UtensilsCrossed className="text-primary mt-1 shrink-0" />
              {restaurant.url ? (
                <a
                  href={restaurant.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline flex items-center gap-1.5"
                >
                  {restaurant.name}
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              ) : (
                <span>{restaurant.name}</span>
              )}
            </div>
          </CardTitle>

          <div className="flex items-center gap-2">
            {status && (
              <>
                <Badge variant={status.scraped ? "default" : "outline"}>
                  {status.scraped ? "Scraped" : "Not scraped"}
                </Badge>
                <Badge variant={parseVariant}>
                  {status.parse.replace('_', ' ')}
                </Badge>
              </>
            )}
            {isWinner && (
              <Badge variant="default" className="bg-accent text-accent-foreground flex items-center gap-1.5 animate-pulse">
                <Crown className="h-4 w-4" />
                Preferred
              </Badge>
            )}
          </div>
        </div>

        <CardDescription>Tuesday&apos;s Buffet Menu</CardDescription>
      </CardHeader>

      <CardContent className="flex-grow text-sm text-card-foreground/80 whitespace-pre-line">
        {cleanedParsed
          ? cleanedParsed
          : cleanedRaw
            ? cleanedRaw
            : (
              <div className="text-muted-foreground flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5" />
                <div>
                  {status?.note ?? "Menu not available right now."}
                  {status?.parse === 'rate_limited' && (
                    <div>AI parsing is rate-limited today. We'll parse automatically once available.</div>
                  )}
                  {restaurant.rawSnippet && (
                    <div className="mt-1 italic">Fetched preview: "{restaurant.rawSnippet}…"</div>
                  )}
                </div>
              </div>
            )
        }
      </CardContent>

      <CardFooter className="flex justify-between items-center bg-muted/30 p-4 mt-4">
        <Badge variant="secondary" className="text-sm font-semibold">
          Votes: {restaurant.votes}
        </Badge>
        <Button
          onClick={onVote}
          disabled={!isVotingOpen || userHasVoted}
          variant={hasVotedForThis ? "default" : "outline"}
          className="shadow"
        >
          <Vote className="mr-2 h-4 w-4" />
          {hasVotedForThis ? 'Voted' : 'Vote for this'}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function RestaurantCardSkeleton() {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <Skeleton className="h-7 w-40 rounded-md" />
        <Skeleton className="h-5 w-52 mt-2 rounded-md" />
      </CardHeader>
      <CardContent className="space-y-3 flex-grow">
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-11/12 rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-4 w-5/6 rounded-md" />
      </CardContent>
      <CardFooter className="flex justify-between items-center bg-muted/30 p-4 mt-4">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </CardFooter>
    </Card>
  );
}