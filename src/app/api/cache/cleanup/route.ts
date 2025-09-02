import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { todayKeyEuropeHelsinki } from '@/lib/menu/day';
import { getCurrentWeekStart, isBeforeTuesdayNoon } from '@/lib/time/week';

export async function POST(req: Request) {
  try {
    // Security check to prevent accidental cleanup calls
    const secret = process.env.CRON_SECRET;
    const header = req.headers.get('x-cron-secret');
    if (!secret || header !== secret) {
      console.log('🔒 Cleanup blocked (missing/invalid x-cron-secret)');
      return NextResponse.json({ ok: true, skipped: true });
    }

    const currentWeekStart = getCurrentWeekStart();
    const today = todayKeyEuropeHelsinki();
    console.log(`🧹 Starting cache cleanup. currentWeekStart=${currentWeekStart.toISOString()}, today=${today}`);

    // Archive old votes (only from previous weeks, not current week)
    await archiveOldVotes(currentWeekStart);

    // Clean up old menu cache (keep existing per-day logic)
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
      deletedCache: deletedCache.count
    });
  } catch (error) {
    console.error('Cache cleanup failed:', error);
    return NextResponse.json(
      { error: 'Failed to clean expired cache' },
      { status: 500 }
    );
  }
}

async function archiveOldVotes(currentWeekStart: Date) {
  // 1) Pull ONLY votes from previous weeks (lt: less than current week start)
  const oldVotes = await prisma.vote.findMany({
    where: { weekOf: { lt: currentWeekStart } }, // <<< key change: only previous weeks
    include: {
      restaurant: { select: { name: true } },
      user: { select: { name: true } },
    },
  });

  if (oldVotes.length === 0) {
    console.log('📦 No old votes to archive');
    return;
  }

  console.log(`📦 Archiving ${oldVotes.length} vote(s) older than ${currentWeekStart.toISOString()}`);

  // Create history records
  await prisma.voteHistory.createMany({
    data: oldVotes.map((v) => ({
      restaurantId: v.restaurantId,
      restaurantName: v.restaurant.name,
      userId: v.userId,
      userName: v.user.name,
      weekOf: v.weekOf,
      originalVoteDate: v.createdAt,
    })),
  });

  // Delete the old votes after archiving (delete exactly what we archived)
  const deletedVotes = await prisma.vote.deleteMany({
    where: { weekOf: { lt: currentWeekStart } },
  });

  console.log(`🗳️ Archived & deleted ${deletedVotes.count} old vote(s)`);
}
