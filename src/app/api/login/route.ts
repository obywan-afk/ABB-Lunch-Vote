import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    // Main Team (ABB Helsinki)
    if (password === process.env.LUNCH_VOTE_PASSWORD) {
      return NextResponse.json({ success: true, team: 'Main', isDemo: false });
    } 
    
    // Other Teams (e.g., Design)
    else if (password === process.env.LUNCH_VOTE_PASSWORD_OTHER || password === 'designteam') {
      return NextResponse.json({ success: true, team: 'Design', isDemo: false });
    }

    // Demo Mode
    else if (password === process.env.LUNCH_VOTE_PASSWORD_DEMO || password === 'demolunch123') {
      return NextResponse.json({ success: true, team: 'Demo', isDemo: true });
    }
    
    else {
      return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'An error occurred during login.' }, { status: 500 });
  }
}
