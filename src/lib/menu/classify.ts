import type { DishType } from './types';

const FI_MEAT = /\b(nauta|naudan|sika|porsas|possu|kassler|kana|broileri|kebab|makkara|liha|jauheliha)\b/i;
const FI_FISH = /\b(lohi|kirjolohi|muikku|silakka|tonnikala|katkarapu|seiti|hauki|ahven|siika|savulohi)\b/i;
const FI_VEGAN = /\b(vegaani(?:nen)?|veg\.?)\b/i;
const FI_VEGETARIAN = /\b(kasvis|vegetaar|vegetar)\b/i;

const EN_MEAT = /\b(beef|pork|chicken|sausage|kebab|meatball|ham|bacon)\b/i;
const EN_FISH = /\b(salmon|trout|whitefish|tuna|shrimp|prawn|mackerel|herring|fish)\b/i;
const EN_VEGAN = /\b(vegan)\b/i;
const EN_VEGETARIAN = /\b(vegetarian|veggie)\b/i;

// Extra plant proteins often imply vegan/veg even without label:
const PLANT_PROTEIN = /\b(tofu|seitan|nyhtökaura|härkis|soija)\b/i;

export function classifyType(name: string): DishType {
  const s = name.toLowerCase();
  if (FI_VEGAN.test(s) || EN_VEGAN.test(s) || PLANT_PROTEIN.test(s)) return 'vegan';
  if (FI_VEGETARIAN.test(s) || EN_VEGETARIAN.test(s)) return 'vegetarian';
  if (FI_FISH.test(s) || EN_FISH.test(s)) return 'fish';
  if (FI_MEAT.test(s) || EN_MEAT.test(s)) return 'meat';
  return 'unknown';
}

export function extractDietCodes(line: string): string[] {
  // Collect tokens like (L,G), [VL], etc. but don't reinterpret them
  const allMatches = [...line.matchAll(/[\[(（]([A-ZÄÖÅ ,\-\/+]+)[\])）]/gi)];
  const tokens = new Set<string>();
  for (const m of allMatches) {
    const inner = (m[1] ?? '')
      .split(/[,\s/+]+/)
      .map(t => t.trim().toUpperCase())
      .filter(Boolean);
    inner.forEach(t => tokens.add(t));
  }
  return Array.from(tokens);
}
