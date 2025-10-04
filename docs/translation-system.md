# Menu Translation System Documentation

## Overview
Implemented AI-powered translation system to provide English versions of Finnish-only restaurant menus.

## Problem Statement
Some restaurants only provide Finnish content on their websites:
- **Faundori** - Finnish-only Flockler feed
- **Factory Pitäjänmäki** - Finnish-only website content
- **Ravintola Valimo** - Finnish-only website content

When users switched to English mode, these restaurants displayed Finnish text, creating an inconsistent experience.

## Solution Architecture

### 1. AI Translation Flow (`src/ai/flows/translate-menu.ts`)
- Uses Google Gemini 2.0 Flash model via Genkit
- Translates Finnish menu text to English while preserving:
  - Dietary codes (L, G, M, VL, VS, VEG, etc.)
  - Day headers (Maanantai → Monday, etc.)
  - Formatting and structure
  - Prices

### 2. Language Detection (`src/lib/enhancedMenuProcessor.ts`)
- `detectFinnish()` function checks for common Finnish food terms
- Requires 3+ Finnish indicators to trigger translation
- Indicators include: keitto, kastike, peruna, broileri, etc.

### 3. Enhanced Menu Processor Updates
For each Finnish-only restaurant (Faundori, Factory, Ravintola Valimo):
1. Scrape content in Finnish
2. Detect if content is in Finnish
3. If requesting English and content is Finnish:
   - Trigger AI translation
   - Cache both Finnish original and English translation
4. If translation fails, fall back to Finnish content

### 4. Database Caching Strategy
- Separate cache entries for `fi` and `en` versions
- Schema already supports language field: `@@unique([restaurantId, date, language])`
- Translation happens once per day per restaurant
- Cached translations persist until date changes

## Implementation Details

### Restaurants with Native English Support
- **Tellus** - RSS feed supports both languages
- **POR (Pitäjänmäen Osuusruokala)** - Bilingual website
- **Valaja** - Sodexo JSON API supports both languages

These restaurants continue to use their native English versions without translation.

### Translation Flow Example
```
1. User requests English menu for Factory
2. System checks cache for English version
3. Cache miss - scrapes Finnish content
4. detectFinnish() returns true
5. Calls translateMenuToEnglish() AI flow
6. Caches both Finnish and English versions
7. Returns English translation to user
8. Next request loads from cache (no AI call)
```

## Benefits

1. **Consistent User Experience** - All restaurants now have proper English menus
2. **Cost Efficient** - Translation only happens once per day per restaurant
3. **Performance** - Subsequent requests use cached translations
4. **Fallback Safety** - If translation fails, Finnish content is still displayed
5. **Dual Cache** - Both language versions cached for flexibility

## Testing

### Test Script (`scripts/test-translation.ts`)
Verifies:
- Finnish menu scraping
- English translation triggering
- Translation quality (no Finnish words, has English days)
- Cache functionality

### Test Results
All restaurants tested successfully:
- ✅ Faundori - Translation working, cache working
- ✅ Factory Pitäjänmäki - Translation working, cache working
- ✅ Ravintola Valimo - Translation working, cache working

## API Usage
Translation uses Gemini 2.0 Flash, which is:
- Cost-effective for short text translation
- Fast response times (~2-3 seconds per menu)
- Only called once per restaurant per day
- Typical usage: 3 restaurants × 5 weekdays = 15 translations per week

## Monitoring
Check logs for:
- `🌐 Translating [Restaurant] menu from Finnish to English...`
- `Cached processed menu in database: [Restaurant] (en)`
- Translation failures show as: `⚠️ Translation failed, returning Finnish content`

## Future Improvements
1. Consider caching translations across weeks if menus are similar
2. Add translation quality metrics
3. Pre-translate menus overnight to reduce user wait times
4. Support additional languages (Swedish, etc.)
