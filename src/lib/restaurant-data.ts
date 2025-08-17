import type { Restaurant } from '@/lib/types';

// Raw menu text extracted from user prompt. Focused on Tuesday where available.
const tellusRawMenu = ``; // This will be fetched from the live API.

// English versions
const porRawMenuEn = `[{"name": "Sweet potato soup"}, {"name": "Chicken and vegetable stir-fry with rice noodles"}, {"name": "Mushroom and spinach lasagna"}, {"name": "Side salad with vinaigrette"}, {"name": "Blueberry pie with vanilla sauce"}]`;
const valimoParkRawMenuEn = `FROM THE GRILL: Smoked salmon, herb potatoes, egg sauce OR Beetroot patties or fried tofu, herb potatoes and sour cream sauce OR Hunter's sandwich; minced beef steak, mushroom sauce, gratinated cheese, french fries. Week's salad option: Chicken and blue cheese salad OR Baked potato with shrimp filling and fresh salad. Dessert: DIY Soft ice cream.`;
const valajaRawMenuEn = `[{"name": "Pea and broad bean rissoles"}, {"name": "Ratatouille vegetables"}, {"name": "Aioli with basil"}, {"name": "Italian style meatball and pasta soup"}, {"name": "Kebab sauce"}, {"name": "Garlic seasoned yoghurt"}, {"name": "Rice"}, {"name": "Banana and peppermint milkshake"}, {"name": "Sweet chili and smoked salmon salad"}]`;
const factoryRawMenuEn = `[{"name": "Japanese misosoup"}, {"name": "Factory's meatballs in smoked cheese sauce"}, {"name": "Tandoori-yogurt marinated chicken steaks"}, {"name": "Homemade spinach pancakes with lingonberry jam"}, {"name": "Chipotle chili roasted seasonal vegetables with nachos"}, {"name": "Factory's delicious ice cream bar"}]`;
const ravintolaValimoRawMenuEn = `Smoked reindeer soup with Koskenlaskija cheese. Lightly smoked salmon with butter-white wine sauce, mashed potatoes. Chicken breast fillets with spicy basil-coconut sauce, herb rice. Oven-baked sausages spiced with chili and gouda cheese. Cauliflower-broccoli gratin with cheddar cheese. Wokked fresh vegetables with tofu. Domino quark with berries.`;

// Finnish versions
const porRawMenuFi = `[{"name": "Bataattikeitto", "tags": ["VE", "G"]}, {"name": "Kana-kasvis-wokki riisinuudeleilla", "tags": ["M", "G"]}, {"name": "Sieni-pinaatti-lasagne", "tags": ["L"]}, {"name": "Lisäkesalaatti vinegretillä", "tags": ["VE", "G"]}, {"name": "Mustikkapiirakka vaniljakastikkeella", "tags": ["L", "G"]}]`;
const valimoParkRawMenuFi = `GRILLISTÄ 13,70 €: Savulohta, yrttiperunoita, kananmunakastike (L,G) TAI Punajuuripihvit tai paistettua tofua, yrttiperunoita ja kermaviilikastiketta (L,G, saatavilla VEG) TAI Metsästäjänleipä; jauhelihapihvi, sienikastike, juustokuorrutus, ranskalaiset perunat (L) vihersalaatti
Viikon salaattivaihtoehto: Kana-sinihomejuustosalaatti (L,G) 12,50 € TAI Uuniperuna katkaraputäytteellä ja raikkaalla salaatilla (L,G) 12,50 €
Jälkiruoka: DIY Pehmis (L, saatavilla G)`;
const valajaRawMenuFi = `[{"name": "Herne-härkäpapupihvit"}, {"name": "Ratatouille kasvikset"}, {"name": "Basilika-aioli"}, {"name": "Italialainen lihapyörykkä-keitto"}, {"name": "Kebab-kastike"}, {"name": "Valkosipulijogurtti"}, {"name": "Riis"}, {"name": "Banaani-piparminttu pirtelö"}, {"name": "Makea chili-kylmäsavulohisalaatti"}]`;
const factoryRawMenuFi = `Japanilainen misokeitto (M+G+VS) tofu (VE+G) purjosuikaleet, wakame, kevätsipuli, keitetty kananmuna
Factoryn lihapullat savujuustokastikkeessa (L+G) perunamuusi (L+G)
Tandoori -jogurttimarinoidut kanan paistileikkeet (L+G+VS) basmatiriisi (VE+G)
Itse tehdyt pinaattiohukaiset (L) puolukkahillo (VE+G)
Chipotle chili -paahdettuja kauden tuoreita kasviksia nacholastuilla (VE+G+VS)
Factoryn herkullinen jäätelöbaari (L+G)`;
const ravintolaValimoRawMenuFi = `Savuporokeitto Koskenlaskijalla (L,G)
Kevyesti savustettua lohta voi-valkoviinikastikkeella (L,G), perunasosetta (L,G)
Kananrintafileitä mausteisella basilika-kookoskastikkeella (M,G), yrttiriisiä (M,G)
Chilillä ja goudalla maustettuja uunimakkaroita (L,G)
Kukkakaali-parsakaaligratiinia cheddarjuustolla (L,G)
Wokattuja tuoreita kasviksia tofulla (M,G,VE)
Domino-rahkaa marjoilla (L,G)`;


export const initialRestaurants: Restaurant[] = [
    { id: 'tellus', name: 'Tellus', url: 'https://www.compass-group.fi/menuapi/feed/rss/current-week?costNumber=3105&language=en/', rawMenu: tellusRawMenu, rawMenuFi: tellusRawMenu, votes: 0 },
    { id: 'por', name: 'Por', url: 'https://por.fi/menu/', rawMenu: porRawMenuEn, rawMenuFi: porRawMenuFi, votes: 0 },
    { id: 'valimo-park', name: 'Valimo Park', url: 'https://ravintolapalvelut.iss.fi/valimo-park', rawMenu: valimoParkRawMenuEn, rawMenuFi: valimoParkRawMenuFi, votes: .5 },
    { id: 'valaja', name: 'Valaja', url: 'https://www.sodexo.fi/en/restaurants/restaurant-valaja', rawMenu: valajaRawMenuEn, rawMenuFi: valajaRawMenuFi, votes: 0 },
    { id: 'factory', name: 'Factory', url: 'https://ravintolafactory.com/lounasravintolat/ravintolat/helsinki-pitajanmaki/', rawMenu: factoryRawMenuEn, rawMenuFi: factoryRawMenuFi, votes: 0 },
    { id: 'ravintola-valimo', name: 'Ravintola Valimo', url: 'https://www.ravintolavalimo.fi/', rawMenu: ravintolaValimoRawMenuEn, rawMenuFi: ravintolaValimoRawMenuFi, votes: 0 },
];
