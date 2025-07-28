import type { Restaurant } from '@/lib/types';

// Raw menu text extracted from user prompt. Focused on Tuesday where available.
const tellusRawMenu = ``; // This will be fetched from the live API.

const porRawMenu = `[{"name": "Sweet potato soup", "tags": ["VE", "G"]}, {"name": "Chicken and vegetable stir-fry with rice noodles", "tags": ["M", "G"]}, {"name": "Mushroom and spinach lasagna", "tags": ["L"]}, {"name": "Side salad with vinaigrette", "tags": ["VE", "G"]}, {"name": "Blueberry pie with vanilla sauce", "tags": ["L", "G"]}]`;

const valimoParkRawMenu = `GRILLISTÄ LAUTASANNOKSINA 13,70 €: Savulohta, yrttiperunaa, kananmunakastiketta (L,G) TAI Punajuuripihvit tai fritattua tofua, yrttiperunaa ja kermaviilikastiketta (L,G, saatavilla VEG) TAI Metsästäjänleipä; naudan jauhelihapihvi, sienikastiketta, gratinoitua juustoa, ranskalaiset (L) sivusalaattia
Viikon salaattivaihtoehto:Kana-aurajuustosalaatti (L,G) 12,50 € TAI Uuniperuna katkaraputäytteellä ja raikasta salaattia (L,G) 12,50 €
Dessert: DIY Pehmis (L, saatavilla G)`;

const valajaRawMenu = `[{"name": "Pea and broad bean rissoles", "tags": ["M", "G", "VE"]}, {"name": "Ratatouille vegetables", "tags": ["M", "G", "VE"]}, {"name": "Aioli with basil", "tags": ["M", "G", "VE"]}, {"name": "Italian style meatball and pasta soup", "tags": ["M", "SE", "KA", "Pork"]}, {"name": "Kebab sauce", "tags": ["M", "G", "VS", "SO", "Spicy", "Beef"]}, {"name": "Garlic seasoned yoghurt", "tags": ["L", "G"]}, {"name": "Rice", "tags": ["M", "G"]}, {"name": "Banana and peppermint milkshake", "tags": ["L", "G"]}, {"name": "Sweet chili and smoked salmon salad", "tags": ["M", "G", "VS"]}]`;

const factoryRawMenu = `[{"name": "Japanese misosoup", "tags": ["M", "G", "VS", "VE", "Tofu"]}, {"name": "Factory's meatballs in smoked cheese sauce", "tags": ["L", "G"]}, {"name": "Tandoori-yogurt marinated chicken steaks", "tags": ["L", "G", "VS"]}, {"name": "Homemade spinach pancakes with lingonberry jam", "tags": ["L"]}, {"name": "Chipotle chili roasted seasonal vegetables with nachos", "tags": ["VE", "G", "VS"]}, {"name": "Factory's delicious ice cream bar", "tags": ["L", "G"]}]`;

const ravintolaValimoRawMenu = `Koskenlaskijan-savuporokeitto (L,G)
Pintasavustettua lohta voi-valkoviinikastikkeessa (L,G) perunamuusi (L,G)
Broilerin rintafileet tulisella basilika-kookoskastikkeella (M,G) yrttiriisi (M,G)
Chilillä ja goudajuustolla ryyditetyt uunimakkarat (L,G)
Kukka-parsakaali gratiini cheddarjuustolla (L,G)
Wokattuja tuoreita kasviksia tofulla (M,G,VE)
Domino-marjarahka (L,G)`;

export const initialRestaurants: Restaurant[] = [
    { id: 'tellus', name: 'Tellus', url: 'https://www.compass-group.fi/menuapi/feed/rss/current-week?costNumber=3105&language=en/', rawMenu: tellusRawMenu, votes: 0 },
    { id: 'por', name: 'Por', url: 'https://por.fi/menu/', rawMenu: porRawMenu, votes: 0 },
    { id: 'valimo-park', name: 'Valimo Park', url: 'https://ravintolapalvelut.iss.fi/valimo-park', rawMenu: valimoParkRawMenu, votes: .5 },
    { id: 'valaja', name: 'Valaja', url: 'https://www.sodexo.fi/en/restaurants/restaurant-valaja', rawMenu: valajaRawMenu, votes: 0 },
    { id: 'factory', name: 'Factory', url: 'https://ravintolafactory.com/lounasravintolat/ravintolat/helsinki-pitajanmaki/', rawMenu: factoryRawMenu, votes: 0 },
    { id: 'ravintola-valimo', name: 'Ravintola Valimo', url: 'https://www.ravintolavalimo.fi/', rawMenu: ravintolaValimoRawMenu, votes: 0 },
];
