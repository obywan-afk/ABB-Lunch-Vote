export interface Restaurant {
  id: string;
  name: string;
  url: string;
  rawMenu: string;
  parsedMenu?: string;
  votes: number;
}
