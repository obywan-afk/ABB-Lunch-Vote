// ai/flows/ai-restaurant-scraper.ts
'use server';

import { ai } from '@/ai/genkit'
import { z } from 'genkit'

const MenuExtractionSchema = z.object({
  success: z.boolean(),
  targetDayMenu: z.array(z.string()).optional(),
  error: z.string().optional()
})

export const aiMenuExtractor = ai.definePrompt({
  name: 'extractSpecificDayMenu',
  input: { 
    schema: z.object({ 
      html: z.string(), 
      restaurantName: z.string(),
      targetDay: z.string(),
      language: z.string()
    }) 
  },
  output: { schema: MenuExtractionSchema },
  prompt: `You are an expert at extracting restaurant lunch menu information from HTML content.

Restaurant: {{{restaurantName}}}
Target Day: {{{targetDay}}} (consider both Finnish & English headings, e.g., "Tiistai"/"Tuesday")
Menu Language: {{{language}}}

Extract ONLY the lunch/buffet menu items for {{{targetDay}}} from this HTML content.

INSTRUCTIONS:
1. Look for "{{{targetDay}}}" followed by a date (like "Tiistai 19.08.2025")
2. Extract ALL food items that appear AFTER that day heading until you reach the next day
3. Include dietary codes in parentheses (L, VL, M, G, VEG/VE, etc.) **verbatim** if present
4. Extract complete dish descriptions including sides and sauces
5. Return items as a simple array of strings

IGNORE completely:
- Parking information ("Ilmainen pysäköinti")  
- Prices ("12€/13,50€", "Salaattibaari lounas")
- Opening hours and contact details
- Navigation elements
- Other days' menus (only extract for the target day)

EXTRACT everything food-related for the target day:
- Soups (keitto)
- Main dishes (meat, fish, pasta, etc.) with their sides
- Vegetarian/vegan options  
- Desserts and sweets
- Items with dietary codes like (L,G), (M,VS), (VE), etc.

For Tuesday menu example, extract items like:
- "Tomaatti-vuohenjuustokeitto (L,G) krutongit (M,G)"
- "Nepalilainen tandoori chicken tikkamasala (L,G,VS) Basmatiriisi (M,G,VE)"
- "Valimon jäätelöbuffetti (L,G)"

Return:
- success: true if target day menu found
- targetDayMenu: array of food items for the requested day only
- error: description if extraction failed

HTML Content:
{{{html}}}`
})



export interface AiScrapingOptions {
  targetDay: string;
  language: 'fi' | 'en';
}

export type AiMenuExtractionResult = z.infer<typeof MenuExtractionSchema>