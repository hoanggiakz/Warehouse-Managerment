import { NextRequest, NextResponse } from 'next/server';
import { clearSession, getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    
    if (session) {
      await prisma.auditLog.create({
        data: {
          action: 'LOGOUT',
          entity: 'User',
          entityId: session.id.toString(),
          userId: session.id,
          ipAddress: req.headers.get('x-forwarded-for') || req.ip || 'unknown',
        }
      });
    }

    await clearSession();
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}
