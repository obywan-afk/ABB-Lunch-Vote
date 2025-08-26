import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { todayKeyEuropeHelsinki } from '@/lib/menu/day';

export async function POST() {
  try {
    const today = todayKeyEuropeHelsinki();
    console.log(`🧹 Starting daily cache cleanup for date: ${today}`);
    
    // First, archive old votes before deleting them
    const oldVotes = await prisma.vote.findMany({
      where: {
        weekOf: {
          not: new Date(today) // Votes not from today's week
        }
      },
      include: {
        restaurant: { select: { name: true } },
        user: { select: { name: true } }
      }
    });

    if (oldVotes.length > 0) {
      console.log(`📦 Archiving ${oldVotes.length} old votes to history`);
      
      // Create history records
      await prisma.voteHistory.createMany({
        data: oldVotes.map(vote => ({
          restaurantId: vote.restaurantId,
          restaurantName: vote.restaurant.name,
          userId: vote.userId,
          userName: vote.user.name,
          weekOf: vote.weekOf,
          originalVoteDate: vote.createdAt
        }))
      });

      // Delete the old votes after archiving
      const deletedVotes = await prisma.vote.deleteMany({
        where: {
          weekOf: {
            not: new Date(today)
          }
        }
      });

      console.log(`🗳️ Archived and deleted ${deletedVotes.count} old votes`);
    }

    // Clean up old menu cache (your existing logic)
    const deletedCache = await prisma.menuCache.deleteMany({
      where: {
        date: {
          not: today
        }
      }
    });

    console.log(`🗑️ Deleted ${deletedCache.count} expired cache entries`);
    
    return NextResponse.json({
      success: true,
      message: 'Expired cache and votes cleaned successfully',
      deletedCache: deletedCache.count,
      archivedVotes: oldVotes.length
    });
  } catch (error) {
    console.error('Cache cleanup failed:', error);
    return NextResponse.json(
      { error: 'Failed to clean expired cache' },
      { status: 500 }
    );
  }
}