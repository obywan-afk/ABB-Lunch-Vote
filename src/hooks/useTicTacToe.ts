import { useCallback, useEffect, useMemo, useState } from 'react'

export interface TicTacToePlayer {
  id: string
  userId: string
  userName: string | null
  symbol: 'X' | 'O'
  joinedAt: string
}

export interface TicTacToeMove {
  id: string
  position: number
  symbol: 'X' | 'O'
  playerId: string
  createdAt: string
}

export type TicTacToeStatus = 'waiting' | 'active' | 'finished' | 'abandoned'

export interface TicTacToeMatch {
  id: string
  dateKey: string
  board: string
  currentTurn: 'X' | 'O' | null
  status: TicTacToeStatus
  winnerSymbol: 'X' | 'O' | null
  winnerName: string | null
  winningLine: string | null
  players: TicTacToePlayer[]
  moves: TicTacToeMove[]
  createdAt?: string
  updatedAt?: string
}

const getUserName = () => {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('abb-lunch-vote-user')
}

export function useTicTacToe() {
  const [matches, setMatches] = useState<TicTacToeMatch[]>([])
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    setUserName(getUserName())
  }, [])

  const selectBestActiveMatch = useCallback(
    (allMatches: TicTacToeMatch[], currentActiveId: string | null, currentUserName: string | null) => {
      if (!allMatches.length) return null

      // Keep current active match if it still exists
      if (currentActiveId && allMatches.some((m) => m.id === currentActiveId)) {
        return currentActiveId
      }

      // Prefer an active match where you're a player
      if (currentUserName) {
        const mineActive = allMatches.find(
          (m) =>
            m.status === 'active' &&
            m.players.some((p) => p.userName === currentUserName),
        )
        if (mineActive) return mineActive.id

        const mineWaiting = allMatches.find(
          (m) =>
            m.status === 'waiting' &&
            m.players.some((p) => p.userName === currentUserName),
        )
        if (mineWaiting) return mineWaiting.id
      }

      // Otherwise just take the most recent non-abandoned match
      const firstNonAbandoned = allMatches.find((m) => m.status !== 'abandoned')
      return firstNonAbandoned ? firstNonAbandoned.id : allMatches[0].id
    },
    [],
  )

  const fetchMatches = useCallback(async () => {
    try {
      const response = await fetch('/api/games/tictactoe')
      if (!response.ok) throw new Error('Failed to load games')
      const data = await response.json()
      const fetchedMatches: TicTacToeMatch[] = data.matches || []

      setMatches(fetchedMatches)
      setActiveMatchId((currentId) =>
        selectBestActiveMatch(fetchedMatches, currentId, getUserName()),
      )
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load games')
    } finally {
      setLoading(false)
    }
  }, [selectBestActiveMatch])

  const activeMatch = useMemo(
    () => matches.find((m) => m.id === activeMatchId) || null,
    [matches, activeMatchId],
  )

  const safeMatches = useMemo(
    () => matches.filter((m) => m.status !== 'abandoned'),
    [matches],
  )

  const joinNewMatch = useCallback(
    async (preferredSymbol?: 'X' | 'O') => {
      try {
        const activeUserName = getUserName()
        if (!activeUserName) {
          throw new Error('Set your name on the login screen to play.')
        }

        setMutating(true)
        const response = await fetch('/api/games/tictactoe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-name': activeUserName,
          },
          body: JSON.stringify({ preferredSymbol }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to start match')
        }

        const newMatch: TicTacToeMatch = data.match
        setMatches((prev) => [newMatch, ...prev])
        setActiveMatchId(newMatch.id)
        setUserName(activeUserName)
        setError(null)
        return { success: true }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to start match'
        setError(message)
        return { success: false, error: message }
      } finally {
        setMutating(false)
      }
    },
    [],
  )

  const joinExistingMatch = useCallback(
    async (matchId: string, preferredSymbol?: 'X' | 'O') => {
      try {
        const activeUserName = getUserName()
        if (!activeUserName) {
          throw new Error('Set your name on the login screen to play.')
        }

        setMutating(true)
        const response = await fetch('/api/games/tictactoe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-name': activeUserName,
          },
          body: JSON.stringify({ preferredSymbol, matchId }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to join match')
        }

        const updatedMatch: TicTacToeMatch = data.match
        setMatches((prev) => {
          const others = prev.filter((m) => m.id !== updatedMatch.id)
          return [updatedMatch, ...others]
        })
        setActiveMatchId(updatedMatch.id)
        setUserName(activeUserName)
        setError(null)
        return { success: true }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to join match'
        setError(message)
        return { success: false, error: message }
      } finally {
        setMutating(false)
      }
    },
    [],
  )

  const makeMove = useCallback(
    async (position: number) => {
      try {
        const activeUserName = getUserName()
        if (!activeUserName) {
          throw new Error('Set your name on the login screen to play.')
        }

        if (!activeMatch) {
          throw new Error('No active match')
        }

        setMutating(true)
        const response = await fetch('/api/games/tictactoe', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-name': activeUserName,
          },
          body: JSON.stringify({
            action: 'move',
            position,
            matchId: activeMatch.id,
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to place move')
        }

        const updatedMatch: TicTacToeMatch = data.match
        setMatches((prev) => {
          const others = prev.filter((m) => m.id !== updatedMatch.id)
          return [updatedMatch, ...others]
        })
        setUserName(activeUserName)
        setError(null)
        return { success: true }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to place move'
        setError(message)
        return { success: false, error: message }
      } finally {
        setMutating(false)
      }
    },
    [activeMatch],
  )

  const resetMatch = useCallback(async () => {
    try {
      const activeUserName = getUserName()
      if (!activeUserName) {
        throw new Error('Set your name on the login screen to play.')
      }

      if (!activeMatch) {
        throw new Error('No active match')
      }

      setMutating(true)
      const response = await fetch('/api/games/tictactoe', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': activeUserName,
        },
        body: JSON.stringify({ action: 'reset', matchId: activeMatch.id }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset match')
      }

      const updatedMatch: TicTacToeMatch = data.match
      setMatches((prev) => {
        const others = prev.filter((m) => m.id !== updatedMatch.id)
        return [updatedMatch, ...others]
      })
      setError(null)
      return { success: true }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to reset match'
      setError(message)
      return { success: false, error: message }
    } finally {
      setMutating(false)
    }
  }, [activeMatch])

  const abandonMatch = useCallback(async () => {
    try {
      const activeUserName = getUserName()
      if (!activeUserName) {
        throw new Error('Set your name on the login screen to play.')
      }

      if (!activeMatch) {
        throw new Error('No active match')
      }

      setMutating(true)
      const response = await fetch('/api/games/tictactoe', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': activeUserName,
        },
        body: JSON.stringify({ action: 'abandon', matchId: activeMatch.id }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to abandon match')
      }

      const updatedMatch: TicTacToeMatch = data.match
      setMatches((prev) => prev.filter((m) => m.id !== updatedMatch.id))
      setActiveMatchId((currentId) =>
        currentId === updatedMatch.id ? null : currentId,
      )
      setError(null)
      return { success: true }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to abandon match'
      setError(message)
      return { success: false, error: message }
    } finally {
      setMutating(false)
    }
  }, [activeMatch])

  useEffect(() => {
    fetchMatches()
    const id = setInterval(fetchMatches, 7000)
    return () => clearInterval(id)
  }, [fetchMatches])

  const cells = useMemo(
    () => (activeMatch ? activeMatch.board.split('') : Array(9).fill('-')),
    [activeMatch],
  )

  return {
    matches: safeMatches,
    activeMatch,
    setActiveMatchId,
    cells,
    loading,
    mutating,
    error,
    setError,
    userName,
    joinNewMatch,
    joinExistingMatch,
    makeMove,
    resetMatch,
    abandonMatch,
    refresh: fetchMatches,
  }
}
