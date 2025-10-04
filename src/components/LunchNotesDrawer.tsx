'use client'

import { useState, useEffect } from 'react'
import { useLunchNotes } from '@/hooks/useLunchNotes'
import { useToast } from '@/hooks/use-toast'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// Format relative time (e.g., "2 minutes ago")
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Format absolute time for tooltip
function formatAbsoluteTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function LunchNotesDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMessage, setEditMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { notes, loading, createNote, updateNote, deleteNote } = useLunchNotes()
  const { toast } = useToast()
  const currentUserName = typeof window !== 'undefined' 
    ? sessionStorage.getItem('abb-lunch-vote-user') 
    : null

  const charCount = editingId ? editMessage.length : message.length
  const maxChars = 500
  const isOverLimit = charCount > maxChars

  // Handle create note
  const handleSendNote = async () => {
    if (!message.trim() || isSubmitting || isOverLimit) return

    setIsSubmitting(true)
    const result = await createNote(message.trim())
    setIsSubmitting(false)

    if (result.success) {
      setMessage('')
      toast({
        title: 'Note posted!',
        description: 'Your note has been shared.'
      })
    } else {
      toast({
        title: 'Failed to post note',
        description: result.error,
        variant: 'destructive'
      })
    }
  }

  // Handle update note
  const handleUpdateNote = async (id: string) => {
    if (!editMessage.trim() || isSubmitting || isOverLimit) return

    setIsSubmitting(true)
    const result = await updateNote(id, editMessage.trim())
    setIsSubmitting(false)

    if (result.success) {
      setEditingId(null)
      setEditMessage('')
      toast({
        title: 'Note updated!',
        description: 'Your note has been updated.'
      })
    } else {
      toast({
        title: 'Failed to update note',
        description: result.error,
        variant: 'destructive'
      })
    }
  }

  // Handle delete note
  const handleDeleteNote = async (id: string) => {
    setIsSubmitting(true)
    const result = await deleteNote(id)
    setIsSubmitting(false)

    if (result.success) {
      toast({
        title: 'Note deleted',
        description: 'Your note has been removed.'
      })
    } else {
      toast({
        title: 'Failed to delete note',
        description: result.error,
        variant: 'destructive'
      })
    }
  }

  // Start editing
  const startEditing = (id: string, currentMessage: string) => {
    setEditingId(id)
    setEditMessage(currentMessage)
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null)
    setEditMessage('')
  }

  return (
    <TooltipProvider>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button
            className="fixed top-24 right-6 z-[55] group"
            aria-label="Open lunch notes"
          >
            <div className="relative">
              {/* Glow effect on hover */}
              <div className="absolute -inset-2 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-violet-500/30 to-cyan-500/30" />
              
              {/* Button */}
              <div className="relative flex items-center justify-center w-14 h-14 backdrop-blur-xl rounded-full bg-white/5 border border-white/10 transition-all duration-300 group-hover:bg-white/10 group-hover:scale-110">
                <span className="text-2xl">💬</span>
              </div>
              
              {/* Badge with note count */}
              {notes.length > 0 && (
                <div className="absolute -top-1 -right-1">
                  <Badge className="h-6 min-w-6 flex items-center justify-center bg-gradient-to-r from-violet-500 to-cyan-500 text-white border-0 px-1.5">
                    {notes.length}
                  </Badge>
                </div>
              )}
            </div>
          </button>
        </SheetTrigger>

        <SheetContent 
          side="right" 
          className="z-[70] w-full sm:w-[500px] backdrop-blur-2xl bg-slate-950/95 border-white/10 p-0 flex flex-col"
        >
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-violet-900/20 to-cyan-900/20">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-purple-100">
                  Notes for Today
                </SheetTitle>
                <p className="text-sm text-white/60 mt-1">
                  {new Date().toLocaleDateString('en-GB', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </p>
              </div>
            </div>
          </SheetHeader>

          {/* Notes List */}
          <ScrollArea className="flex-1 px-6">
            <div className="py-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                </div>
              ) : notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-6xl mb-4">📝</div>
                  <p className="text-white/60">No one here yet.</p>
                  <p className="text-white/40 text-sm mt-1">Start the conversation!</p>
                </div>
              ) : (
                notes.map((note) => {
                  const isOwnNote = note.authorName === currentUserName
                  const isEditing = editingId === note.id

                  return (
                    <div
                      key={note.id}
                      className={cn(
                        "group relative rounded-xl p-4 transition-all duration-300",
                        isOwnNote 
                          ? "bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20" 
                          : "bg-white/5 border border-white/10"
                      )}
                    >
                      {/* Author and time */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn(
                          "text-sm font-medium",
                          isOwnNote ? "text-cyan-400" : "text-white/80"
                        )}>
                          {note.authorName}
                        </span>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-white/40 cursor-help">
                              {formatRelativeTime(note.createdAt)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{formatAbsoluteTime(note.createdAt)}</p>
                            {note.updatedAt !== note.createdAt && (
                              <p className="text-xs text-white/60 mt-1">
                                Edited: {formatAbsoluteTime(note.updatedAt)}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Message or edit textarea */}
                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editMessage}
                            onChange={(e) => setEditMessage(e.target.value)}
                            className="min-h-[80px] bg-black/20 border-white/20 text-white resize-none"
                            maxLength={500}
                          />
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "text-xs",
                              editMessage.length > maxChars ? "text-red-400" : "text-white/40"
                            )}>
                              {editMessage.length}/{maxChars}
                            </span>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelEditing}
                                disabled={isSubmitting}
                                className="text-white/60 hover:text-white"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateNote(note.id)}
                                disabled={isSubmitting || !editMessage.trim() || isOverLimit}
                                className="bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600"
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-white/90 whitespace-pre-wrap break-words">
                            {note.message}
                          </p>

                          {/* Edit/Delete buttons for own notes */}
                          {isOwnNote && (
                            <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEditing(note.id, note.message)}
                                disabled={isSubmitting}
                                className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                disabled={isSubmitting}
                                className="text-xs px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>

          {/* Composer */}
          <div className="border-t border-white/10 p-4 bg-black/20">
            <div className="space-y-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendNote()
                  }
                }}
                placeholder="Share a note for today..."
                className="min-h-[80px] bg-white/5 border-white/10 text-white placeholder:text-white/40 resize-none focus:border-cyan-500/50"
                disabled={isSubmitting}
                maxLength={500}
              />
              
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-xs",
                  isOverLimit ? "text-red-400" : "text-white/40"
                )}>
                  {charCount}/{maxChars}
                </span>
                
                <Button
                  onClick={handleSendNote}
                  disabled={isSubmitting || !message.trim() || isOverLimit}
                  className="bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    'Send'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  )
}
