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

const MENU_NOISE_RE =
  /(lunch buffet|catering services|green deli|greendeli|company - and private events|get connected|about us|our location|message \*|email \*|name \*|live grill|welcome to restaurant valimo|welcome to enjoy our mouth-watering dishes|pre-order 2 days)/i;

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
  // Basic HTML-to-text day slicer to avoid AI flakiness.
  private static extractDaySectionFromHtml(html: string, targetFi: (typeof DAY_FI)[number]): string | null {
    const markers = DAY_FI.join('|');
    const normalized = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
      .replace(/<h[1-6][^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\r/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim();

    const headerRe = new RegExp(`\\b(${markers})\\b[^\\n]*`, 'ig');
    const headers: Array<{ day: (typeof DAY_FI)[number]; idx: number }> = [];
    let m: RegExpExecArray | null;
    while ((m = headerRe.exec(normalized)) !== null) {
      headers.push({ day: m[1] as (typeof DAY_FI)[number], idx: m.index });
    }
    if (!headers.length) return null;

    const targetIdx = headers.findIndex(h => h.day.toLowerCase() === targetFi.toLowerCase());
    if (targetIdx === -1) return null;

    const start = normalized.indexOf('\n', headers[targetIdx].idx);
    const end = headers[targetIdx + 1]?.idx ?? normalized.length;
    const slice = normalized.slice(start === -1 ? headers[targetIdx].idx : start, end).trim();

    // Weed out obvious false positives (like opening hours)
    const lines = slice.split('\n').map(s => s.trim()).filter(Boolean);
    if (lines.length < 2) return null;

    const body = lines.join('\n');
    if (body.length < 40) return null;

    return `--- ${targetFi} ---\n${body}`;
  }

  private static extractIssWeeklyMenuFromHtml(html: string, opts?: { targetDayFi?: (typeof DAY_FI)[number] }): string {
    const normalized = this.decodeEntities(
      html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|section|article|main|h1|h2|h3|h4|h5|h6)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\r/g, '')
    )
      .replace(/[ \t]+/g, ' ')
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim();

    const dayHeaderRe = /^(Ma|Ti|Ke|To|Pe)\s+\d{1,2}\.\d{1,2}\.\d{4}$/i;
    const fiByShort: Record<string, (typeof DAY_FI)[number]> = {
      Ma: 'Maanantai',
      Ti: 'Tiistai',
      Ke: 'Keskiviikko',
      To: 'Torstai',
      Pe: 'Perjantai',
    };

    const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
    const sections: Array<{ dayFi: (typeof DAY_FI)[number]; lines: string[] }> = [];
    let current: { dayFi: (typeof DAY_FI)[number]; lines: string[] } | null = null;

    for (const line of lines) {
      const header = line.match(dayHeaderRe);
      if (header) {
        if (current?.lines.length) sections.push(current);
        current = { dayFi: fiByShort[header[1]], lines: [] };
        continue;
      }

      if (!current) continue;
      if (/^(Viikko\s+\d+|Valitse tulostusnäkymä|Tulosta ruokalista|Avoinna\b|Puurobaari\b|Lounas ma-pe\b|Hävikkiruoan myynti\b|Grab & Go\b|Keittiöpäällikkö\b|Sulje\b)/i.test(line)) break;
      if (/^(13[,.\d ]*€(?:\s*\/\s*[\d,.]+\s*€\/kg)?|L = |Dieettimerkinnät voivat)/i.test(line)) continue;
      if (/^Image:/i.test(line)) continue;
      current.lines.push(line);
    }

    if (current?.lines.length) sections.push(current);

    const cleanedSections = sections
      .map((section) => {
        const filtered = section.lines.filter((line, index, arr) => {
          if (/^(Lounas|Kasvislounas|Keitto|Salaatti(?:baari)?|Jälkiruoka|Burgeri|Grilli)$/i.test(line)) {
            const next = arr[index + 1] ?? '';
            return Boolean(next && !/^[\d,. ]+€/.test(next));
          }
          return !/^[\d,. ]+€(?:\s*\/\s*[\d,.]+\s*€\/kg)?$/.test(line);
        });

        return {
          dayFi: section.dayFi,
          body: this.cleanMenuText(filtered.join('\n')),
        };
      })
      .filter((section) => section.body.length > 20);

    if (opts?.targetDayFi) {
      const target = cleanedSections.find((section) => section.dayFi === opts.targetDayFi);
      return target ? `--- ${target.dayFi} ---\n${target.body}` : '';
    }

    return cleanedSections.map((section) => `--- ${section.dayFi} ---\n${section.body}`).join('\n\n');
  }

  private static extractRavintolaValimoMenuFromHtml(
    html: string,
    targetDayFi: (typeof DAY_FI)[number]
  ): string | null {
    const normalized = this.decodeEntities(
      html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|section|article|main|h1|h2|h3|h4|h5|h6)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\r/g, '')
    )
      .replace(/[ \t]+/g, ' ')
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim();

    const dayHeaderRe = /^(Maanantai|Tiistai|Keskiviikko|Torstai|Perjantai)(?:\s+\d{1,2}\.\d{1,2}\.\d{4})?$/i;
    const stopRe = /^(Contact Details|Aukioloajat|Copyright\b|Follow Us\b|Meiltä loistavan palvelun|Get Connected|About Us|Our Location|GreenDeli|Company - And Private Events|Lunch buffet\b|Catering Services\b)/i;
    const categoryRe = /^(Päivän erikoissalaatti|Päivän keitto|Lämpimät pääruoat|Vegaaninen|Päivän pizza|Blini-perjantai.*)$/i;

    const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
    const sections: Array<{ dayFi: (typeof DAY_FI)[number]; lines: string[] }> = [];
    let current: { dayFi: (typeof DAY_FI)[number]; lines: string[] } | null = null;

    for (const line of lines) {
      const dayHeader = line.match(dayHeaderRe);
      if (dayHeader) {
        if (current?.lines.length) sections.push(current);
        current = { dayFi: dayHeader[1] as (typeof DAY_FI)[number], lines: [] };
        continue;
      }

      if (!current) continue;
      if (stopRe.test(line)) break;
      if (/^(Buffet Menu|Viikon lounas|13,70€|HUM:)/i.test(line)) continue;
      current.lines.push(line);
    }

    if (current?.lines.length) sections.push(current);

    const target = sections.find((section) => section.dayFi === targetDayFi);
    if (!target) return null;

    const filtered = target.lines.filter((line) => {
      if (/^(Salaattibaari lounas|Salaattibaari|Päivän pizza:?)$/i.test(line)) return false;
      if (/^\d+[,.]\d+€(?:\/\d+[,.]\d+€)?$/i.test(line)) return false;
      if (/^(Image:|050-|asiakaspalvelu@)/i.test(line)) return false;
      return true;
    });

    const body = filtered
      .map((line) => categoryRe.test(line) ? `${line}:` : line)
      .join('\n');

    const cleaned = this.cleanMenuText(`--- ${targetDayFi} ---\n${body}`);
    if (cleaned.length <= 40) return null;
    if (MENU_NOISE_RE.test(cleaned)) return null;
    if (DAY_FI.filter((day) => day !== targetDayFi).some((day) => cleaned.includes(day))) return null;
    return cleaned;
  }
  
  private static async fetchWithRetry(url: string, retries = 3): Promise<string> {
    console.log(`🌐 Fetching: ${url}`)
    
    for (let i = 0; i < retries; i++) {
      try {
        const response = await this.fetchWithCertificateFallback(url, {
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
        const res = await this.fetchWithCertificateFallback(url, {
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

  private static async fetchWithCertificateFallback(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, init);
    } catch (error) {
      const code = (error as { cause?: { code?: string } })?.cause?.code;
      if (!/ISSUER_CERT|SELF_SIGNED_CERT|UNABLE_TO_VERIFY_LEAF_SIGNATURE/i.test(code ?? '')) {
        throw error;
      }

      console.log(`⚠️ Retrying ${url} with relaxed TLS verification due to local certificate trust issue (${code})`);
      const https = await import('node:https');
      const response = await new Promise<Response>((resolve, reject) => {
        const request = https.request(url, {
          method: init.method ?? 'GET',
          headers: init.headers as Record<string, string> | undefined,
          rejectUnauthorized: false,
        }, (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          res.on('end', () => {
            const encodingHeader = res.headers['content-encoding'];
            const encoding = Array.isArray(encodingHeader) ? encodingHeader[0] : encodingHeader;
            let body = Buffer.concat(chunks);

            if (encoding) {
              const zlib = require('node:zlib') as typeof import('node:zlib');
              if (/br/i.test(encoding)) body = zlib.brotliDecompressSync(body);
              else if (/gzip/i.test(encoding)) body = zlib.gunzipSync(body);
              else if (/deflate/i.test(encoding)) body = zlib.inflateSync(body);
            }

            resolve(new Response(body, {
              status: res.statusCode ?? 200,
              headers: new Headers(
                Object.entries(res.headers).flatMap(([key, value]) =>
                  Array.isArray(value)
                    ? value.map((entry) => [key, entry] as const)
                    : value
                      ? [[key, value] as const]
                      : []
                )
              ),
            }));
          });
        });

        request.on('error', reject);
        request.end();
      });

      return response;
    }
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

    console.log(`🔧 POR trying text-based pattern for processed content`);

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

    const dayHeaderRe = new RegExp(
      `^\\s*(${dayNames.join('|')})\\b(?:\\s+\\d{1,2}[./-]\\d{1,2}(?:[./-]\\d{2,4})?\\.?\\s*)?(?::)?\\s*$`,
      'i'
    );

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Accept both "Tiistai 17.2.", "Tiistai 17/2", "Tiistai:" and plain "Tiistai"
      const dayWithDateMatch = trimmedLine.match(dayHeaderRe);
      
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
    const restaurantName = 'Faundori';
    console.log(`🍽️ Scraping Faundori (ISS page)…`);

    try {
      const html = await this.fetchWithRetry('https://ravintolapalvelut.iss.fi/ravintola-faundori/');
      const targetDayFi = DAY_FI.find((day) => day.toLowerCase() === opts?.targetDayFi?.toLowerCase());
      const rawMenu = this.cleanMenuText(
        this.extractIssWeeklyMenuFromHtml(html, { targetDayFi })
      );
      const success = rawMenu.length > 40;

      console.log(
        `📊 Faundori scraping result: ${success ? 'SUCCESS' : 'FAILED'} (len=${rawMenu.length})`
      );
      return {
        restaurantId,
        restaurantName,
        rawMenu: success ? rawMenu : 'Could not extract menu from Faundori (ISS page)',
        success,
        error: success ? undefined : `Menu content not found${targetDayFi ? ` for ${targetDayFi}` : ''}`,
      };
    } catch (error: any) {
      console.log(`❌ Faundori scraping failed:`, error);
      return {
        restaurantId: 'valimo-park',
        restaurantName: 'Faundori',
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

  static async scrapeAntellKuohu(opts?: { targetDayFi?: string }): Promise<ScrapedMenu> {
    const restaurantId = 'antell-kuohu';
    const restaurantName = 'Antell Kuohu';
    console.log(`🍽️ Scraping Antell Kuohu (tabs in HTML)…`);

    const dayFi = (opts?.targetDayFi && DAY_FI.includes(opts.targetDayFi as any))
      ? (opts.targetDayFi as (typeof DAY_FI)[number])
      : 'Tiistai';
    const dayEn = DAY_FI_TO_EN[dayFi];

    try {
      const html = await this.fetchWithRetry('https://antell.fi/lounas/helsinki/kuohu/');

      const panelStartRe = new RegExp(`<section\\s+id=["']panel-${dayEn}["'][^>]*>`, 'i');
      const startMatch = panelStartRe.exec(html);
      if (!startMatch || startMatch.index === undefined) {
        return {
          restaurantId,
          restaurantName,
          rawMenu: '',
          success: false,
          error: `Could not find day panel for ${dayEn}`,
        };
      }

      const afterStart = html.slice(startMatch.index + startMatch[0].length);
      const nextPanelIdx = afterStart.search(/<section\s+id=["']panel-(Monday|Tuesday|Wednesday|Thursday|Friday)["']/i);
      const sectionHtml = (nextPanelIdx === -1 ? afterStart : afterStart.slice(0, nextPanelIdx));

      const cleanText = (input: string) =>
        this.decodeEntities(
          input
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        );

      const priceMatch = sectionHtml.match(/class=["']tabpanel__header__price["'][^>]*>([\s\S]*?)<\/div>/i);
      const price = priceMatch ? cleanText(priceMatch[1]) : '';

      const items: string[] = [];
      const itemRe = /class=["']accordion__button["'][^>]*>\s*([\s\S]*?)\s*<\/button>[\s\S]*?class=["']accordion__footer__special-diets["'][^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/gi;
      let m: RegExpExecArray | null;
      while ((m = itemRe.exec(sectionHtml)) !== null) {
        const dish = cleanText(m[1]);
        const diets = cleanText(m[2]).replace(/[|]+/g, ',');
        if (!dish) continue;
        if (/katso lisätiedot|miltä maistui\?/i.test(dish)) continue;
        items.push(diets ? `${dish} [${diets}]` : dish);
      }

      // De-duplicate while preserving order.
      const seen = new Set<string>();
      const uniqueItems = items.filter(item => (seen.has(item) ? false : (seen.add(item), true)));

      let rawMenu = `--- ${dayFi} ---\n`;
      if (price) rawMenu += `Lounasbuffet ${price}\n`;
      rawMenu += uniqueItems.join('\n');
      rawMenu = this.cleanMenuText(rawMenu);

      const success = uniqueItems.length >= 3 && rawMenu.length > 40;
      return {
        restaurantId,
        restaurantName,
        rawMenu: success ? rawMenu : '',
        success,
        error: success ? undefined : `Could not extract enough menu items for ${dayFi}`,
      };
    } catch (error) {
      console.log(`❌ Antell Kuohu scraping failed:`, error);
      return {
        restaurantId,
        restaurantName,
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

      // Try deterministic day slice first (fast path, avoids AI flakiness)
      const manualSlice = this.extractDaySectionFromHtml(contentToProcess, targetDay as (typeof DAY_FI)[number]);
      if (manualSlice) {
        const cleaned = this.cleanMenuText(manualSlice);
        const success = cleaned.length > 40;
        console.log(`✅ Manual extraction for Factory ${targetDay}: ${success ? 'SUCCESS' : 'FAILED'} (len=${cleaned.length})`);
        return {
          restaurantId: 'factory',
          restaurantName: 'Factory Pitäjänmäki',
          rawMenu: cleaned,
          success,
          error: success ? undefined : `Manual extraction too short for ${targetDay}`
        };
      }
      
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
    console.log(`🍽️ Scraping Ravintola Valimo - Day: ${targetDay}, Language: ${language}`)
    
    try {
      let html = await this.fetchWithRetry('https://www.ravintolavalimo.fi/')
      const extracted = this.extractRavintolaValimoMenuFromHtml(
        html,
        targetDay as (typeof DAY_FI)[number]
      );

      if (extracted) {
        const cleaned = this.cleanMenuText(extracted);
        const success = cleaned.length > 40;
        console.log(`✅ Deterministic extraction for Ravintola Valimo ${targetDay}: ${success ? 'SUCCESS' : 'FAILED'} (len=${cleaned.length})`);
        return {
          restaurantId: 'ravintola-valimo',
          restaurantName: 'Ravintola Valimo',
          rawMenu: cleaned,
          success,
          error: success ? undefined : `HTML extraction too short for ${targetDay}`
        };
      }

      const manualSlice = this.extractDaySectionFromHtml(html, targetDay as (typeof DAY_FI)[number]);
      if (manualSlice) {
        const cleaned = this.cleanMenuText(manualSlice);
        if (MENU_NOISE_RE.test(cleaned)) {
          return {
            restaurantId: 'ravintola-valimo',
            restaurantName: 'Ravintola Valimo',
            rawMenu: '',
            success: false,
            error: `Fallback extraction captured page content instead of ${targetDay} menu`
          };
        }
        return {
          restaurantId: 'ravintola-valimo',
          restaurantName: 'Ravintola Valimo',
          rawMenu: cleaned,
          success: cleaned.length > 40,
          error: cleaned.length > 40 ? undefined : `Fallback HTML extraction too short for ${targetDay}`
        };
      }

      return {
        restaurantId: 'ravintola-valimo',
        restaurantName: 'Ravintola Valimo',
        rawMenu: '',
        success: false,
        error: `No validated ${targetDay} menu found in Ravintola Valimo HTML`
      };

      // Keep the AI fallback for unexpected markup changes, but it should no longer be the common path.
      html = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');

      const aiResult = await aiMenuExtractor({
        html: html.substring(0, 20000),
        restaurantName: 'Ravintola Valimo',
        targetDay,
        language
      });

      if (!aiResult.output?.success || !aiResult.output.targetDayMenu?.length) {
        return {
          restaurantId: 'ravintola-valimo',
          restaurantName: 'Ravintola Valimo',
          rawMenu: '',
          success: false,
          error: aiResult.output?.error || `No ${targetDay} menu items found`
        }
      }

      const cleanedList = aiResult.output.targetDayMenu
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .filter(s => !/(prices|hinnat|price|opening hours|aukiolo|ilmainen pysäköinti|pysäköinti|parking)/i.test(s));

      const rawMenu = this.cleanMenuText(`--- ${targetDay} ---\n${cleanedList.join('\n')}`);
      return {
        restaurantId: 'ravintola-valimo',
        restaurantName: 'Ravintola Valimo',
        rawMenu,
        success: rawMenu.length > 40 && cleanedList.length >= 3,
        error: rawMenu.length > 40 && cleanedList.length >= 3 ? undefined : `No ${targetDay} menu items found`
      }

    } catch (error) {
      console.log(`❌ AI-powered Ravintola Valimo scraping failed:`, error)
      return {
        restaurantId: 'ravintola-valimo',
        restaurantName: 'Ravintola Valimo',
        rawMenu: '',
        success: false,
        error: error instanceof Error ? error.message : 'HTML extraction failed'
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
