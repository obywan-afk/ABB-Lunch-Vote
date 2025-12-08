export interface Restaurant {
  id: string;
  name: string;
  url: string;
  rawMenu: string; // English
  rawMenuFi: string; // Finnish
  parsedMenu?: string; // English
  parsedMenuFi?: string; // Finnish
  votes: number;
    rawSnippet?: string;
  status?: RestaurantStatus;
  fromCache?: boolean;
  fetchedForDate?: string;
  statusNote?: string;
}

export type ParseStatus = 'ok' | 'rate_limited' | 'failed' | 'skipped';

export interface RestaurantStatus {
  scraped: boolean;
  parse: ParseStatus;
  note: string;
}
