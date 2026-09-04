import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const hasDirectUrl = Boolean(process.env.DIRECT_URL);
  const hasAuthSecret = Boolean(process.env.AUTH_SECRET);

  let dbStatus = "unknown";
  let dbError: string | null = null;

  if (hasDatabaseUrl) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = "connected";
    } catch (err: any) {
      dbStatus = "error";
      dbError = err?.message ? String(err.message).split('\n')[0] : "Database query failed";
    }
  } else {
    dbStatus = "missing_database_url";
  }

  const isHealthy = hasDatabaseUrl && dbStatus === "connected";

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      database: dbStatus,
      configuration: {
        databaseUrlConfigured: hasDatabaseUrl,
        directUrlConfigured: hasDirectUrl,
        authSecretConfigured: hasAuthSecret,
      },
      error: dbError,
      timestamp: new Date().toISOString(),
    },
    { status: isHealthy ? 200 : 503 }
  );
}
