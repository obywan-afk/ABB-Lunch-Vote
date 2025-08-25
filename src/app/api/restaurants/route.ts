import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Helper function to get current week start (Monday)
function getCurrentWeekStart(): Date {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - now.getDay() + 1)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export async function GET() {
  try {
    const weekOf = getCurrentWeekStart()
    
    const restaurants = await prisma.restaurant.findMany({
      include: {
        votes: {
          where: {
            weekOf: weekOf
          }
        }
      }
    })

    const restaurantsWithVoteCounts = restaurants.map((restaurant: any) => ({
      id: restaurant.id,
      name: restaurant.name,
      location: restaurant.location,
      description: restaurant.description,
      votes: restaurant.votes.length
    }))

    return NextResponse.json(restaurantsWithVoteCounts)
  } catch (error) {
    console.error('Error fetching restaurants:', error)
    return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 })
  }
}