import { DbMenuCache } from './dbMenuCache'
import { RestaurantScrapers, type ScrapedMenu } from './restaurantScrapers'
import { parseRestaurantMenu } from '@/ai/flows/parse-restaurant-menu'
import { translateMenuToEnglish } from './simpleTranslate'
import { weekdayLabelFi, todayKeyEuropeHelsinki } from './menu/day'

type ProcessOptions = {
  targetDayFi?: string
  dateKey?: string
  skipCache?: boolean
}

type ProcessedMenuResult = { rawMenu: string; parsedMenu: string; fromCache: boolean }

function cleanMenuForDisplay(menuText: string): string {
  return menuText
    .replace(/---\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Maanantai|Tiistai|Keskiviikko|Torstai|Perjantai)\s*---\s*/gi, '')
    .replace(/\bbr\b\s*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function cacheAndReturnMenu(
  restaurantId: string,
  restaurantName: string,
  language: 'en' | 'fi',
  menu: string,
  dateKey: string
): Promise<ProcessedMenuResult> {
  await DbMenuCache.setCachedProcessedMenu(restaurantId, restaurantName, language, menu, menu, dateKey)
  const cleaned = cleanMenuForDisplay(menu)
  return { rawMenu: cleaned, parsedMenu: cleaned, fromCache: false }
}

async function handleFinnishOnlyMenu(
  restaurantId: string,
  restaurantName: string,
  language: 'en' | 'fi',
  rawMenu: string,
  dateKey: string
): Promise<ProcessedMenuResult> {
  if (language !== 'en') return cacheAndReturnMenu(restaurantId, restaurantName, language, rawMenu, dateKey)

  console.log(`Translating ${restaurantName} menu from Finnish to English...`)
  try {
    const translatedMenu = await translateMenuToEnglish(rawMenu)
    await DbMenuCache.setCachedProcessedMenu(restaurantId, restaurantName, 'fi', rawMenu, rawMenu, dateKey)
    await DbMenuCache.setCachedProcessedMenu(restaurantId, restaurantName, 'en', translatedMenu, translatedMenu, dateKey)
    const cleaned = cleanMenuForDisplay(translatedMenu)
    return { rawMenu: cleaned, parsedMenu: cleaned, fromCache: false }
  } catch (error) {
    console.error(`Translation error for ${restaurantName}:`, error)
    const message = `English translation is temporarily unavailable for ${restaurantName}. Please switch to Finnish (FI) for this menu.`
    return { rawMenu: message, parsedMenu: message, fromCache: false }
  }
}

const FI_DAYS = ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai'] as const
const EN_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const
type WeekdayFi5 = typeof FI_DAYS[number]

const DAY_EN_TO_FI_LOWER: Record<string, WeekdayFi5> = {
  monday: 'Maanantai',
  tuesday: 'Tiistai',
  wednesday: 'Keskiviikko',
  thursday: 'Torstai',
  friday: 'Perjantai',
}

function normalizeFiDay(input?: string): WeekdayFi5 {
  if (input) {
    const lc = input.toLowerCase()
    if (lc in DAY_EN_TO_FI_LOWER) return DAY_EN_TO_FI_LOWER[lc]
    const enIdx = EN_DAYS.findIndex((d) => d.toLowerCase() === lc)
    if (enIdx !== -1) return FI_DAYS[enIdx]
    const fi = FI_DAYS.find((d) => d.toLowerCase() === lc)
    if (fi) return fi
  }

  const today = (weekdayLabelFi(new Date()) || '').toLowerCase()
  const fi = FI_DAYS.find((d) => d.toLowerCase() === today)
  return fi ?? 'Maanantai'
}

function extractPorDaySection(weeklyText: string, lang: 'fi' | 'en', targetDayFiInput: string): string {
  const targetFi: WeekdayFi5 = normalizeFiDay(targetDayFiInput)
  const targetEn = EN_DAYS[FI_DAYS.indexOf(targetFi)]
  const targetLabel = lang === 'fi' ? targetFi : targetEn
  console.log(`Extracting POR day section for ${targetLabel} (${lang}) from ${weeklyText.length} chars`)

  const headerRe = /---\s*(Maanantai|Tiistai|Keskiviikko|Torstai|Perjantai|Monday|Tuesday|Wednesday|Thursday|Friday)\s*---/gi
  const headers: Array<{ idx: number; day: string; lang: 'fi' | 'en' }> = []
  let match: RegExpExecArray | null
  while ((match = headerRe.exec(weeklyText)) !== null) {
    const day = match[1]
    headers.push({ idx: match.index, day, lang: (FI_DAYS as readonly string[]).includes(day) ? 'fi' : 'en' })
  }

  if (!headers.length || !targetLabel) return ''
  const targetIdx = headers.findIndex((h) => h.lang === lang && h.day.toLowerCase() === targetLabel.toLowerCase())
  if (targetIdx === -1) return ''

  const nextSameLang = headers.slice(targetIdx + 1).find((h) => h.lang === lang)
  const start = headers[targetIdx].idx
  const end = nextSameLang ? nextSameLang.idx : weeklyText.length
  return weeklyText.slice(start, end).trim()
}

export class EnhancedMenuProcessor {
  static async processRestaurantWithCache(
    restaurantId: string,
    restaurantName: string,
    language: 'en' | 'fi',
    options: ProcessOptions = {}
  ): Promise<ProcessedMenuResult> {
    const targetDayFi = normalizeFiDay(options.targetDayFi)
    const dateKey = options.dateKey || todayKeyEuropeHelsinki()
    const { skipCache } = options

    if (!skipCache) {
      const cached = await DbMenuCache.getCachedProcessedMenuWithValidation(restaurantId, language, dateKey)
      if (cached) {
        if (
          restaurantId === 'por' &&
          /not available this week|ei ole saatavilla tällä viikolla/i.test(cached.rawMenu)
        ) {
          console.log(`Skipping POR negative cache for ${restaurantName} to re-validate day extraction`)
        } else {
          console.log(`Cache hit for ${restaurantName} (${language}) on ${dateKey}`)
          return {
            rawMenu: cleanMenuForDisplay(cached.rawMenu),
            parsedMenu: cleanMenuForDisplay(cached.parsedMenu),
            fromCache: true,
          }
        }
      }
    }

    try {
      let scrapedMenu: ScrapedMenu | null = null

      switch (restaurantId) {
        case 'tellus': {
          scrapedMenu = await RestaurantScrapers.scrapeTellus(language, { targetDayFi })
          if (scrapedMenu.success && scrapedMenu.rawMenu) return cacheAndReturnMenu(restaurantId, restaurantName, language, scrapedMenu.rawMenu, dateKey)
          break
        }
        case 'por': {
          const fiDay = targetDayFi
          let res: ScrapedMenu | null = null
          try { res = await RestaurantScrapers.scrapePor({ targetDayFi: fiDay, language }) } catch {}
          if (res?.success && res.rawMenu) return cacheAndReturnMenu(restaurantId, restaurantName, language, res.rawMenu.trim(), dateKey)

          const weekly = await RestaurantScrapers.scrapePor()
          if (weekly.success && weekly.rawMenu) {
            const daySlice = extractPorDaySection(weekly.rawMenu, language, fiDay).trim()
            if (daySlice) return cacheAndReturnMenu(restaurantId, restaurantName, language, daySlice, dateKey)

            const availableDays =
              weekly.rawMenu.match(/---\s*(Maanantai|Tiistai|Keskiviikko|Torstai|Perjantai|Monday|Tuesday|Wednesday|Thursday|Friday)\s*---/gi) ?? []
            const labels = availableDays.map((d) => d.replace(/---\s*|\s*---/g, '').trim())
            const daySet = new Set(labels)
            const daysInRequestedLang = (language === 'fi' ? FI_DAYS : EN_DAYS).filter((day) => daySet.has(day))
            const daysList = daysInRequestedLang.length ? daysInRequestedLang.join(', ') : 'none found'
            const notAvailableMessage =
              language === 'fi'
                ? `${fiDay} ei ole saatavilla tällä viikolla. Saatavilla olevat päivät: ${daysList}`
                : `${EN_DAYS[FI_DAYS.indexOf(fiDay)]} is not available this week. Available days: ${daysList}`

            await DbMenuCache.setCachedProcessedMenu(restaurantId, restaurantName, language, notAvailableMessage, notAvailableMessage, dateKey)
            return { rawMenu: notAvailableMessage, parsedMenu: notAvailableMessage, fromCache: false }
          }
          scrapedMenu = weekly
          break
        }
        case 'valimo-park': {
          scrapedMenu = await RestaurantScrapers.scrapeValimoPark({ targetDayFi })
          if (scrapedMenu.success && scrapedMenu.rawMenu) return handleFinnishOnlyMenu(restaurantId, restaurantName, language, scrapedMenu.rawMenu, dateKey)
          break
        }
        case 'valaja': {
          const scraped = await RestaurantScrapers.scrapeValaja({ targetDayFi, language })
          if (scraped.success && scraped.rawMenu) return cacheAndReturnMenu(restaurantId, restaurantName, language, scraped.rawMenu, dateKey)
          scrapedMenu = scraped
          break
        }
        case 'factory': {
          scrapedMenu = await RestaurantScrapers.scrapeFactoryAI({ targetDay: targetDayFi, language })
          if (scrapedMenu.success && scrapedMenu.rawMenu) return handleFinnishOnlyMenu(restaurantId, restaurantName, language, scrapedMenu.rawMenu, dateKey)
          break
        }
        case 'ravintola-valimo': {
          scrapedMenu = await RestaurantScrapers.scrapeRavintolaValimoAI({ targetDay: targetDayFi, language })
          if (scrapedMenu.success && scrapedMenu.rawMenu) return handleFinnishOnlyMenu(restaurantId, restaurantName, language, scrapedMenu.rawMenu, dateKey)
          break
        }
        case 'antell-kuohu': {
          scrapedMenu = await RestaurantScrapers.scrapeAntellKuohu({ targetDayFi })
          if (scrapedMenu.success && scrapedMenu.rawMenu) return handleFinnishOnlyMenu(restaurantId, restaurantName, language, scrapedMenu.rawMenu, dateKey)
          break
        }
        default:
          throw new Error(`Unknown restaurant: ${restaurantId}`)
      }

      if (!scrapedMenu || !scrapedMenu.rawMenu) {
        return {
          rawMenu: `Could not fetch menu for ${restaurantName}. Please check their website.`,
          parsedMenu: `Menu not available for ${restaurantName}. Visit their website for current offerings.`,
          fromCache: false,
        }
      }

      if (!scrapedMenu.success) {
        const parseResult = await parseRestaurantMenu({ restaurantName, menuText: scrapedMenu.rawMenu })
        await DbMenuCache.setCachedProcessedMenu(restaurantId, restaurantName, language, scrapedMenu.rawMenu, parseResult.parsedMenu, dateKey)
        return { rawMenu: scrapedMenu.rawMenu, parsedMenu: parseResult.parsedMenu, fromCache: false }
      }

      await DbMenuCache.setCachedProcessedMenu(restaurantId, restaurantName, language, scrapedMenu.rawMenu, scrapedMenu.rawMenu, dateKey)
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
