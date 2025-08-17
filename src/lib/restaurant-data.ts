import type { Restaurant } from '@/lib/types';

// Raw menu text extracted from user prompt. Focused on Tuesday where available.
const tellusRawMenu = ``; // This will be fetched from the live API.

const porRawMenu = `[{"name": "Sweet potato soup", "tags": ["VE", "G"]}, {"name": "Chicken and vegetable stir-fry with rice noodles", "tags": ["M", "G"]}, {"name": "Mushroom and spinach lasagna", "tags": ["L"]}, {"name": "Side salad with vinaigrette", "tags": ["VE", "G"]}, {"name": "Blueberry pie with vanilla sauce", "tags": ["L", "G"]}]`;

const valimoParkRawMenu = `FROM THE GRILL 13,70 €: Smoked salmon, herb potatoes, egg sauce (L,G) OR Beetroot patties or fried tofu, herb potatoes and sour cream sauce (L,G, available VEG) OR Hunter's sandwich; minced beef steak, mushroom sauce, gratinated cheese, french fries (L) side salad
Week's salad option: Chicken and blue cheese salad (L,G) 12,50 € OR Baked potato with shrimp filling and fresh salad (L,G) 12,50 €
Dessert: DIY Soft ice cream (L, available G)`;

const valajaRawMenu = `[{"name": "Pea and broad bean rissoles", "tags": ["M", "G", "VE"]}, {"name": "Ratatouille vegetables", "tags": ["M", "G", "VE"]}, {"name": "Aioli with basil", "tags": ["M", "G", "VE"]}, {"name": "Italian style meatball and pasta soup", "tags": ["M", "SE", "KA", "Pork"]}, {"name": "Kebab sauce", "tags": ["M", "G", "VS", "SO", "Spicy", "Beef"]}, {"name": "Garlic seasoned yoghurt", "tags": ["L", "G"]}, {"name": "Rice", "tags": ["M", "G"]}, {"name": "Banana and peppermint milkshake", "tags": ["L", "G"]}, {"name": "Sweet chili and smoked salmon salad", "tags": ["M", "G", "VS"]}]`;

const factoryRawMenu = `[{"name": "Japanese misosoup", "tags": ["M", "G", "VS", "VE", "Tofu"]}, {"name": "Factory's meatballs in smoked cheese sauce", "tags": ["L", "G"]}, {"name": "Tandoori-yogurt marinated chicken steaks", "tags": ["L", "G", "VS"]}, {"name": "Homemade spinach pancakes with lingonberry jam", "tags": ["L"]}, {"name": "Chipotle chili roasted seasonal vegetables with nachos", "tags": ["VE", "G", "VS"]}, {"name": "Factory's delicious ice cream bar", "tags": ["L", "G"]}]`;

const ravintolaValimoRawMenu = `Smoked reindeer soup with Koskenlaskija cheese (L,G)
Lightly smoked salmon with butter-white wine sauce (L,G), mashed potatoes (L,G)
Chicken breast fillets with spicy basil-coconut sauce (M,G), herb rice (M,G)
Oven-baked sausages spiced with chili and gouda cheese (L,G)
Cauliflower-broccoli gratin with cheddar cheese (L,G)
Wokked fresh vegetables with tofu (M,G,VE)
Domino quark with berries (L,G)`;

export const initialRestaurants: Restaurant[] = [
    { id: 'tellus', name: 'Tellus', url: 'https://www.compass-group.fi/menuapi/feed/rss/current-week?costNumber=3105&language=en/', rawMenu: tellusRawMenu, votes: 0 },
    { id: 'por', name: 'Por', url: 'https://por.fi/menu/', rawMenu: porRawMenu, votes: 0 },
    { id: 'valimo-park', name: 'Valimo Park', url: 'https://ravintolapalvelut.iss.fi/valimo-park', rawMenu: valimoParkRawMenu, votes: .5 },
    { id: 'valaja', name: 'Valaja', url: 'https://www.sodexo.fi/en/restaurants/restaurant-valaja', rawMenu: valajaRawMenu, votes: 0 },
    { id: 'factory', name: 'Factory', url: 'https://ravintolafactory.com/lounasravintolat/ravintolat/helsinki-pitajanmaki/', rawMenu: factoryRawMenu, votes: 0 },
    { id: 'ravintola-valimo', name: 'Ravintola Valimo', url: 'https://www.ravintolavalimo.fi/', rawMenu: ravintolaValimoRawMenu, votes: 0 },
];
