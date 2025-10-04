import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentDate } from '@/lib/time/week';

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

    // Get current date
    const currentDate = getCurrentDate();

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

    // Check if user has voted TODAY
    const vote = await prisma.vote.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: currentDate
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
