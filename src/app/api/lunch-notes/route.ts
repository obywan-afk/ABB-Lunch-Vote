import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentDate } from '@/lib/time/week'

// Helper to sanitize message (trim whitespace, basic XSS prevention)
function sanitizeMessage(message: string): string {
  return message
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// GET /api/lunch-notes - Fetch notes for current date only
export async function GET() {
  try {
    const currentDate = getCurrentDate() // Always use current date in Helsinki timezone
    
    const notes = await prisma.lunchNote.findMany({
      where: {
        dateKey: currentDate
      },
      orderBy: {
        createdAt: 'asc' // Chronological order (oldest first)
      }
    })

    return NextResponse.json({ notes })
  } catch (error) {
    console.error('Error fetching lunch notes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lunch notes' },
      { status: 500 }
    )
  }
}

// POST /api/lunch-notes - Create a new note
export async function POST(request: Request) {
  try {
    const userName = request.headers.get('x-user-name')
    
    if (!userName) {
      return NextResponse.json(
        { error: 'User name is required' },
        { status: 400 }
      )
    }

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

    // Find or create user (reuse existing pattern from vote route)
    let user = await prisma.user.findFirst({
      where: { name: userName }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: userName,
          sessionId: `session_${userName}_${Date.now()}`
        }
      })
    }

    // Get current date in Helsinki timezone (server-side)
    const currentDate = getCurrentDate()

    // Create the lunch note
    const note = await prisma.lunchNote.create({
      data: {
        dateKey: currentDate,
        message: sanitizedMessage,
        authorId: user.id,
        authorName: user.name || 'Anonymous'
      }
    })

    return NextResponse.json({ note })
  } catch (error) {
    console.error('Error creating lunch note:', error)
    return NextResponse.json(
      { error: 'Failed to create lunch note' },
      { status: 500 }
    )
  }
}
