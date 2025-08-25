// lib/dbMenuCache.ts
import { prisma } from '@/lib/db'

interface ProcessedMenuEntry {
  restaurantId: string
  language: string
  rawMenu: string
  parsedMenu: string
  date: string
}



export class DbMenuCache {
  private static getTodayDate(): string {
    return new Date().toISOString().split('T')[0]
  }

  static async getCachedProcessedMenu(
    restaurantId: string,
    language: 'en' | 'fi',
    dateKey?: string            // << NEW
  ): Promise<ProcessedMenuEntry | null> {
    try {
      const date = dateKey ?? this.getTodayDate()   // << use override when provided
      const cached = await prisma.menuCache.findFirst({
        where: { restaurantId, language, date }
      })
      if (!cached) return null
      console.log(`Database cache hit for ${restaurantId} (${language}) on ${date}`)
      return {
        restaurantId: cached.restaurantId,
        language: cached.language,
        rawMenu: cached.rawMenu,
        parsedMenu: cached.parsedMenu,
        date: cached.date
      }
    } catch (error) {
      console.error('Error reading from database cache:', error)
      return null
    }
  }


  // Add this method to your existing DbMenuCache class
static async getCachedProcessedMenuWithValidation(
  restaurantId: string,
  language: 'en' | 'fi',
  dateKey?: string
): Promise<ProcessedMenuEntry | null> {
  try {
    const targetDate = dateKey ?? this.getTodayDate();
    
    // Get any existing cache for this restaurant/language
    const cached = await prisma.menuCache.findFirst({
      where: { restaurantId, language },
      orderBy: { createdAt: 'desc' }
    });

    if (!cached) return null;

    // Check if cache is from target date
    if (cached.date === targetDate) {
      console.log(`Database cache hit for ${restaurantId} (${language}) on ${targetDate}`);
      return {
        restaurantId: cached.restaurantId,
        language: cached.language,
        rawMenu: cached.rawMenu,
        parsedMenu: cached.parsedMenu,
        date: cached.date
      };
    }

    // Cache is expired - delete it
    console.log(`Deleting expired cache for ${restaurantId} (${language}) from ${cached.date}`);
    await prisma.menuCache.deleteMany({
      where: { 
        restaurantId, 
        language,
        date: { not: targetDate }
      }
    });

    return null; // Force fresh scraping
  } catch (error) {
    console.error('Error validating database cache:', error);
    return null;
  }
}

  static async setCachedProcessedMenu(
    restaurantId: string,
    restaurantName: string,
    language: 'en' | 'fi',
    rawMenu: string,
    parsedMenu: string,
    dateKey?: string           // << NEW
  ): Promise<void> {
    try {
      const date = dateKey ?? this.getTodayDate()  // << use override when provided
      await prisma.menuCache.upsert({
        where: {
          restaurantId_date_language: { restaurantId, date, language }
        },
        update: { rawMenu, parsedMenu, scrapedAt: new Date() },
        create: { restaurantId, language, rawMenu, parsedMenu, date }
      })
      console.log(`Cached processed menu in database: ${restaurantName} (${language}) on ${date}`)
    } catch (error) {
      console.error('Error caching to database:', error)
      try {
        const date = dateKey ?? this.getTodayDate()
        await prisma.menuCache.create({
          data: { restaurantId, language, rawMenu, parsedMenu, date }
        })
        console.log(`Fallback: Created menu cache entry for ${restaurantName}`)
      } catch (createError) {
        console.error('Fallback create also failed:', createError)
      }
    }
  }

  static async cleanOldCache(daysToKeep: number = 7): Promise<void> { /* unchanged */ }

  static async getAllCached() { /* unchanged */ }
}
