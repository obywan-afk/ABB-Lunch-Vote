import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentDate } from '@/lib/time/week'

// Helper to sanitize message (same as in main route)
function sanitizeMessage(message: string): string {
  return message
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// PATCH /api/lunch-notes/[id] - Update a note (author only, same-day only)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userName = request.headers.get('x-user-name')
    
    if (!userName) {
      return NextResponse.json(
        { error: 'User name is required' },
        { status: 400 }
      )
    }

    const noteId = params.id
    const body = await request.json()
    const { message } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Sanitize and validate message
    const sanitizedMessage = sanitizeMessage(message)
    
    if (sanitizedMessage.length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      )
    }

    if (sanitizedMessage.length > 500) {
      return NextResponse.json(
        { error: 'Message must be 500 characters or less' },
        { status: 400 }
      )
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: { name: userName }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Fetch the note
    const note = await prisma.lunchNote.findUnique({
      where: { id: noteId }
    })

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    // Verify author
    if (note.authorId !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own notes' },
        { status: 403 }
      )
    }

    // Enforce same-day edit rule
    const currentDate = getCurrentDate()
    if (note.dateKey !== currentDate) {
      return NextResponse.json(
        { error: 'You can only edit notes from today' },
        { status: 403 }
      )
    }

    // Update the note
    const updatedNote = await prisma.lunchNote.update({
      where: { id: noteId },
      data: {
        message: sanitizedMessage,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ note: updatedNote })
  } catch (error) {
    console.error('Error updating lunch note:', error)
    return NextResponse.json(
      { error: 'Failed to update lunch note' },
      { status: 500 }
    )
  }
}

// DELETE /api/lunch-notes/[id] - Delete a note (author only, same-day only)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userName = request.headers.get('x-user-name')
    
    if (!userName) {
      return NextResponse.json(
        { error: 'User name is required' },
        { status: 400 }
      )
    }

    const noteId = params.id

    // Find user
    const user = await prisma.user.findFirst({
      where: { name: userName }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Fetch the note
    const note = await prisma.lunchNote.findUnique({
      where: { id: noteId }
    })

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    // Verify author
    if (note.authorId !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own notes' },
        { status: 403 }
      )
    }

    // Enforce same-day delete rule
    const currentDate = getCurrentDate()
    if (note.dateKey !== currentDate) {
      return NextResponse.json(
        { error: 'You can only delete notes from today' },
        { status: 403 }
      )
    }

    // Delete the note (hard delete)
    await prisma.lunchNote.delete({
      where: { id: noteId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting lunch note:', error)
    return NextResponse.json(
      { error: 'Failed to delete lunch note' },
      { status: 500 }
    )
  }
}
