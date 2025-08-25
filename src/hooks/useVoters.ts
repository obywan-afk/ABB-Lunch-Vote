import { useState, useEffect, useCallback } from 'react'

interface VotersData {
  count: number
  names: string[]
}

export function useVoters() {
  const [voters, setVoters] = useState<VotersData>({
    count: 0,
    names: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVoters = useCallback(async () => {
    try {
      const response = await fetch('/api/voters')
      if (!response.ok) throw new Error('Failed to fetch voters')
      
      const data = await response.json()
      setVoters(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  const refetchVoters = useCallback(() => {
    return fetchVoters()
  }, [fetchVoters])

  useEffect(() => {
    fetchVoters()
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchVoters, 30000)
    return () => clearInterval(interval)
  }, [fetchVoters])

  return {
    voters,
    loading,
    error,
    refetchVoters
  }
}