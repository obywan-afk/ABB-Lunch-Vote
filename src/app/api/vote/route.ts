import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentWeekStart, getCurrentDate, checkVotingStatus } from '@/lib/time/week'

console.log('🚀 Vote route file loaded at:', new Date().toISOString())

export async function GET() {
  console.log('🔍 GET /api/vote called at:', new Date().toISOString())
  
  try {
    const currentDate = getCurrentDate()
    console.log('🔍 Current date:', currentDate)
    
    // Get all restaurants with their vote counts for TODAY
    const restaurants = await prisma.restaurant.findMany({
      include: {
        votes: {
          where: {
            date: currentDate
          }
        }
      }
    })

    // Transform data to include vote counts
    const restaurantsWithVotes = restaurants.map((restaurant: any) => ({
      id: restaurant.id,
      name: restaurant.name,
      location: restaurant.location,
      description: restaurant.description,
      votes: restaurant.votes.length
    }))

    // Determine winner (restaurant with most votes, minimum 5 votes)
    const sortedByVotes = [...restaurantsWithVotes].sort((a, b) => {
      if (b.votes !== a.votes) {
        return b.votes - a.votes
      }
      return a.name.localeCompare(b.name)
    })

    const leader = sortedByVotes[0]
    const winner = leader && leader.votes >= 5 ? leader : null

    return NextResponse.json({
      restaurants: restaurantsWithVotes,
      winner,
      isVotingOpen: checkVotingStatus(),
      message: 'Vote endpoint is active. Use POST to cast a vote.',
      currentTime: new Date().toISOString(),
      currentDate: currentDate
    })

  } catch (error) {
    console.error('🔍 Error fetching voting status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch voting status' },
      { status: 500 }
    )
  }
}






export async function POST(request: Request) {
  console.log('🔍 POST /api/vote called at:', new Date().toISOString())
  console.log('🔍 Request method:', request.method)
  console.log('🔍 Request URL:', request.url)
  
  try {
    const body = await request.json()
    console.log('🔍 Request body:', JSON.stringify(body, null, 2))
    
    const restaurantId = body.restaurantId
    const userName = request.headers.get('x-user-name')
    
    console.log('🔍 Received restaurantId:', restaurantId)
    console.log('🔍 Received userName:', userName)
    
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      )
    }

    if (!userName) {
      return NextResponse.json(
        { error: 'User name is required' },
        { status: 400 }
      )
    }

    console.log('🔍 About to try database operations...')
    
    try {
      // Test database connection
      await prisma.$connect()
      console.log('🔍 Database connected successfully')
      
      // Check if restaurant exists
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId }
      })

      if (!restaurant) {
        console.log('🔍 Restaurant not found:', restaurantId)
        return NextResponse.json(
          { error: 'Restaurant not found' },
          { status: 404 }
        )
      }

      console.log('🔍 Restaurant found:', restaurant.name)

      // Find or create user
      let user = await prisma.user.findFirst({
        where: { name: userName }
      })

      if (!user) {
        console.log('🔍 Creating new user:', userName)
        user = await prisma.user.create({
          data: {
            name: userName,
            sessionId: `session_${userName}_${Date.now()}`
          }
        })
      } else {
        console.log('🔍 User found:', user.name)
      }

      const currentDate = getCurrentDate()
      const weekOf = getCurrentWeekStart()
      console.log('🔍 Current date:', currentDate)
      console.log('🔍 Week of:', weekOf)

      // Check if user has already voted TODAY
      const existingVote = await prisma.vote.findFirst({
        where: {
          userId: user.id,
          date: currentDate
        }
      })

      if (existingVote) {
        console.log('🔍 User already voted today, updating vote')
        
        // Update existing vote instead of rejecting
        await prisma.vote.update({
          where: {
            id: existingVote.id
          },
          data: {
            restaurantId: restaurantId
          }
        })

        console.log('🔍 Vote updated successfully')
        return NextResponse.json({ 
          success: true, 
          message: 'Vote updated successfully' 
        })
      }

      console.log('🔍 Creating new vote record')
      
      // Create the vote
      await prisma.vote.create({
        data: {
          restaurantId,
          userId: user.id,
          date: currentDate,
          weekOf: weekOf
        }
      })

      console.log('🔍 Vote created successfully')
      
      return NextResponse.json({ 
        success: true,
        message: 'Vote submitted successfully'
      })
      
    } catch (dbError) {
      console.error('🔍 Database error:', dbError)
      return NextResponse.json(
        { error: 'Database connection failed', details: String(dbError) },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('🔍 General error casting vote:', error)
    return NextResponse.json(
      { error: 'Failed to cast vote', details: String(error) },
      { status: 500 }
    )
  }
}



export async function DELETE(request: Request) {  
  try {
    const userName = request.headers.get('x-user-name')
    console.log('🔍 Received userName for deletion:', userName)
    
    if (!userName) {
      return NextResponse.json(
        { error: 'User name is required' },
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

    const currentDate = getCurrentDate()
    console.log('🔍 Current date:', currentDate)

    // Find and delete the user's vote for TODAY
    const deletedVote = await prisma.vote.deleteMany({
      where: {
        userId: user.id,
        date: currentDate
      }
    })

    if (deletedVote.count === 0) {
      return NextResponse.json(
        { error: 'No vote found to delete' },
        { status: 404 }
      )
    }

    console.log('🔍 Vote deleted successfully')
    
    return NextResponse.json({ 
      success: true,
      message: 'Vote removed successfully'
    })

  } catch (error) {
    console.error('🔍 Error deleting vote:', error)
    return NextResponse.json(
      { error: 'Failed to remove vote', details: String(error) },
      { status: 500 }
    )
  }
}
