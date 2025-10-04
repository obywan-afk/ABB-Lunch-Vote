import { useState, useEffect, useCallback } from 'react'

export interface LunchNote {
  id: string
  dateKey: string
  message: string
  authorId: string
  authorName: string
  createdAt: string
  updatedAt: string
}

export function useLunchNotes() {
  const [notes, setNotes] = useState<LunchNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch notes for current date
  const fetchNotes = useCallback(async () => {
    try {
      const response = await fetch('/api/lunch-notes')
      if (!response.ok) throw new Error('Failed to fetch notes')
      
      const data = await response.json()
      setNotes(data.notes || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error fetching lunch notes:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Create a new note
  const createNote = async (message: string) => {
    try {
      const userName = sessionStorage.getItem('abb-lunch-vote-user')
      if (!userName) {
        throw new Error('User name not found. Please log in again.')
      }

      // Optimistic update - add temporary note
      const tempId = `temp-${Date.now()}`
      const tempNote: LunchNote = {
        id: tempId,
        dateKey: new Date().toISOString().split('T')[0],
        message,
        authorId: '',
        authorName: userName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      setNotes(prev => [...prev, tempNote])

      const response = await fetch('/api/lunch-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': userName
        },
        body: JSON.stringify({ message })
      })

      const data = await response.json()
      
      if (!response.ok) {
        // Rollback optimistic update on error
        setNotes(prev => prev.filter(n => n.id !== tempId))
        throw new Error(data.error || 'Failed to create note')
      }

      // Replace temp note with real note from server
      setNotes(prev => prev.map(n => n.id === tempId ? data.note : n))
      
      // Refetch to ensure we're in sync
      await fetchNotes()
      
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create note'
      setError(message)
      return { success: false, error: message }
    }
  }

  // Update a note
  const updateNote = async (id: string, message: string) => {
    try {
      const userName = sessionStorage.getItem('abb-lunch-vote-user')
      if (!userName) {
        throw new Error('User name not found. Please log in again.')
      }

      // Optimistic update
      const originalNotes = [...notes]
      setNotes(prev => prev.map(n => 
        n.id === id ? { ...n, message, updatedAt: new Date().toISOString() } : n
      ))

      const response = await fetch(`/api/lunch-notes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': userName
        },
        body: JSON.stringify({ message })
      })

      const data = await response.json()
      
      if (!response.ok) {
        // Rollback on error
        setNotes(originalNotes)
        throw new Error(data.error || 'Failed to update note')
      }

      // Update with server response
      setNotes(prev => prev.map(n => n.id === id ? data.note : n))
      
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update note'
      setError(message)
      return { success: false, error: message }
    }
  }

  // Delete a note
  const deleteNote = async (id: string) => {
    try {
      const userName = sessionStorage.getItem('abb-lunch-vote-user')
      if (!userName) {
        throw new Error('User name not found. Please log in again.')
      }

      // Optimistic update
      const originalNotes = [...notes]
      setNotes(prev => prev.filter(n => n.id !== id))

      const response = await fetch(`/api/lunch-notes/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': userName
        }
      })

      const data = await response.json()
      
      if (!response.ok) {
        // Rollback on error
        setNotes(originalNotes)
        throw new Error(data.error || 'Failed to delete note')
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete note'
      setError(message)
      return { success: false, error: message }
    }
  }

  // Fetch notes on mount and set up polling (30 second interval like voting)
  useEffect(() => {
    fetchNotes()
    
    const interval = setInterval(fetchNotes, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [fetchNotes])

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    refetch: fetchNotes
  }
}
