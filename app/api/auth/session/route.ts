import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(null, { status: 200 });
    }
    
    return NextResponse.json(session, { status: 200 });
  } catch (error) {
    console.error("Session fetch error:", error);
    return NextResponse.json(null, { status: 500 });
  }
}
