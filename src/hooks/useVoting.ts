// hooks/useVoting.ts
import { useState, useEffect, useCallback } from 'react'

interface Restaurant {
  id: string
  name: string
  location: string
  description: string
  votes: number
}

interface VotingStatus {
  restaurants: Restaurant[]
  winner: Restaurant | null
  isVotingOpen: boolean
}

export function useVoting() {
  const [votingStatus, setVotingStatus] = useState<VotingStatus>({
    restaurants: [],
    winner: null,
    isVotingOpen: false
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVotingStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/vote')
      if (!response.ok) throw new Error('Failed to fetch voting status')
      
      const data = await response.json()
      setVotingStatus(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  const vote = async (restaurantId: string) => {
    try {
      const userName = sessionStorage.getItem('abb-lunch-vote-user')
      if (!userName) {
        throw new Error('User name not found. Please log in again.')
      }

      console.log('🔍 DEBUG: About to make vote request')
      console.log('🔍 DEBUG: restaurantId:', restaurantId)
      console.log('🔍 DEBUG: userName:', userName)

      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-name': userName
        },
        body: JSON.stringify({ restaurantId })
      })

      console.log('🔍 DEBUG: Response status:', response.status)
      console.log('🔍 DEBUG: Response ok:', response.ok)

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to vote')
      }

      await fetchVotingStatus()
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to vote'
      setError(message)
      return { success: false, error: message }
    }
  }

  const removeVote = async () => {
    try {
      const userName = sessionStorage.getItem('abb-lunch-vote-user')
      if (!userName) {
        throw new Error('User name not found. Please log in again.')
      }

      console.log('🔍 DEBUG: About to remove vote')
      console.log('🔍 DEBUG: userName:', userName)

      const response = await fetch('/api/vote', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-name': userName
        }
      })

      console.log('🔍 DEBUG: Remove vote response status:', response.status)
      console.log('🔍 DEBUG: Remove vote response ok:', response.ok)

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove vote')
      }

      await fetchVotingStatus()
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove vote'
      setError(message)
      return { success: false, error: message }
    }
  }

  useEffect(() => {
    fetchVotingStatus()
    
    const interval = setInterval(fetchVotingStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchVotingStatus])

  return {
    ...votingStatus,
    loading,
    error,
    vote,
    removeVote,
    refetch: fetchVotingStatus
  }
}

export function useUserVote() {
  const [hasVoted, setHasVoted] = useState(false)
  const [votedRestaurantId, setVotedRestaurantId] = useState<string | null>(null)

  const checkUserVote = useCallback(async () => {
    try {
      const userName = sessionStorage.getItem('abb-lunch-vote-user')
      if (!userName) {
        setHasVoted(false)
        setVotedRestaurantId(null)
        return
      }

      const response = await fetch('/api/user/vote-status', {
        headers: {
          'x-user-name': userName
        }
      })
      if (response.ok) {
        const data = await response.json()
        setHasVoted(data.hasVoted)
        setVotedRestaurantId(data.votedRestaurantId)
      }
    } catch (error) {
      console.error('Failed to check user vote status:', error)
    }
  }, [])

  useEffect(() => {
    checkUserVote()
  }, [checkUserVote])

  return { 
    hasVoted, 
    votedRestaurantId, 
    setHasVoted, 
    setVotedRestaurantId,
    refreshVoteStatus: checkUserVote
  }
}