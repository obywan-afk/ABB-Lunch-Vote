export type DishType = 'vegan' | 'vegetarian' | 'fish' | 'meat' | 'unknown';

export interface NormalizedItem {
  name: string;              // cleaned dish line
  dietCodes: string[];       // ['L','G','VEG',...]
  type: DishType;
  price?: string;
  notes?: string[];
}

export interface NormalizedMenu {
  restaurantId: string;
  restaurantName: string;
  dayKey: string;            // 'YYYY-MM-DD' (Europe/Helsinki)
  language: 'fi' | 'en';
  items: NormalizedItem[];
  source: 'api' | 'html' | 'rss' | 'ai-html';
}
