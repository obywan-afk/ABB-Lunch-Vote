import type { Restaurant } from '@/lib/types';

// Raw menu text extracted from user prompt. Focused on Tuesday where available.
const tellusRawMenu = `TUE
Carrot-coconut soup (L,G,VE)
Chili con carne (M,G) and rice
Vegetable-cashew wok (M,G,VE)
Dessert: Chocolate mousse (L,G)`;

const porRawMenu = `Kebab sauce (m,g,vs,so, spicy, contains beef), garlic seasoned yoghurt (l,g), rice (m,g) 7.65
Italian style meatball and pasta soup (m,se,ka, contains pork) 6.55
Pea and broad bean rissoles (m,g), ratatouille vegetables (m,g,vs), aioli with basil (m,g,vs,si) Vegan 7.65
Banana and peppermint milkshake (l,g) 1.10
Take away-salad: Sweet chili and smoked salmon salad (m,g,vs) 7.65`;

const valimoParkRawMenu = `GRILLISTÄ LAUTASANNOKSINA 13,70 €: Savulohta, yrttiperunaa, kananmunakastiketta (L,G) TAI Punajuuripihvit tai fritattua tofua, yrttiperunaa ja kermaviilikastiketta (L,G, saatavilla VEG) TAI Metsästäjänleipä; naudan jauhelihapihvi, sienikastiketta, gratinoitua juustoa, ranskalaiset (L) sivusalaattia
Viikon salaattivaihtoehto:Kana-aurajuustosalaatti (L,G) 12,50 € TAI Uuniperuna katkaraputäytteellä ja raikasta salaattia (L,G) 12,50 €
Dessert: DIY Pehmis (L, saatavilla G)`;

const valajaRawMenu = `Homefood Dijon & yrttikuorrutettua porsaanfilettä perunamuusilla, sitruunalla sekä kermaviilikastikeella ja kasvispaistosta
Homefood Ruismuikkuja perunamuusilla, sitruunalla sekä kermaviilikastikeella ja kasvispaistosta
Daily Soup Päivän keitto: Purjo-perunasosekeitto ja murustettua fetaa
Deli Salad Vaihtuvat monipuoliset kasvikset ja joka päivä vähintään 2 tai 3 erillaista proteiinia
Bowl Mood Bowl: Sweet & Sour kananpojalla sekä jasminriisiä
Bowl Mood Bowl: Sweet & sour tofulla, kasviksia ja jasminriisiä`;

const factoryRawMenu = `Japanilainen misokeitto (M+G+VS) tofu (VE+G) purjosuikaleet, wakame, kevätsipuli, keitetty kananmuna
Factoryn lihapullat savujuustokastikkeessa (L+G) perunamuusi (L+G)
Tandoori -jogurttimarinoidut kanan paistileikkeet (L+G+VS) basmatiriisi (VE+G)
Itse tehdyt pinaattiohukaiset (L) puolukkahillo (VE+G)
Chipotle chili -paahdettuja kauden tuoreita kasviksia nacholastuilla (VE+G+VS)
Factoryn herkullinen jäätelöbaari (L+G)`;

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
    { id: 'valimo-park', name: 'Valimo Park', url: 'https://ravintolapalvelut.iss.fi/valimo-park', rawMenu: valimoParkRawMenu, votes: 0 },
    { id: 'valaja', name: 'Valaja', url: 'https://www.sodexo.fi/en/restaurants/restaurant-valaja', rawMenu: valajaRawMenu, votes: 0 },
    { id: 'factory', name: 'Factory', url: 'https://ravintolafactory.com/lounasravintolat/ravintolat/helsinki-pitajanmaki/', rawMenu: factoryRawMenu, votes: 0 },
    { id: 'ravintola-valimo', name: 'Ravintola Valimo', url: 'https://www.ravintolavalimo.fi/', rawMenu: ravintolaValimoRawMenu, votes: 0 },
];
