import { aiMenuExtractor, type AiScrapingOptions, type AiMenuExtractionResult } from '@/ai/flows/ai-restaurant-scraper'

export interface ScrapedMenu {
  restaurantId: string
  restaurantName: string
  rawMenu: string
  success: boolean
  error?: string
}

const DAY_FI_TO_EN: Record<string, string> = {
  Maanantai: 'Monday',
  Tiistai: 'Tuesday',
  Keskiviikko: 'Wednesday',
  Torstai: 'Thursday',
  Perjantai: 'Friday',
};

const DAY_FI_SHORT: Record<string, string> = {
  Maanantai: 'Ma',
  Tiistai: 'Ti',
  Keskiviikko: 'Ke',
  Torstai: 'To',
  Perjantai: 'Pe',
};

const DAY_EN_SHORT: Record<string, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
};

const DAY_FI = ['Maanantai','Tiistai','Keskiviikko','Torstai','Perjantai'] as const;
const DAY_EN = ['Monday','Tuesday','Wednesday','Thursday','Friday'] as const;

const DAY_EN_TO_FI: Record<(typeof DAY_EN)[number], (typeof DAY_FI)[number]> = {
  Monday: 'Maanantai',
  Tuesday: 'Tiistai',
  Wednesday: 'Keskiviikko',
  Thursday: 'Torstai',
  Friday: 'Perjantai',
};

const WEEKDAY_FI = [
  'Sunnuntai','Maanantai','Tiistai','Keskiviikko','Torstai','Perjantai','Lauantai'
] as const;
type WeekdayFi = typeof WEEKDAY_FI[number];

function weekdayFiFromDate(dateStr: string): WeekdayFi {
  let d: Date | null = null;

  // 1) YYYY-MM-DD (optionally with trailing time)
  {
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  // 2) DD.MM.YYYY
  if (!d) {
    const m = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (m) d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  }

  // 3) Fallback: native parser
  if (!d) {
    const tmp = new Date(dateStr);
    if (!Number.isNaN(tmp.getTime())) d = tmp;
  }

  if (d) {
    const idx = d.getDay(); // 0..6 (Sun..Sat)
    return WEEKDAY_FI[idx] ?? 'Tiistai';
  }
  return 'Tiistai';
}

function unifyDietCodes(dietcodes?: string, properties?: string): string {
  const tokens = new Set<string>();
  const pushTokens = (s?: string) => {
    if (!s) return;
    s.split(/[,\s;/()]+/)
      .map(t => t.trim())
      .filter(Boolean)
      .forEach(t => tokens.add(t.toUpperCase()));
  };
  pushTokens(dietcodes);
  pushTokens(properties);
  // common noise to drop
  ['CONTAINS','SIS','SISÄLTÄÄ','HINTA','PRICE'].forEach(t => tokens.delete(t));
  const arr = Array.from(tokens);
  return arr.length ? ` [${arr.join(', ')}]` : '';
}

export class RestaurantScrapers {
  
  private static async fetchWithRetry(url: string, retries = 3): Promise<string> {
    console.log(`🌐 Fetching: ${url}`)
    
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
          }
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const html = await response.text()
        console.log(`📄 Response length: ${html.length} characters`)
        console.log(`📄 First 500 chars: ${html.substring(0, 500)}...`)
        
        return html
      } catch (error) {
        console.log(`❌ Attempt ${i + 1} failed for ${url}:`, error)
        if (i === retries - 1) throw error
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
    throw new Error('All retry attempts failed')
  }

  private static async fetchJsonWithRetry<T = any>(url: string, retries = 3): Promise<T> {
    console.log(`🌐 Fetching JSON: ${url}`)
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json,text/plain,*/*',
            'Accept-Language': 'fi,en;q=0.8'
          }
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        return await res.json() as T
      } catch (err) {
        console.log(`❌ JSON attempt ${i + 1} failed for ${url}:`, err)
        if (i === retries - 1) throw err
        await new Promise(r => setTimeout(r, 1000 * (i + 1)))
      }
    }
    throw new Error('All JSON retry attempts failed')
  }

  private static isTuesday(dateStr: string): boolean {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).getDay() === 2 // Tue
  }

  private static isFriday(dateStr: string): boolean {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).getDay() === 5 // Fri
  }

  private static decodeEntities(s: string) {
    const named: Record<string, string> = {
      '&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'",'&nbsp;':' ',
      '&auml;':'ä','&ouml;':'ö','&aring;':'å','&Auml;':'Ä','&Ouml;':'Ö','&Aring;':'Å',
      '&aacute;':'á','&eacute;':'é','&iacute;':'í','&oacute;':'ó','&uacute;':'ú','&yacute;':'ý',
      '&agrave;':'à','&egrave;':'è','&igrave;':'ì','&ograve;':'ò','&ugrave;':'ù',
      '&acirc;':'â','&ecirc;':'ê','&icirc;':'î','&ocirc;':'ô','&ucirc;':'û',
      '&atilde;':'ã','&otilde;':'õ','&ntilde;':'ñ','&ccedil;':'ç',
      '&Aacute;':'Á','&Eacute;':'É','&Iacute;':'Í','&Oacute;':'Ó','&Uacute;':'Ú','&Yacute;':'Ý',
      '&Agrave;':'À','&Egrave;':'È','&Igrave;':'Ì','&Ograve;':'Ò','&Ugrave;':'Ù',
      '&Acirc;':'Â','&Ecirc;':'Ê','&Icirc;':'Î','&Ocirc;':'Ô','&Ucirc;':'Û',
      '&Atilde;':'Ã','&Otilde;':'Õ','&Ntilde;':'Ñ','&Ccedil;':'Ç',
      '&hellip;':'…','&ndash;':'–','&mdash;':'—','&laquo;':'«','&raquo;':'»'
    };
    // named entities
    s = s.replace(/&[a-zA-Z]+;/g, (m) => named[m] ?? ' ');
    // numeric decimal: &#228;
    s = s.replace(/&#(\d+);/g, (_, d) => {
      const code = Number(d);
      return Number.isFinite(code) ? String.fromCharCode(code) : ' ';
    });
    // numeric hex: &#xE4;
    s = s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
      const code = parseInt(h, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : ' ';
    });
    return s;
  }

  private static cleanMenuText(text: string): string {
    return text
      .replace(/\r/g, '')                 // drop CR
      .replace(/[ \t]+/g, ' ')            // collapse runs of spaces/tabs only
      .replace(/[ \t]*\n[ \t]*/g, '\n')   // trim spaces around each newline
      .replace(/\n{3,}/g, '\n\n')         // cap blank lines to max 1
      .trim();
  }

  private static parsePorHtmlToMenu(
    html: string,
    source: 'WP-REST'|'HTML',
    opts?: { targetDayFi?: 'Maanantai'|'Tiistai'|'Keskiviikko'|'Torstai'|'Perjantai'; language?: 'fi'|'en' }
  ): ScrapedMenu {
    const FI_DAYS = ['Maanantai','Tiistai','Keskiviikko','Torstai','Perjantai'] as const;
    const EN_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'] as const;
    type FiDay = typeof FI_DAYS[number];
    type EnDay = typeof EN_DAYS[number];

    const EN_TO_FI: Record<EnDay, FiDay> = {
      Monday: 'Maanantai',
      Tuesday: 'Tiistai',
      Wednesday: 'Keskiviikko',
      Thursday: 'Torstai',
      Friday: 'Perjantai'
    };
    const FI_TO_EN: Record<FiDay, EnDay> = {
      Maanantai: 'Monday',
      Tiistai: 'Tuesday',
      Keskiviikko: 'Wednesday',
      Torstai: 'Thursday',
      Perjantai: 'Friday'
    };

    console.log(`🔧 POR parsing HTML (${source}), length: ${html.length}`);

    // 1) strip scripts/styles and scope to content-ish container
    let doc = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    const scopeMatch =
      doc.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
      doc.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
      doc.match(/<div[^>]*class=["'][^"']*\b(entry-content|post-content|wp-block-post-content|content-area|wp-block-group)\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

    let scope = scopeMatch ? (scopeMatch[1] || scopeMatch[2] || '') : doc;
    console.log(`🔧 POR scope found: ${!!scopeMatch}, scope length: ${scope.length}`);

    // 2) normalize to text, keep day markers for headings
    scope = scope
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|li|h2|h3|h4|div)>/gi, '\n')
      .replace(/<(h2|h3|h4)[^>]*>/gi, '\n\n--- ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\r/g, '');

    scope = this.decodeEntities(scope)
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    console.log(`🔧 POR normalized scope (first 500 chars): ${scope.slice(0, 500)}`);

    // 3) Try to find day names in the content
    const dayNames = [...FI_DAYS, ...EN_DAYS];
    const dayNamePattern = new RegExp(`\\b(${dayNames.join('|')})\\b`, 'gi');
    const dayMatches = scope.match(dayNamePattern) || [];
    console.log(`🔧 POR found day names: ${dayMatches}`);

    // The POR format after HTML processing is: "  Tiistai 26.8." (with leading spaces and date)
    // We need a pattern that matches this structure
    const porDayPattern = new RegExp(
      `^\\s*(${dayNames.join('|')})\\s+\\d{1,2}\\.\\d{1,2}\\.\\s*$([\\s\\S]*?)(?=^\\s*(?:${dayNames.join('|')})\\s+\\d{1,2}\\.\\d{1,2}\\.|$)`,
      'gim'
    );

    console.log(`🔧 POR trying text-based pattern for processed content`);

    // Alternative pattern for day headers without --- markers
    const altDayPattern = new RegExp(
      `\\b(${dayNames.join('|')})\\b[^\\n]*\\n([\\s\\S]*?)(?=\\b(?:${dayNames.join('|')})\\b|$)`,
      'gi'
    );

    const reLegend = /^\(\s*(?:vl|l|m|g|vs|mp|so|se|si|sm|ka|kl|äy)\s*(?:[,)\s].*)?$/i;
    const reBoiler = /(EU-asetus|regulation|Hinnat|Prices|We reserve rights|Opening hours|Aukiolo)/i;
    const reFacility = /(Water\s*damage|Vesivahinko|We\s*apologize|Pahoittelemme|Week\s*\d+|Viikko\s*\d+)/i;

    type Block = { dayFi: FiDay; lang: 'fi'|'en'; body: string };

    const cleanBody = (s: string) =>
      s.split('\n')
        .map(x => x.replace(/\s+/g, ' ').trim())
        .filter(x => x && !reLegend.test(x) && !reBoiler.test(x) && !reFacility.test(x) && !/^[-–—]+$/.test(x))
        .join('\n');

    const blocks: Block[] = [];

    // Simple approach: split by lines and find day patterns
    const lines = scope.split('\n');
    let currentDay: string | null = null;
    let currentLang: 'fi' | 'en' | null = null; 
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if this line contains a day name with date pattern
      const dayWithDateMatch = trimmedLine.match(new RegExp(`^\\s*(${dayNames.join('|')})\\s+\\d{1,2}\\.\\d{1,2}\\.`, 'i'));
      
      if (dayWithDateMatch) {
        // Save previous day's content if exists
        if (currentDay && currentContent.length > 0) {
          const cleanedContent = cleanBody(currentContent.join('\n'));
          if (cleanedContent) {
            const isFi = (FI_DAYS as readonly string[]).includes(currentDay as any);
            const dayFi = (isFi ? currentDay : EN_TO_FI[currentDay as EnDay]) as FiDay;
            const lang: 'fi'|'en' = isFi ? 'fi' : 'en';
            blocks.push({ dayFi, lang, body: cleanedContent });
          }
        }
        
        // Start new day
        currentDay = dayWithDateMatch[1].trim();
        currentContent = [];
        currentLang = (FI_DAYS as readonly string[]).includes(currentDay as any) ? 'fi' : 'en';
      } else if (currentDay && trimmedLine.length > 0) {
        // Add content to current day
        currentContent.push(trimmedLine);
      }
    }

    // Don't forget the last day
    if (currentDay && currentContent.length > 0) {
      const cleanedContent = cleanBody(currentContent.join('\n'));
      if (cleanedContent) {
        const isFi = (FI_DAYS as readonly string[]).includes(currentDay as any);
        const dayFi = (isFi ? currentDay : EN_TO_FI[currentDay as EnDay]) as FiDay;
        const lang: 'fi'|'en' = isFi ? 'fi' : 'en';
        blocks.push({ dayFi, lang, body: cleanedContent });
      }
    }

    console.log(`🔧 POR found ${blocks.length} day blocks with line-by-line parsing`);

    if (!blocks.length) {
      console.log(`🔧 POR no blocks found with corrected regex`);
      return {
        restaurantId: 'por',
        restaurantName: 'Pitäjänmäen Osuusruokala (POR)',
        rawMenu: '',
        success: false,
        error: 'Menu content not found or too short',
      };
    }

    // 4) If opts provided → return ONLY requested day in requested language
    if (opts?.targetDayFi || opts?.language) {
      const wantDay = (opts.targetDayFi ?? '').toLowerCase();
      const wantLang = opts.language;

      let picked = blocks.filter(b => !wantDay || b.dayFi.toLowerCase() === wantDay);
      if (wantLang) picked = picked.filter(b => b.lang === wantLang);

      if (!picked.length) {
        return {
          restaurantId: 'por',
          restaurantName: 'Pitäjänmäen Osuusruokala (POR)',
          rawMenu: '',
          success: false,
          error: `No menu for ${opts.targetDayFi ?? 'selected day'} in ${wantLang?.toUpperCase() ?? 'requested language'}`,
        };
      }

      // de-dup by body, take first
      const seen = new Set<string>();
      const unique = picked.filter(b => (seen.has(b.body) ? false : (seen.add(b.body), true)));
      const b = unique[0];
      const displayDay = wantLang === 'en' ? FI_TO_EN[b.dayFi] : b.dayFi;

      let rawMenu = `--- ${displayDay} ---\n${b.body}\n`;
      rawMenu = this.cleanMenuText(rawMenu);
      const success = rawMenu.length > 20;

      return {
        restaurantId: 'por',
        restaurantName: 'Pitäjänmäen Osuusruokala (POR)',
        rawMenu: success ? rawMenu : '',
        success,
        error: success ? undefined : 'Selected day had no items after cleaning',
      };
    }

    // 5) Legacy weekly (if no opts)
    let rawMenu = blocks
      .map(b => `--- ${(b.lang === 'en' ? FI_TO_EN[b.dayFi] : b.dayFi)} ---\n${b.body}\n`)
      .join('\n');

    rawMenu = this.cleanMenuText(this.decodeEntities(rawMenu));
    const success =
      rawMenu.length > 60 &&
      /(maanantai|tiistai|keskiviikko|torstai|perjantai|monday|tuesday|wednesday|thursday|friday)/i.test(rawMenu);

    console.log(`🔧 POR (${source}) built length: ${rawMenu.length}, success=${success}`);
    return {
      restaurantId: 'por',
      restaurantName: 'Pitäjänmäen Osuusruokala (POR)',
      rawMenu: success ? rawMenu : 'Could not extract menu from POR menu page',
      success,
      error: success ? undefined : 'Menu content not found or too short',
    };
  }

  // Enhanced Tellus scraper - day-aware (RSS)
  static async scrapeTellus(
    language: 'en' | 'fi',
    opts?: { targetDayFi?: string }
  ): Promise<ScrapedMenu> {
    const targetFi = (opts?.targetDayFi && DAY_FI_TO_EN[opts.targetDayFi])
      ? opts.targetDayFi
      : 'Tiistai'; // default: keep old behavior

    const targetEn = DAY_FI_TO_EN[targetFi];
    const fiShort = DAY_FI_SHORT[targetFi];
    const enShort = DAY_EN_SHORT[targetEn];

    console.log(`🍽️ Scraping Tellus (${language}) for day: ${language === 'fi' ? targetFi : targetEn}...`);

    try {
      const url = `https://www.compass-group.fi/menuapi/feed/rss/current-week?costNumber=3105&language=${language}`;
      const xml = await this.fetchWithRetry(url);

      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      let rawMenu = '';

      for (const m of xml.matchAll(itemRegex)) {
        const item = m[1];

        // Match title using feed language
        const isTargetDay = (
          language === 'fi'
            ? new RegExp(`<title>\\s*(${targetFi}|${fiShort})\\b`, 'i')
            : new RegExp(`<title>\\s*(${targetEn}|${enShort})\\b`, 'i')
        ).test(item);

        if (!isTargetDay) continue;

        const descMatch =
          item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) ||
          item.match(/<description>([\s\S]*?)<\/description>/i);

        if (descMatch && descMatch[1]) {
          rawMenu = descMatch[1]
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/(p|li)>/gi, '\n')
            .replace(/<[^>]*>/g, ' ')
            .replace(/&[a-z0-9#]+;/gi, ' ')
            .replace(/\r/g, '')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
          break;
        }
      }

      if (rawMenu.length > 0) {
        rawMenu = this.decodeEntities(rawMenu)
          .replace(/&lt;br&gt;/gi, '')
          .replace(/\(\s*\)/g, '')
          .replace(/\s{2,}/g, ' ')
          .replace(/\n\s*\n/g, '\n')
          .split('\n')
          .map(s => s.trim())
          .filter(Boolean)
          .join('\n')
          .trim();

        return {
          restaurantId: 'tellus',
          restaurantName: 'Tellus',
          rawMenu,
          success: true,
        };
      }
      return {
        restaurantId: 'tellus',
        restaurantName: 'Tellus',
        rawMenu: '',
        success: false,
        error: `${language === 'fi' ? targetFi : targetEn} menu not found in RSS feed`,
      };
    } catch (error) {
      console.log(`❌ Tellus scraping failed:`, error);
      return {
        restaurantId: 'tellus',
        restaurantName: 'Tellus',
        rawMenu: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /** Parse POR markup (from WP REST or raw HTML)
   *  If opts provided → return ONLY that day & language.
   */
  static async scrapePor(
    opts?: { targetDayFi?: 'Maanantai'|'Tiistai'|'Keskiviikko'|'Torstai'|'Perjantai'; language?: 'fi'|'en' }
  ): Promise<ScrapedMenu> {
    console.log(`🍽️ Scraping POR (Pitäjänmäen Osuusruokala)…`);
    try {
      // A) WordPress REST
      try {
        const wp = await this.fetchJsonWithRetry<any[]>(
          'https://por.fi/wp-json/wp/v2/pages?slug=menu&_fields=title.rendered,content.rendered'
        );
        if (Array.isArray(wp) && wp.length > 0 && wp[0]?.content?.rendered) {
          const html = String(wp[0].content.rendered);
          const raw = this.parsePorHtmlToMenu(html, 'WP-REST', opts);
          if (raw.success && raw.rawMenu) return raw;
        } else {
          console.log('ℹ️ WP REST returned no "menu" page or no content.');
        }
      } catch (e) {
        console.log('ℹ️ WP REST fetch failed, falling back to HTML:', e);
      }

      // B) HTML fallback
      const url = 'https://por.fi/menu/';
      const html = await this.fetchWithRetry(url);
      const result = this.parsePorHtmlToMenu(html, 'HTML', opts);
      if (result.success && result.rawMenu) return result;

      return {
        restaurantId: 'por',
        restaurantName: 'Pitäjänmäen Osuusruokala (POR)',
        rawMenu: 'Could not extract menu from POR menu page',
        success: false,
        error: 'Menu content not found or too short'
      };
    } catch (error) {
      console.log(`❌ POR scraping failed:`, error);
      return {
        restaurantId: 'por',
        restaurantName: 'Pitäjänmäen Osuusruokala (POR)',
        rawMenu: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async scrapeValimoPark(opts?: { targetDayFi?: string }): Promise<ScrapedMenu> {
    const restaurantId = 'valimo-park';
    const restaurantName = 'Valimo Park';
    console.log(`🍽️ Scraping Valimo Park (ISS + Flockler)…`);

    try {
      const apiUrl = 'https://api.flockler.com/v1/sites/8357/articles?count=12&sideloading=false';
      const json = await this.fetchJsonWithRetry<any>(apiUrl);

      const articles = Array.isArray(json?.articles) ? json.articles : [];
      if (!articles.length) throw new Error('No Flockler articles returned');

      const days = [...DAY_FI, ...DAY_EN];
      const weekdayRe = new RegExp(`\\b(${days.join('|')})\\b`, 'i');

      // Filter articles to only those from Valimo Park (Faundori section)
      const valimoParkArticles = articles.filter((a: any) => 
        a?.section?.section_url === 'valimo-park' || a?.section?.name === 'Faundori'
      );

      console.log(`🔍 Found ${valimoParkArticles.length} Valimo Park articles out of ${articles.length} total`);

      if (!valimoParkArticles.length) {
        throw new Error('No Valimo Park articles found in Flockler feed');
      }

      // Find the most relevant article with weekday content
      const article =
        valimoParkArticles.find((a: any) => weekdayRe.test(`${a?.title ?? ''} ${a?.body ?? ''}`)) ??
        valimoParkArticles[0];

      console.log(`🔍 Using article: "${article?.title}" from section: "${article?.section?.name}"`);

      let html = String(article?.body || article?.title || '');
      if (!html) throw new Error('Flockler article has no body/title');

      // Normalize to plain text while keeping line breaks
      let text = html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|li|h\d|div)>/gi, '\n')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\r/g, '')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n');

      text = this.decodeEntities(text).trim();
      console.log('🔎 Valimo Park cleaned head:', text.slice(0, 400));

      // Find markers for each weekday
      const marks: { name: string; pos: number }[] = [];
      let m: RegExpExecArray | null;
      const findRe = new RegExp(`\\b(${days.join('|')})\\b`, 'gi');
      while ((m = findRe.exec(text)) !== null) marks.push({ name: m[1], pos: m.index });
      marks.sort((a, b) => a.pos - b.pos);
      console.log('🧭 VP weekday markers:', marks.length);

      const headerStartRe = new RegExp(
        `^\\s*(${days.join('|')})\\b(?:\\s*\\d{1,2}[./-]\\d{1,2}\\.?)*\\s*:?\\s*`,
        'i'
      );
      const reBoiler = /(EU-asetus|regulation|Hinnat|Prices|We reserve rights)/i;

      // Build day chunks first
      const chunks: { dayFi: string; dayLabel: string; body: string }[] = [];
      for (let i = 0; i < marks.length; i++) {
        const start = marks[i].pos;
        const end = i < marks.length - 1 ? marks[i + 1].pos : text.length;
        const chunk = text.slice(start, end).trim();

        const header = chunk.match(headerStartRe);
        const dayLabel = header?.[1] ?? marks[i].name;
        const dayFiGuess = DAY_EN.includes(dayLabel as any)
          ? DAY_EN_TO_FI[dayLabel as (typeof DAY_EN)[number]]
          : (dayLabel as (typeof DAY_FI)[number]);

        let bodyChunk = header ? chunk.slice(header[0].length) : chunk;
        const body = bodyChunk
          .split('\n')
          .map(s => s.replace(/\s+/g, ' ').trim())
          .filter(s => s.length && !reBoiler.test(s))
          .join('\n');

        if (body.length) {
          chunks.push({ dayFi: dayFiGuess, dayLabel, body });
        }
      }

      // If a target day is requested, keep ONLY that day
      const targetFi = opts?.targetDayFi;
      let rawMenu = '';
      if (targetFi) {
        const one = chunks.find(c => c.dayFi.toLowerCase() === targetFi.toLowerCase());
        if (!one) {
          return {
            restaurantId,
            restaurantName,
            rawMenu: '',
            success: false,
            error: `Target day ${targetFi} not found in Flockler content`,
          };
        }
        rawMenu = `--- ${one.dayFi} ---\n${one.body}\n`;
      } else {
        // Otherwise keep all days (legacy behaviour)
        rawMenu = chunks
          .map(c => `--- ${c.dayLabel} ---\n${c.body}\n`)
          .join('\n');
      }

      rawMenu = this.cleanMenuText(rawMenu);
      const success = rawMenu.length > 40;

      console.log(
        `📊 Valimo Park scraping result: ${success ? 'SUCCESS' : 'FAILED'} (len=${rawMenu.length})`
      );
      return {
        restaurantId,
        restaurantName,
        rawMenu: success ? rawMenu : 'Could not extract menu from Valimo Park (Flockler)',
        success,
        error: success ? undefined : 'Menu content not found or too short',
      };
    } catch (error: any) {
      console.log(`❌ Valimo Park scraping failed:`, error);
      return {
        restaurantId: 'valimo-park',
        restaurantName: 'Valimo Park',
        rawMenu: '',
        success: false,
        error: error?.message || 'Unknown error',
      };
    }
  }

  static async scrapeValaja(opts?: { targetDayFi?: string; language?: 'fi' | 'en' }): Promise<ScrapedMenu> {
    console.log(`🍽️ Scraping Valaja (Sodexo JSON)…`);

    type Course = { title_fi?: string; title_en?: string; dietcodes?: string | null; properties?: string | null; price?: string | null };
    type MealDate = { date: string; courses: Record<string, Course> };
    type Weekly = { mealdates?: MealDate[] };

    const FI_DAYS = ['Maanantai','Tiistai','Keskiviikko','Torstai','Perjantai'] as const;

    // Try to normalize whatever Sodexo puts in `date` into a FI weekday label
    const asFiWeekday = (s: string): string | null => {
      const lc = (s || '').toLowerCase();
      for (const d of FI_DAYS) {
        if (lc.includes(d.toLowerCase())) return d;
      }
      // If it's already exactly a FI day name, return it
      if (FI_DAYS.some(d => d.toLowerCase() === lc)) return s as typeof FI_DAYS[number];
      return null;
    };

    const unifyCodes = (a?: string | null, b?: string | null): string => {
      const joined = [a, b]
        .map(x => (x || '').trim())
        .filter(Boolean)
        .join(', ')
        .replace(/\s+/g, ' ');
      return joined ? ` — ${joined}` : '';
    };

    const dayIndex = (d: string): number => {
      const i = FI_DAYS.findIndex(x => x.toLowerCase() === d.toLowerCase());
      return i === -1 ? 99 : i;
    };

    try {
      const url = 'https://www.sodexo.fi/ruokalistat/output/weekly_json/190';
      const data = await this.fetchJsonWithRetry<Weekly>(url);

      if (!data?.mealdates?.length) {
        return { restaurantId: 'valaja', restaurantName: 'Valaja', rawMenu: '', success: false, error: 'Invalid weekly_json payload (no mealdates)' };
      }

      const lang = opts?.language ?? 'fi';
      const targetFi = opts?.targetDayFi?.toLowerCase() ?? null;

      // Normalize `date` and optionally filter to the requested weekday
      let days = data.mealdates
        .map(md => ({ ...md, _fiDay: asFiWeekday(md.date) ?? md.date })) // fall back to raw if not matched
        .filter(md => !targetFi || md._fiDay.toLowerCase() === targetFi);

      if (!days.length) {
        return { restaurantId: 'valaja', restaurantName: 'Valaja', rawMenu: '', success: false, error: `No ${opts?.targetDayFi ?? 'target'} day found` };
      }

      // Sort by weekday order if possible
      days.sort((a, b) => dayIndex(a._fiDay) - dayIndex(b._fiDay));

      let rawMenu = '';
      for (const md of days) {
        const keys = Object.keys(md.courses || {}).sort((a, b) => Number(a) - Number(b));
        if (!keys.length) continue;

        rawMenu += `--- ${md._fiDay} ---\n`;
        for (const k of keys) {
          const c = md.courses[k];
          const title =
            (lang === 'fi' ? (c.title_fi ?? c.title_en) : (c.title_en ?? c.title_fi))?.trim() || 'TBA';
          rawMenu += `${title}${unifyCodes(c.dietcodes, c.properties)}\n`;
        }
        rawMenu += `\n`;
      }

      rawMenu = this.cleanMenuText(rawMenu).trim();
      const success = rawMenu.length > 20;

      console.log('Valaja mealdates (payload):', data.mealdates.map(m => m.date));
      console.log(`📊 Valaja scraping result: ${success ? 'SUCCESS' : 'FAILED'}`);

      return {
        restaurantId: 'valaja',
        restaurantName: 'Valaja',
        rawMenu: success ? rawMenu : 'Could not extract menu from Sodexo weekly JSON',
        success,
        error: success ? undefined : 'No courses found after parsing',
      };

    } catch (error) {
      console.log(`❌ Valaja scraping failed:`, error);
      return {
        restaurantId: 'valaja',
        restaurantName: 'Valaja',
        rawMenu: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // AI-powered Factory scraper
  static async scrapeFactoryAI(options: AiScrapingOptions): Promise<ScrapedMenu> {
    const { targetDay, language } = options;
    console.log(`🤖 AI-powered scraping for Factory Pitäjänmäki - Day: ${targetDay}, Language: ${language}`)
    
    try {
      let html = await this.fetchWithRetry('https://ravintolafactory.com/lounasravintolat/ravintolat/helsinki-pitajanmaki/')
      
      // Clean HTML but preserve menu content structure
      html = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      
      // Use broader content extraction for Factory
      let contentToProcess = html;
      
      // Try to find menu content area
      const menuSection = html.match(/<div[^>]*class=["'][^"']*\bounaslista\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      if (menuSection?.[1] && menuSection[1].length > 3000) {
        contentToProcess = menuSection[1];
      }
      
      // Limit to reasonable size for AI processing
      contentToProcess = contentToProcess.substring(0, 20000);
      
      console.log(`📤 Sending ${contentToProcess.length} characters to AI for ${targetDay} menu extraction...`)
      
      // Use AI to extract specific day's menu
      const aiResult = await aiMenuExtractor({
        html: contentToProcess,
        restaurantName: 'Factory Pitäjänmäki',
        targetDay: targetDay,
        language: language
      })
      
      if (!aiResult.output?.success || !aiResult.output.targetDayMenu?.length) {
        return {
          restaurantId: 'factory',
          restaurantName: 'Factory Pitäjänmäki',
          rawMenu: '',
          success: false,
          error: aiResult.output?.error || `AI found no menu items for ${targetDay}`
        }
      }
      
      const cleanedList = aiResult.output.targetDayMenu
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .filter(s => !/(prices|hinnat|opening hours|aukiolo|ilmainen pysäköinti)/i.test(s));
      
      if (cleanedList.length < 3) {
        return { 
          restaurantId: 'factory', 
          restaurantName: 'Factory Pitäjänmäki', 
          rawMenu: '', 
          success: false, 
          error: 'Too few items after validation' 
        }
      }
      
      let rawMenu = `--- ${targetDay} ---\n` + cleanedList.join('\n') + '\n';
      
      rawMenu = this.cleanMenuText(rawMenu);
      const success = rawMenu.length > 50 && cleanedList.length >= 3;

      console.log(`✅ AI extraction result: ${success ? 'SUCCESS' : 'FAILED'} - Found ${cleanedList.length} items for ${targetDay}`);

      return {
        restaurantId: 'factory',
        restaurantName: 'Factory Pitäjänmäki',
        rawMenu: success ? rawMenu : `AI could not find ${targetDay} menu at Factory Pitäjänmäki`,
        success,
        error: success ? undefined : `No ${targetDay} menu items found`
      }
      
    } catch (error) {
      console.log(`❌ AI-powered Factory scraping failed:`, error)
      return {
        restaurantId: 'factory',
        restaurantName: 'Factory Pitäjänmäki',
        rawMenu: '',
        success: false,
        error: error instanceof Error ? error.message : 'AI extraction failed'
      }
    }
  }

  // Convenience method for backwards compatibility
  static async scrapeFactory(): Promise<ScrapedMenu> {
    return this.scrapeFactoryAI({
      targetDay: 'Tiistai', // Tuesday - can be made configurable
      language: 'fi'
    });
  }

  // AI-powered Ravintola Valimo scraper
  static async scrapeRavintolaValimoAI(options: AiScrapingOptions): Promise<ScrapedMenu> {
    const { targetDay, language } = options;
    console.log(`🤖 AI-powered scraping for Ravintola Valimo - Day: ${targetDay}, Language: ${language}`)
    
    try {
      let html = await this.fetchWithRetry('https://www.ravintolavalimo.fi/')
      
      // Clean HTML but preserve menu content structure
      html = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')

      // Try to find the main menu section, but use more content if section is small
      const menuSection = html.match(/<div[^>]*id="Lounas"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i);
      let contentToProcess = menuSection?.[1] || '';

      // If the extracted section is too small, use broader body content
      if (contentToProcess.length < 5000) {
        console.log(`Menu section too small (${contentToProcess.length} chars), using broader extraction...`);
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        contentToProcess = bodyMatch?.[1] || html;
      }

      // Limit to reasonable size for AI processing
      contentToProcess = contentToProcess.substring(0, 20000);

      console.log(`📤 Sending ${contentToProcess.length} characters to AI for ${targetDay} menu extraction...`);

      // Use AI to extract specific day's menu
      const aiResult = await aiMenuExtractor({
        html: contentToProcess,
        restaurantName: 'Ravintola Valimo',
        targetDay: targetDay,
        language: language
      });

      if (!aiResult.output?.success || !aiResult.output.targetDayMenu?.length) {
        return {
          restaurantId: 'ravintola-valimo',
          restaurantName: 'Ravintola Valimo',
          rawMenu: '',
          success: false,
          error: aiResult.output?.error || `AI found no menu items for ${targetDay}`
        }
      }

      // Same post-processing/validation as Factory
      const cleanedList = aiResult.output.targetDayMenu
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .filter(s => !/(prices|hinnat|price|opening hours|aukiolo|ilmainen pysäköinti|pysäköinti|parking)/i.test(s));

      if (cleanedList.length < 3) {
        return {
          restaurantId: 'ravintola-valimo',
          restaurantName: 'Ravintola Valimo',
          rawMenu: '',
          success: false,
          error: 'Too few items after validation'
        }
      }

      // Format the extracted data
      let rawMenu = `--- ${targetDay} ---\n` + cleanedList.join('\n') + '\n';

      rawMenu = this.cleanMenuText(rawMenu);
      const success = rawMenu.length > 50 && cleanedList.length >= 3;

      console.log(`✅ AI extraction result: ${success ? 'SUCCESS' : 'FAILED'} - Found ${cleanedList.length} items for ${targetDay}`);

      return {
        restaurantId: 'ravintola-valimo',
        restaurantName: 'Ravintola Valimo',
        rawMenu: success ? rawMenu : `AI could not find ${targetDay} menu at Ravintola Valimo`,
        success,
        error: success ? undefined : `No ${targetDay} menu items found`
      }

    } catch (error) {
      console.log(`❌ AI-powered Ravintola Valimo scraping failed:`, error)
      return {
        restaurantId: 'ravintola-valimo',
        restaurantName: 'Ravintola Valimo',
        rawMenu: '',
        success: false,
        error: error instanceof Error ? error.message : 'AI extraction failed'
      }
    }
  }

  // Convenience method for backwards compatibility
  static async scrapeRavintolaValimo(): Promise<ScrapedMenu> {
    return this.scrapeRavintolaValimoAI({
      targetDay: 'Tiistai', // Tuesday - can be made configurable
      language: 'fi'
    });
  }
}