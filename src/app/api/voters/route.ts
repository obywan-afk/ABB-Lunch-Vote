import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { todayKeyEuropeHelsinki } from '@/lib/menu/day';

export async function GET() {
  try {
    // Get today's date in Helsinki timezone
    const today = todayKeyEuropeHelsinki();

    // Get all votes for today with user names
    const votes = await prisma.vote.findMany({
      where: {
        date: today
      },
      include: {
        user: {
          select: {
            name: true
          }
        }
      }
    });

    // Extract unique voter names
    const voterNames = [...new Set(votes.map((vote: any) => vote.user.name).filter(Boolean))];

    return NextResponse.json({
      count: voterNames.length,
      names: voterNames
    });

  } catch (error) {
    console.error('Error fetching voters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voters' },
      { status: 500 }
    );
  }
}
