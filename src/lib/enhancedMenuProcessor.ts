import { DbMenuCache } from './dbMenuCache'
import { RestaurantScrapers, type ScrapedMenu } from './restaurantScrapers'
import { parseRestaurantMenu } from '@/ai/flows/parse-restaurant-menu'
import { weekdayLabelFi, todayKeyEuropeHelsinki } from './menu/day'

type ProcessOptions = {
  targetDayFi?: string
  dateKey?: string
  skipCache?: boolean
}

const FI_DAYS = ['Maanantai','Tiistai','Keskiviikko','Torstai','Perjantai'] as const;
const EN_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'] as const;

type WeekdayFi5 = typeof FI_DAYS[number];

const DAY_EN_TO_FI_LOWER: Record<string, WeekdayFi5> = {
  monday: 'Maanantai',
  tuesday: 'Tiistai',
  wednesday: 'Keskiviikko',
  thursday: 'Torstai',
  friday: 'Perjantai',
};

// Always return the *union* type (not plain string)
function normalizeFiDay(input?: string): WeekdayFi5 {
  if (input) {
    const lc = input.toLowerCase();

    // english slug -> FI
    if (lc in DAY_EN_TO_FI_LOWER) return DAY_EN_TO_FI_LOWER[lc];

    // "Monday" etc. -> FI
    const enIdx = EN_DAYS.findIndex(d => d.toLowerCase() === lc);
    if (enIdx !== -1) return FI_DAYS[enIdx];

    // already Finnish (any case)
    const fi = FI_DAYS.find(d => d.toLowerCase() === lc);
    if (fi) return fi;
  }

  // fallback: coerce weekdayLabelFi to Mon–Fri union, otherwise Monday
  const today = (weekdayLabelFi(new Date()) || '').toLowerCase();
  const fi = FI_DAYS.find(d => d.toLowerCase() === today);
  return fi ?? 'Maanantai';
}

// Day-slicer: return ONLY the requested day in the requested language
function extractPorDaySection(weeklyText: string, lang: 'fi'|'en', targetDayFiInput: string): string {
  const targetFi: WeekdayFi5 = normalizeFiDay(targetDayFiInput);
  const targetEn = EN_DAYS[FI_DAYS.indexOf(targetFi)];
  const targetLabel = lang === 'fi' ? targetFi : targetEn;

  console.log(`🔍 Extracting POR day section for ${targetLabel} (${lang}) from ${weeklyText.length} chars`);

  // The new POR scraper format uses: --- Day ---
  const headerRe = /---\s*(Maanantai|Tiistai|Keskiviikko|Torstai|Perjantai|Monday|Tuesday|Wednesday|Thursday|Friday)\s*---/gi;

  const headers: Array<{ idx: number; day: string; lang: 'fi'|'en' }> = [];
  let match;
  while ((match = headerRe.exec(weeklyText)) !== null) {
    const day = match[1];
    headers.push({
      idx: match.index,
      day,
      lang: (FI_DAYS as readonly string[]).includes(day as any) ? 'fi' : 'en',
    });
  }

  console.log(`🔍 Found ${headers.length} day headers:`, headers.map(h => `${h.day}(${h.lang})`));

  if (!headers.length || !targetLabel) {
    console.log(`🔍 No headers found or no target label`);
    return '';
  }

  const targetIdx = headers.findIndex(
    h => h.lang === lang && h.day.toLowerCase() === targetLabel.toLowerCase()
  );
  
  console.log(`🔍 Target index for ${targetLabel}: ${targetIdx}`);
  
  if (targetIdx === -1) {
    console.log(`🔍 Target day ${targetLabel} not found in available days`);
    return '';
  }

  // slice until next header in the same language
  const nextSameLang = headers.slice(targetIdx + 1).find(h => h.lang === lang);
  const start = headers[targetIdx].idx;
  const end = nextSameLang ? nextSameLang.idx : weeklyText.length;

  const result = weeklyText.slice(start, end).trim();
  console.log(`🔍 Extracted section length: ${result.length}`);
  
  return result;
}

export class EnhancedMenuProcessor {
  static async processRestaurantWithCache(
    restaurantId: string,
    restaurantName: string,
    language: 'en' | 'fi',
    options: ProcessOptions = {}
  ): Promise<{ rawMenu: string; parsedMenu: string; fromCache: boolean }> {
    const targetDayFi = normalizeFiDay(options.targetDayFi);
    const dateKey = options.dateKey || todayKeyEuropeHelsinki();
    const { skipCache } = options;

    // 1) Cache first (unless skipCache)
    if (!skipCache) {
const cached = await DbMenuCache.getCachedProcessedMenuWithValidation(restaurantId, language, dateKey)
      if (cached) {
        console.log(`Cache hit for ${restaurantName} (${language}) on ${dateKey}`)
        return { rawMenu: cached.rawMenu, parsedMenu: cached.parsedMenu, fromCache: true }
      }
    }

    console.log(`Cache ${skipCache ? 'bypassed' : 'miss'} for ${restaurantName} (${language}), dateKey=${dateKey}, scraping fresh...`)

    try {
      let scrapedMenu: ScrapedMenu | null = null;

      switch (restaurantId) {
        case 'tellus': {
          scrapedMenu = await RestaurantScrapers.scrapeTellus(language, { targetDayFi })
          if (scrapedMenu.success && scrapedMenu.rawMenu) {
            await DbMenuCache.setCachedProcessedMenu(
              restaurantId, restaurantName, language, scrapedMenu.rawMenu, scrapedMenu.rawMenu, dateKey
            )
            return { rawMenu: scrapedMenu.rawMenu, parsedMenu: scrapedMenu.rawMenu, fromCache: false }
          }
          break
        }

        case 'por': {
          const fiDay = targetDayFi;

          // Prefer scraper that can return just the requested day+language
          let res: ScrapedMenu | null = null;
          try {
            res = await RestaurantScrapers.scrapePor({ targetDayFi: fiDay, language });
          } catch {
            // older build signature — ignore and try fallback
          }

          if (res?.success && res.rawMenu) {
            const dayOnly = res.rawMenu.trim();
            await DbMenuCache.setCachedProcessedMenu(
              restaurantId,
              restaurantName,
              language,
              dayOnly,
              dayOnly,
              dateKey
            );
            return { rawMenu: dayOnly, parsedMenu: dayOnly, fromCache: false };
          }

          // Fallback: weekly scrape -> slice to requested day+language
          const weekly = await RestaurantScrapers.scrapePor();
          if (weekly.success && weekly.rawMenu) {
            const daySlice = extractPorDaySection(weekly.rawMenu, language, fiDay).trim();

            if (daySlice) {
              await DbMenuCache.setCachedProcessedMenu(
                restaurantId,
                restaurantName,
                language,
                daySlice,
                daySlice,
                dateKey
              );
              return { rawMenu: daySlice, parsedMenu: daySlice, fromCache: false };
            }

            // If the specific day isn't available, return a helpful message instead of failing
            const availableDays = weekly.rawMenu.match(/---\s*(Maanantai|Tiistai|Keskiviikko|Torstai|Perjantai|Monday|Tuesday|Wednesday|Thursday|Friday)\s*---/gi);
            const daysList = availableDays ? availableDays.map(d => d.replace(/---\s*|\s*---/g, '')).join(', ') : 'none found';
            
            const notAvailableMessage = language === 'fi' 
              ? `${fiDay} ei ole saatavilla tällä viikolla. Saatavilla olevat päivät: ${daysList}`
              : `${EN_DAYS[FI_DAYS.indexOf(fiDay)]} is not available this week. Available days: ${daysList}`;

            await DbMenuCache.setCachedProcessedMenu(
              restaurantId,
              restaurantName,
              language,
              notAvailableMessage,
              notAvailableMessage,
              dateKey
            );
            
            return { rawMenu: notAvailableMessage, parsedMenu: notAvailableMessage, fromCache: false };
          }

          scrapedMenu = weekly;
          break;
        }

        case 'valimo-park': {
          const targetFi = targetDayFi;
          scrapedMenu = await RestaurantScrapers.scrapeValimoPark({ targetDayFi: targetFi });
          if (scrapedMenu.success && scrapedMenu.rawMenu) {
            await DbMenuCache.setCachedProcessedMenu(
              restaurantId,
              restaurantName,
              language,
              scrapedMenu.rawMenu,
              scrapedMenu.rawMenu,
              dateKey
            );
            return { rawMenu: scrapedMenu.rawMenu, parsedMenu: scrapedMenu.rawMenu, fromCache: false };
          }
          break;
        }

        case 'valaja': {
          const targetFi = targetDayFi;
          const scraped = await RestaurantScrapers.scrapeValaja({ targetDayFi: targetFi, language });

          if (scraped.success && scraped.rawMenu) {
            await DbMenuCache.setCachedProcessedMenu(
              restaurantId,
              restaurantName,
              language,
              scraped.rawMenu,
              scraped.rawMenu,
              dateKey
            );
            return { rawMenu: scraped.rawMenu, parsedMenu: scraped.rawMenu, fromCache: false };
          }
          scrapedMenu = scraped;
          break;
        }

        case 'factory': {
          scrapedMenu = await RestaurantScrapers.scrapeFactoryAI({
            targetDay: targetDayFi, language
          })
          if (scrapedMenu.success && scrapedMenu.rawMenu) {
            await DbMenuCache.setCachedProcessedMenu(
              restaurantId, restaurantName, language, scrapedMenu.rawMenu, scrapedMenu.rawMenu, dateKey
            )
            return { rawMenu: scrapedMenu.rawMenu, parsedMenu: scrapedMenu.rawMenu, fromCache: false }
          }
          break
        }

        case 'ravintola-valimo': {
          scrapedMenu = await RestaurantScrapers.scrapeRavintolaValimoAI({
            targetDay: targetDayFi, language
          })
          if (scrapedMenu.success && scrapedMenu.rawMenu) {
            await DbMenuCache.setCachedProcessedMenu(
              restaurantId, restaurantName, language, scrapedMenu.rawMenu, scrapedMenu.rawMenu, dateKey
            )
            return { rawMenu: scrapedMenu.rawMenu, parsedMenu: scrapedMenu.rawMenu, fromCache: false }
          }
          break
        }

        default:
          throw new Error(`Unknown restaurant: ${restaurantId}`)
      }

      // If scraper ran but failed or returned empty → try AI parsing if we have some content
      if (!scrapedMenu || !scrapedMenu.rawMenu) {
        // No content at all - return error message
        return {
          rawMenu: `Could not fetch menu for ${restaurantName}. Please check their website.`,
          parsedMenu: `Menu not available for ${restaurantName}. Visit their website for current offerings.`,
          fromCache: false,
        }
      }

      // We have content but scraping "failed" - try AI parsing as fallback
      if (!scrapedMenu.success) {
        console.log(`AI parsing menu for ${restaurantName} as fallback...`)
        const parseResult = await parseRestaurantMenu({
          restaurantName,
          menuText: scrapedMenu.rawMenu,
        })

        await DbMenuCache.setCachedProcessedMenu(
          restaurantId, restaurantName, language, scrapedMenu.rawMenu, parseResult.parsedMenu, dateKey
        )

        return { rawMenu: scrapedMenu.rawMenu, parsedMenu: parseResult.parsedMenu, fromCache: false }
      }

      // Success case - no AI parsing needed
      await DbMenuCache.setCachedProcessedMenu(
        restaurantId, restaurantName, language, scrapedMenu.rawMenu, scrapedMenu.rawMenu, dateKey
      )

      return { rawMenu: scrapedMenu.rawMenu, parsedMenu: scrapedMenu.rawMenu, fromCache: false }
    } catch (error) {
      console.error(`Error processing ${restaurantName}:`, error)
      return {
        rawMenu: `Could not fetch menu for ${restaurantName}. Please check their website.`,
        parsedMenu: `Menu not available for ${restaurantName}. Visit their website for current offerings.`,
        fromCache: false,
      }
    }
  }
}