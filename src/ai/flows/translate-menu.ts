// ai/flows/translate-menu.ts
'use server';

import { ai } from '@/ai/genkit'
import { z } from 'genkit'

const TranslationSchema = z.object({
  success: z.boolean(),
  translatedMenu: z.string().optional(),
  error: z.string().optional()
})

export const translateMenuToEnglish = ai.definePrompt({
  name: 'translateMenuToEnglish',
  input: { 
    schema: z.object({ 
      finnishMenu: z.string(),
      restaurantName: z.string()
    }) 
  },
  output: { schema: TranslationSchema },
  prompt: `You are an expert translator specializing in Finnish restaurant menus to English.

Restaurant: {{{restaurantName}}}

Translate this Finnish lunch menu to English while following these rules:

PRESERVATION RULES:
1. Keep ALL dietary codes EXACTLY as they are: (L), (G), (M), (VL), (VS), (VEG), (VE), etc.
2. Keep day headers with "---" markers: "--- Tiistai ---" becomes "--- Tuesday ---"
3. Preserve formatting: line breaks, bullet points, and structure
4. Keep prices if present (e.g., "7.65", "13.70")

TRANSLATION RULES:
1. Translate Finnish weekdays to English:
   - Maanantai → Monday
   - Tiistai → Tuesday
   - Keskiviikko → Wednesday
   - Torstai → Thursday
   - Perjantai → Friday

2. Translate dish names naturally but keep authenticity:
   - "Tomaattikeitto" → "Tomato soup"
   - "Broileri" → "Chicken"
   - "Naudan lehtipihvi" → "Beef tenderloin"
   - "Kasvispyöryköitä" → "Vegetable balls"

3. Translate common terms:
   - keitto → soup
   - kastike → sauce
   - peruna/perunamuusi → potato/mashed potatoes
   - riisi → rice
   - salaatti → salad
   - jälkiruoka → dessert

4. Keep the menu concise and appetizing - use natural English

EXAMPLE INPUT:
--- Tiistai ---
Tomaattikeitto (L,G)
Broilerin paistileike (L,G,VS) basmatiriisi (M,G)
Kasvispyöryköitä (VEG,G) tomaattikastike

EXAMPLE OUTPUT:
--- Tuesday ---
Tomato soup (L,G)
Roasted chicken breast (L,G,VS) basmati rice (M,G)
Vegetable balls (VEG,G) tomato sauce

Return:
- success: true if translation completed
- translatedMenu: the complete translated menu text
- error: description if translation failed

Finnish Menu to Translate:
{{{finnishMenu}}}`
})

export type TranslationResult = z.infer<typeof TranslationSchema>
