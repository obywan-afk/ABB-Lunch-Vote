import { classifyType, extractDietCodes } from './classify';
import type { NormalizedItem, NormalizedMenu } from './types';
import { todayKeyEuropeHelsinki } from './day';

export function linesToNormalizedMenu(params: {
  restaurantId: string;
  restaurantName: string;
  language: 'fi'|'en';
  source: 'api'|'html'|'rss'|'ai-html';
  rawBlock: string; // newline-separated items (already cleaned)
  dayKey?: string;  // optional override
}): NormalizedMenu {
  const { restaurantId, restaurantName, language, source, rawBlock } = params;
  const dayKey = params.dayKey || todayKeyEuropeHelsinki();

  const items: NormalizedItem[] = rawBlock
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .map(line => {
      const dietCodes = extractDietCodes(line);
      const name = line.replace(/\s*[\[(（][A-ZÄÖÅ ,\-\/+]+[\])）]\s*$/i, '').trim();
      const type = classifyType(line);
      return { name, dietCodes, type };
    });

  return { restaurantId, restaurantName, dayKey, language, items, source };
}
