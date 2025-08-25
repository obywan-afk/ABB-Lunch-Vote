// ai/flows/parse-restaurant-menu.ts - Your working version (enhanced for HTML)
'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ParseRestaurantMenuInputSchema = z.object({
  restaurantName: z.string().describe('The name of the restaurant.'),
  menuText: z.string().describe('The raw menu text to parse.'),
});
export type ParseRestaurantMenuInput = z.infer<typeof ParseRestaurantMenuInputSchema>;

const ParseRestaurantMenuOutputSchema = z.object({
  parsedMenu: z.string().describe('The parsed and formatted menu.'),
});
export type ParseRestaurantMenuOutput = z.infer<typeof ParseRestaurantMenuOutputSchema>;

export async function parseRestaurantMenu(input: ParseRestaurantMenuInput): Promise<ParseRestaurantMenuOutput> {
  return parseRestaurantMenuFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseRestaurantMenuPrompt',
  input: {schema: ParseRestaurantMenuInputSchema},
  output: {schema: ParseRestaurantMenuOutputSchema},
  prompt: `You are an AI expert at parsing restaurant menus from any format.

Your task is to extract and format menu items from the provided content for: {{{restaurantName}}}.

The content might be:
- Clean menu text, XML, or JSON
- HTML mixed with CSS/JavaScript  
- Finnish or English text
- Mixed formats


INSTRUCTIONS:
1) Ignore HTML/CSS/JS/boilerplate; extract only dish lines
2) If JSON, list the "name" field of each dish (include visible diet codes)
3) Output plain text, one item per line (no markdown)
4) Prefer the requested weekday if the content is grouped by weekdays
5) Preserve dietary codes verbatim (L, VL, M, G, VEG, VE, etc.)
6) Do NOT reinterpret L/M/G as meat/veg

For each menu item found:
- Determine if it's "Vegan", "Vegetarian", or contains "Meat"
- Use these mappings: VEG → Vegan, VS → Vegetarian, L/M → may contain meat
- Append label in parentheses: "Dish Name (Vegetarian)"

Raw content:
{{{menuText}}}

Extract the food items and format them consistently, ignoring all technical markup.`,
});

const parseRestaurantMenuFlow = ai.defineFlow(
  {
    name: 'parseRestaurantMenuFlow',
    inputSchema: ParseRestaurantMenuInputSchema,
    outputSchema: ParseRestaurantMenuOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      const parsed = output?.parsedMenu?.trim() || '';
      
      // Simple validation - just check it's not empty and not pure HTML
      if (parsed && parsed.length > 20 && !parsed.startsWith('<!DOCTYPE') && !parsed.startsWith('<html')) {
        return { parsedMenu: parsed };
      }
      
      // If AI extraction failed, return cleaned raw content as fallback
      const cleanedRaw = input.menuText
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')  
        .replace(/<[^>]*>/g, ' ')
        .replace(/&[a-zA-Z0-9#]+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
        
      return { parsedMenu: cleanedRaw.length > 50 ? cleanedRaw : input.menuText };
      
    } catch (error) {
      console.error(`Error parsing menu for ${input.restaurantName}:`, error);
      // Always return something - raw content as last resort
      return { parsedMenu: input.menuText };
    }
  }
);