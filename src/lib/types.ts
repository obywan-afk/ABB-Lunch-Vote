export interface Restaurant {
  id: string;
  name: string;
  url: string;
  rawMenu: string; // English
  rawMenuFi: string; // Finnish
  parsedMenu?: string; // English
  parsedMenuFi?: string; // Finnish
  votes: number;
}
