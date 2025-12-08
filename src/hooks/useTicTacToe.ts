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

export interface TicTacToeMatch {
  id: string
  dateKey: string
  board: string
  currentTurn: 'X' | 'O' | null
  status: 'waiting' | 'active' | 'finished'
  winnerSymbol: 'X' | 'O' | null
  winnerName: string | null
  winningLine: string | null
  players: TicTacToePlayer[]
  moves: TicTacToeMove[]
}

const getUserName = () => {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('abb-lunch-vote-user')
}

export function useTicTacToe() {
  const [match, setMatch] = useState<TicTacToeMatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    setUserName(getUserName())
  }, [])

  const fetchMatch = useCallback(async () => {
    try {
      const response = await fetch('/api/games/tictactoe')
      if (!response.ok) throw new Error('Failed to load game')
      const data = await response.json()
      setMatch(data.match)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game')
    } finally {
      setLoading(false)
    }
  }, [])

  const joinGame = useCallback(
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
          throw new Error(data.error || 'Failed to join match')
        }

        setMatch(data.match)
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

        if (!match) {
          throw new Error('No active match')
        }

        setMutating(true)
        const response = await fetch('/api/games/tictactoe', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-name': activeUserName,
          },
          body: JSON.stringify({ action: 'move', position, matchId: match.id }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to place move')
        }

        setMatch(data.match)
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
    [match],
  )

  const resetMatch = useCallback(async () => {
    try {
      const activeUserName = getUserName()
      if (!activeUserName) {
        throw new Error('Set your name on the login screen to play.')
      }

      if (!match) {
        throw new Error('No active match')
      }

      setMutating(true)
      const response = await fetch('/api/games/tictactoe', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': activeUserName,
        },
        body: JSON.stringify({ action: 'reset', matchId: match.id }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset match')
      }

      setMatch(data.match)
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
  }, [match])

  useEffect(() => {
    fetchMatch()
    const id = setInterval(fetchMatch, 7000)
    return () => clearInterval(id)
  }, [fetchMatch])

  const cells = useMemo(
    () => (match ? match.board.split('') : Array(9).fill('-')),
    [match],
  )

  return {
    match,
    cells,
    loading,
    mutating,
    error,
    setError,
    userName,
    joinGame,
    makeMove,
    resetMatch,
    refresh: fetchMatch,
  }
}
