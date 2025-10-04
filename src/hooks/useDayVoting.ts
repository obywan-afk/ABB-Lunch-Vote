import { useMemo } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useVoting, useUserVote } from '@/hooks/useVoting'
import { useVoters } from '@/hooks/useVoters'
import type { Restaurant } from '@/lib/types'

export function useDayVoting(restaurants: Restaurant[]) {
  const { toast } = useToast()
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
        title: "Vote Cast!",
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

  return {
    mergedRestaurants,
    winner,
    votingLoading,
    hasVoted,
    votedRestaurantId,
    isVotingOpen,
    voters,
    handleVote,
    handleRemoveVote,
  }
}
