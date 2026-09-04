import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 400 });
    }
    
    const { username, password } = result.data;
    
    // Find user and their role
    const user = await prisma.user.findUnique({
      where: { username },
      include: { role: true }
    });
    
    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }
    
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }
    
    // Convert permissions to string array safely
    let parsedPermissions: string[] = [];
    if (user.role.permissions) {
      if (typeof user.role.permissions === 'string') {
        try { parsedPermissions = JSON.parse(user.role.permissions); } catch {}
      } else if (Array.isArray(user.role.permissions)) {
        parsedPermissions = user.role.permissions as string[];
      }
    }
    
    // Update lastLogin and AuditLog
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      }),
      prisma.auditLog.create({
        data: {
          action: 'LOGIN_SUCCESS',
          entity: 'User',
          entityId: user.id.toString(),
          userId: user.id,
          ipAddress: req.headers.get('x-forwarded-for') || req.ip || 'unknown',
        }
      })
    ]);
    
    // Create session
    await createSession({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role.name,
      permissions: parsedPermissions,
    });
    
    return NextResponse.json({ success: true }, { status: 200 });
    
  } catch (error: any) {
    console.error("Login error:", error);
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ 
        error: "Server configuration error: DATABASE_URL is not set in environment variables." 
      }, { status: 500 });
    }
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
