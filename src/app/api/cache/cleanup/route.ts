import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { todayKeyEuropeHelsinki } from '@/lib/menu/day';

export async function POST() {
  try {
    const today = todayKeyEuropeHelsinki();
    console.log(`🧹 Starting daily cache cleanup for date: ${today}`);
    
    const result = await prisma.menuCache.deleteMany({
      where: {
        date: {
          not: today
        }
      }
    });

    console.log(`🗑️ Deleted ${result.count} expired cache entries`);
    
    return NextResponse.json({
      success: true,
      message: 'Expired cache cleaned successfully',
      deleted: result.count
    });
  } catch (error) {
    console.error('Cache cleanup failed:', error);
    return NextResponse.json(
      { error: 'Failed to clean expired cache' },
      { status: 500 }
    );
  }
}