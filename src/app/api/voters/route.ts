import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Get current week's Monday
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    monday.setHours(0, 0, 0, 0);

    // Get all votes for this week with user names
    const votes = await prisma.vote.findMany({
      where: {
        weekOf: monday
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
