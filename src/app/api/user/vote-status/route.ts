import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    // Get user name from headers
    const userName = request.headers.get('x-user-name');
    if (!userName) {
      return NextResponse.json({
        hasVoted: false,
        votedRestaurantId: null
      });
    }

    // Get current week's Monday
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    monday.setHours(0, 0, 0, 0);

    // Find user
    const user = await prisma.user.findFirst({
      where: { name: userName }
    });

    if (!user) {
      return NextResponse.json({
        hasVoted: false,
        votedRestaurantId: null
      });
    }

    // Check if user has voted this week
    const vote = await prisma.vote.findUnique({
      where: {
        userId_weekOf: {
          userId: user.id,
          weekOf: monday
        }
      }
    });

    return NextResponse.json({
      hasVoted: !!vote,
      votedRestaurantId: vote?.restaurantId || null
    });

  } catch (error) {
    console.error('Error checking user vote status:', error);
    return NextResponse.json(
      { error: 'Failed to check vote status' },
      { status: 500 }
    );
  }
}
