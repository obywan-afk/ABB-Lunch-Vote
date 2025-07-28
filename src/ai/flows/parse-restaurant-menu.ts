// This file is machine-generated - edit at your own risk.

'use server';

/**
 * @fileOverview Parses and formats restaurant menus using GenAI to ensure consistent presentation.
 *
 * - parseRestaurantMenu - A function that handles the menu parsing process.
 * - ParseRestaurantMenuInput - The input type for the parseRestaurantMenu function.
 * - ParseRestaurantMenuOutput - The return type for the parseRestaurantMenu function.
 */

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
  prompt: `You are an AI expert at parsing restaurant menus.

  Your task is to take the raw menu text from a restaurant and format it into a clean, easy-to-read format.
  The restaurant name is: {{{restaurantName}}}.
  
  The menu text might be plain text or a JSON string. Your output should be a single string with each menu item on a new line. Do not include markdown formatting.
  
  Here is the raw menu text:
  {{{menuText}}}

  Please extract the menu items and present them in a consistent format.
`,
});

const parseRestaurantMenuFlow = ai.defineFlow(
  {
    name: 'parseRestaurantMenuFlow',
    inputSchema: ParseRestaurantMenuInputSchema,
    outputSchema: ParseRestaurantMenuOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
