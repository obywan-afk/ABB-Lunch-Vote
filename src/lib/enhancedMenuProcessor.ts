import { DbMenuCache } from './dbMenuCache'
import { RestaurantScrapers, type ScrapedMenu } from './restaurantScrapers'
import { parseRestaurantMenu } from '@/ai/flows/parse-restaurant-menu'
import { translateMenuToEnglish } from '@/ai/flows/translate-menu'
import { weekdayLabelFi, todayKeyEuropeHelsinki } from './menu/day'

type ProcessOptions = {
  targetDayFi?: string
  dateKey?: string
  skipCache?: boolean
}

// Helper function to detect if text is primarily in Finnish
function detectFinnish(text: string): boolean {
  // Common Finnish food/menu words that are unlikely in English
  const finnishIndicators = [
    'keitto', 'kastike', 'peruna', 'broileri', 'kana', 'liha', 'kala',
    'vihannekset', 'salaatti', 'pihvi', 'paistileike', 'paistettu',
    'grillattua', 'uunissa', 'maanantai', 'tiistai', 'keskiviikko', 
    'torstai', 'perjantai', 'päivän', 'viikon', 'lounas',
    'jauheliha', 'lohta', 'naudanlihaa', 'possua', 'kasvispyöryköitä'
  ];
  
  const lowerText = text.toLowerCase();
  const matches = finnishIndicators.filter(word => lowerText.includes(word));
  
  // If we find 3 or more Finnish indicators, consider it Finnish text
  return matches.length >= 3;
}

// Helper function to clean menu text for display (remove day headers and artifacts)
function cleanMenuForDisplay(menuText: string): string {
  return menuText
    // Remove day headers like "--- Tuesday ---" or "--- Tiistai ---"
    .replace(/---\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Maanantai|Tiistai|Keskiviikko|Torstai|Perjantai)\s*---\s*/gi, '')
    // Remove standalone "br" tags that might appear
    .replace(/\bbr\b\s*/g, '')
    // Clean up multiple consecutive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Trim whitespace
    .trim();
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
        return { 
          rawMenu: cleanMenuForDisplay(cached.rawMenu), 
          parsedMenu: cleanMenuForDisplay(cached.parsedMenu), 
          fromCache: true 
        }
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
            const cleaned = cleanMenuForDisplay(scrapedMenu.rawMenu)
            return { rawMenu: cleaned, parsedMenu: cleaned, fromCache: false }
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
            const cleaned = cleanMenuForDisplay(dayOnly);
            return { rawMenu: cleaned, parsedMenu: cleaned, fromCache: false };
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
              const cleaned = cleanMenuForDisplay(daySlice);
              return { rawMenu: cleaned, parsedMenu: cleaned, fromCache: false };
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
            // Faundori only provides Finnish content, need translation for English
            if (language === 'en' && detectFinnish(scrapedMenu.rawMenu)) {
              console.log(`🌐 Translating Faundori menu from Finnish to English...`);
              try {
                const translationResult = await translateMenuToEnglish({
                  finnishMenu: scrapedMenu.rawMenu,
                  restaurantName: restaurantName
                });

                if (translationResult.output?.success && translationResult.output.translatedMenu) {
                  const translatedMenu = translationResult.output.translatedMenu;
                  // Cache both Finnish (for future reference) and English versions
                  await DbMenuCache.setCachedProcessedMenu(
                    restaurantId, restaurantName, 'fi', scrapedMenu.rawMenu, scrapedMenu.rawMenu, dateKey
                  );
                  await DbMenuCache.setCachedProcessedMenu(
                    restaurantId, restaurantName, 'en', translatedMenu, translatedMenu, dateKey
                  );
                  const cleaned = cleanMenuForDisplay(translatedMenu);
                  return { rawMenu: cleaned, parsedMenu: cleaned, fromCache: false };
                } else {
                  console.log(`⚠️ Translation failed, returning Finnish content: ${translationResult.output?.error}`);
                }
              } catch (error) {
                console.error(`❌ Translation error for Faundori:`, error);
              }
            }
            
            await DbMenuCache.setCachedProcessedMenu(
              restaurantId,
              restaurantName,
              language,
              scrapedMenu.rawMenu,
              scrapedMenu.rawMenu,
              dateKey
            );
            const cleaned = cleanMenuForDisplay(scrapedMenu.rawMenu);
            return { rawMenu: cleaned, parsedMenu: cleaned, fromCache: false };
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
            const cleaned = cleanMenuForDisplay(scraped.rawMenu);
            return { rawMenu: cleaned, parsedMenu: cleaned, fromCache: false };
          }
          scrapedMenu = scraped;
          break;
        }

        case 'factory': {
          scrapedMenu = await RestaurantScrapers.scrapeFactoryAI({
            targetDay: targetDayFi, language
          })
          if (scrapedMenu.success && scrapedMenu.rawMenu) {
            // Factory website is in Finnish, need translation for English
            if (language === 'en' && detectFinnish(scrapedMenu.rawMenu)) {
              console.log(`🌐 Translating Factory menu from Finnish to English...`);
              try {
                const translationResult = await translateMenuToEnglish({
                  finnishMenu: scrapedMenu.rawMenu,
                  restaurantName: restaurantName
                });

                if (translationResult.output?.success && translationResult.output.translatedMenu) {
                  const translatedMenu = translationResult.output.translatedMenu;
                  // Cache both versions
                  await DbMenuCache.setCachedProcessedMenu(
                    restaurantId, restaurantName, 'fi', scrapedMenu.rawMenu, scrapedMenu.rawMenu, dateKey
                  );
                  await DbMenuCache.setCachedProcessedMenu(
                    restaurantId, restaurantName, 'en', translatedMenu, translatedMenu, dateKey
                  );
                  const cleaned = cleanMenuForDisplay(translatedMenu);
                  return { rawMenu: cleaned, parsedMenu: cleaned, fromCache: false };
                } else {
                  console.log(`⚠️ Translation failed, returning Finnish content: ${translationResult.output?.error}`);
                }
              } catch (error) {
                console.error(`❌ Translation error for Factory:`, error);
              }
            }
            
            await DbMenuCache.setCachedProcessedMenu(
              restaurantId, restaurantName, language, scrapedMenu.rawMenu, scrapedMenu.rawMenu, dateKey
            )
            const cleaned = cleanMenuForDisplay(scrapedMenu.rawMenu)
            return { rawMenu: cleaned, parsedMenu: cleaned, fromCache: false }
          }
          break
        }

        case 'ravintola-valimo': {
          scrapedMenu = await RestaurantScrapers.scrapeRavintolaValimoAI({
            targetDay: targetDayFi, language
          })
          if (scrapedMenu.success && scrapedMenu.rawMenu) {
            // Ravintola Valimo website is in Finnish, need translation for English
            if (language === 'en' && detectFinnish(scrapedMenu.rawMenu)) {
              console.log(`🌐 Translating Ravintola Valimo menu from Finnish to English...`);
              try {
                const translationResult = await translateMenuToEnglish({
                  finnishMenu: scrapedMenu.rawMenu,
                  restaurantName: restaurantName
                });

                if (translationResult.output?.success && translationResult.output.translatedMenu) {
                  const translatedMenu = translationResult.output.translatedMenu;
                  // Cache both versions
                  await DbMenuCache.setCachedProcessedMenu(
                    restaurantId, restaurantName, 'fi', scrapedMenu.rawMenu, scrapedMenu.rawMenu, dateKey
                  );
                  await DbMenuCache.setCachedProcessedMenu(
                    restaurantId, restaurantName, 'en', translatedMenu, translatedMenu, dateKey
                  );
                  const cleaned = cleanMenuForDisplay(translatedMenu);
                  return { rawMenu: cleaned, parsedMenu: cleaned, fromCache: false };
                } else {
                  console.log(`⚠️ Translation failed, returning Finnish content: ${translationResult.output?.error}`);
                }
              } catch (error) {
                console.error(`❌ Translation error for Ravintola Valimo:`, error);
              }
            }
            
            await DbMenuCache.setCachedProcessedMenu(
              restaurantId, restaurantName, language, scrapedMenu.rawMenu, scrapedMenu.rawMenu, dateKey
            )
            const cleaned = cleanMenuForDisplay(scrapedMenu.rawMenu)
            return { rawMenu: cleaned, parsedMenu: cleaned, fromCache: false }
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
