import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get('language') || 'en';

  try {
    const response = await fetch(`https://www.compass-group.fi/menuapi/feed/rss/current-week?costNumber=3105&language=${language}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch menu, status: ${response.status}` }, { status: response.status });
    }

    const text = await response.text();
    return new NextResponse(text, { headers: { 'Content-Type': 'application/xml' } });
  } catch (error) {
    console.error("Error fetching Tellus menu:", error);
    return NextResponse.json({ error: 'Error fetching Tellus menu.' }, { status: 500 });
  }
}
