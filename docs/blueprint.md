# **App Name**: ABB Lunch Vote

## Core Features:

- Menu Scraping: Scrape menus from specified restaurant URLs (Tellus, Por, Valimo Park, Valaja, Factory, Valimo) every Monday.
- Menu Parsing: Use a tool incorporating LLM to parse the scraped menu content, especially to extract relevant data and present a clean menu, since the format from each restaurant varies.
- Menu Display: Display the scraped and parsed menus for each restaurant in a clear and consistent format.
- Restaurant Voting: Allow users (ABB team members) to vote for their preferred restaurant from Monday to Tuesday before midday.
- Data Storage: Store the votes and restaurant menu data.
- Vote Tallying: On Tuesdays, if a restaurant receives 5 or more votes, automatically highlight it as the preferred choice.

## Style Guidelines:

- Primary color: Use ABB's signature blue (#005EB8) to align with the corporate identity. This evokes trust and professionalism.
- Background color: Light gray (#F0F0F0) to provide a clean and modern backdrop that makes the menu items stand out.
- Accent color: A vibrant orange (#FF6600) to highlight the winning restaurant and call-to-action buttons, adding a touch of energy and enthusiasm.
- Body and headline font: 'Inter' (sans-serif) for clear and accessible readability, aligning with ABB's need for clear internal communications. Note: currently only Google Fonts are supported.
- Use simple, clear icons to represent restaurants and voting actions. Consistent with ABB's design language, these should be minimalist and easily understandable.
- Design a clean and intuitive layout with each restaurant's menu clearly delineated. Prioritize readability and ease of navigation, especially on mobile devices.
- Use subtle animations (e.g., a smooth highlight) to indicate the winning restaurant, providing visual feedback without being distracting.